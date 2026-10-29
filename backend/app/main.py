"""FastAPI app principal."""

from __future__ import annotations

import logging
import time
import uuid
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from pathlib import Path

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core.logging import campos_extra, configurar_logging, request_id_ctx
from app.database import healthcheck
from app.routers import dashboard, inventario, prediccion, productos, ventas
from app.schemas import HealthOut

logger = logging.getLogger("sigprov")

START_TIME = time.time()


def _ruta_logs() -> Path:
    """Carpeta de logs de la aplicacion."""
    return Path("logs")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Startup/shutdown events."""
    configurar_logging(
        nivel="DEBUG" if settings.debug else "INFO",
        archivo=_ruta_logs() / "sigprov.jsonl",
    )
    logger.info(
        "backend iniciado",
        extra={
            "version": settings.api_version,
            "environment": settings.environment,
            "db_driver": settings.db_driver,
        },
    )
    yield
    logger.info("backend detenido")


app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
    description="Sistema de Inventario + Predicción de Ventas para locales.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Contexto de peticion (request_id + duracion) y logging estructurado
@app.middleware("http")
async def contexto_request(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
    """Asigna un request_id, mide la duracion y lo deja en la respuesta."""
    rid = request.headers.get("X-Request-ID") or uuid.uuid4().hex[:12]
    token = request_id_ctx.set(rid)
    token_extra = campos_extra.set({})

    inicio = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        duracion_ms = round((time.perf_counter() - inicio) * 1000, 2)
        logging.getLogger("sigprov.request").exception(
            "request fallido",
            extra={
                "duracion_ms": duracion_ms,
                "metodo": request.method,
                "ruta": request.url.path,
            },
        )
        raise
    else:
        duracion_ms = round((time.perf_counter() - inicio) * 1000, 2)
        logging.getLogger("sigprov.request").info(
            "request completado",
            extra={
                "duracion_ms": duracion_ms,
                "metodo": request.method,
                "ruta": request.url.path,
                "status": response.status_code,
            },
        )
        response.headers["X-Request-ID"] = rid
        return response
    finally:
        request_id_ctx.reset(token)
        campos_extra.reset(token_extra)


# ---------- Routers ----------
app.include_router(productos.router, prefix="/api/productos", tags=["productos"])
app.include_router(inventario.router, prefix="/api/inventario", tags=["inventario"])
app.include_router(ventas.router, prefix="/api/ventas", tags=["ventas"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(prediccion.router, prefix="/api/prediccion", tags=["prediccion"])


# ---------- Health / metrics ----------
@app.get("/health", response_model=HealthOut, tags=["util"])
def health() -> HealthOut:
    return HealthOut(
        status="ok",
        version=settings.api_version,
        db_ok=healthcheck(),
        uptime_seconds=time.time() - START_TIME,
    )


@app.get("/metrics", tags=["util"])
def metrics() -> dict:
    return {
        "version": settings.api_version,
        "environment": settings.environment,
        "db_driver": settings.db_driver,
        "uptime_seconds": time.time() - START_TIME,
        "started_at": datetime.now(UTC).isoformat(),
    }


@app.get("/ready", tags=["util"])
def ready() -> dict:
    """Readiness probe: el servicio esta listo si la DB responde."""
    db_ok = healthcheck()
    return {
        "status": "ok" if db_ok else "degraded",
        "database": "ok" if db_ok else "down",
        "version": settings.api_version,
    }


@app.get("/", tags=["util"])
def root() -> dict:
    return {
        "name": settings.api_title,
        "version": settings.api_version,
        "docs": "/docs",
    }

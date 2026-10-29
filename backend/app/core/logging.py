"""Logging estructurado de SIGPROV.

Configura logging en formato JSON (una linea por evento) para que los logs
sean parseables por herramientas de observabilidad. Cada request queda
identificado por un `request_id` que viaja en la cabecera `X-Request-ID`.
"""

from __future__ import annotations

import json
import logging
import sys
import time
import uuid
from collections.abc import Awaitable, Callable
from contextvars import ContextVar
from pathlib import Path
from typing import Any

# ------------------------------------------------------------------
# Contexto de la peticion
# ------------------------------------------------------------------
request_id_ctx: ContextVar[str] = ContextVar("request_id", default="-")
usuario_id_ctx: ContextVar[str | None] = ContextVar("usuario_id", default=None)

# Atributos que se agregan a todos los registros de la peticion actual.
campos_extra: ContextVar[dict[str, Any]] = ContextVar("campos_extra", default={})


def obtener_request_id() -> str:
    return request_id_ctx.get()


def agregar_campo(nombre: str, valor: Any) -> None:
    """Agrega un campo a los logs de la peticion en curso."""
    campos = dict(campos_extra.get())
    campos[nombre] = valor
    campos_extra.set(campos)


class JsonFormatter(logging.Formatter):
    """Formatea los registros como JSON (una linea por evento)."""

    _RESERVADOS = {
        "args",
        "asctime",
        "created",
        "exc_info",
        "exc_text",
        "filename",
        "funcName",
        "levelname",
        "levelno",
        "lineno",
        "message",
        "module",
        "msecs",
        "msg",
        "name",
        "pathname",
        "process",
        "processName",
        "relativeCreated",
        "stack_info",
        "thread",
        "threadName",
        "taskName",
    }

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime(record.created))
            + f".{int(record.msecs):03d}",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": request_id_ctx.get(),
        }

        usuario = usuario_id_ctx.get()
        if usuario:
            payload["usuario_id"] = usuario

        for clave, valor in campos_extra.get().items():
            payload[clave] = valor

        for clave, valor in record.__dict__.items():
            if clave not in self._RESERVADOS and not clave.startswith("_"):
                payload[clave] = valor

        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)

        return json.dumps(payload, ensure_ascii=False, default=str)


def configurar_logging(nivel: str = "INFO", archivo: Path | None = None) -> None:
    """Configura el logging global en formato JSON."""
    raiz = logging.getLogger()
    raiz.setLevel(getattr(logging, nivel.upper(), logging.INFO))

    for handler in list(raiz.handlers):
        raiz.removeHandler(handler)

    consola = logging.StreamHandler(sys.stdout)
    consola.setFormatter(JsonFormatter())
    raiz.addHandler(consola)

    if archivo is not None:
        archivo.parent.mkdir(parents=True, exist_ok=True)
        archivo_handler = logging.FileHandler(archivo, encoding="utf-8")
        archivo_handler.setFormatter(JsonFormatter())
        raiz.addHandler(archivo_handler)

    # Silenciar librerias ruidosas
    for nombre in ("uvicorn.access", "sqlalchemy.engine", "urllib3", "matplotlib", "cmdstanpy"):
        logging.getLogger(nombre).setLevel(logging.WARNING)


class RequestContextMiddleware:
    """Asigna un request_id y mide la duracion de cada peticion.

    Se registra como middleware HTTP puro (sin clase) desde app/main.py; esta
    clase queda disponible para cuando se necesite montar el contexto en otra
    parte de la aplicacion.
    """

    def __init__(self, app: Any) -> None:
        self.app = app

    async def __call__(
        self,
        request: Any,
        call_next: Callable[[Any], Awaitable[Any]],
    ) -> Any:
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

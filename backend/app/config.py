"""Configuración central del backend.

Toda la configuración se lee de variables de entorno con prefijo SIGPROV_.
Copia .env.example a .env y ajusta los valores. Los campos marcados como
requeridos (sin valor por defecto) fallan rápido y con un mensaje claro si
falta configurarlos.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

Environment = Literal["local", "test", "staging", "prod"]


class Settings(BaseSettings):
    """Variables de entorno y valores por defecto."""

    # ------------------------------------------------------------------
    # Base de datos
    # ------------------------------------------------------------------
    # Motor soportado: "postgres" (produccion) o "sqlite" (desarrollo/test).
    db_driver: Literal["postgres", "sqlite"] = "sqlite"
    db_host: str = "localhost"
    db_port: int = 5432
    db_user: str = "sigprov"
    db_password: str = Field(
        ...,
        description="Password de PostgreSQL. Requerido cuando db_driver=postgres",
    )
    db_name: str = "sigprov"
    sqlite_path: Path = Path("data/sigprov.db")
    # URL completa: tiene prioridad sobre db_driver y los campos anteriores.
    database_url_override: str | None = None

    # ------------------------------------------------------------------
    # API
    # ------------------------------------------------------------------
    api_title: str = "SIGPROV — Inventario + Predicción de Ventas"
    api_version: str = "2.0.0"
    environment: Environment = "local"
    debug: bool = False
    # Se declara como CSV (no como lista) porque pydantic-settings intenta
    # parsear las listas como JSON. La property cors_origins_list hace la
    # conversion a lista.
    cors_origins: str = "http://localhost:5173,http://localhost:5174,http://localhost:8000,file://"

    # ------------------------------------------------------------------
    # Seguridad (consumido por el módulo de autenticación)
    # ------------------------------------------------------------------
    secret_key: str = Field(
        ...,
        min_length=32,
        description="Clave de firma JWT (mínimo 32 caracteres). Requerido en .env",
    )
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 60
    refresh_token_days: int = 7
    login_max_intentos: int = 5
    login_bloqueo_minutos: int = 15

    # ------------------------------------------------------------------
    # Machine Learning
    # ------------------------------------------------------------------
    ml_model_dir: Path = Path(__file__).resolve().parent.parent / "models"
    ml_min_dias_entrenamiento: int = 60
    ml_prediccion_dias_default: int = 7

    # ------------------------------------------------------------------
    # Esquema / rutas
    # ------------------------------------------------------------------
    sql_dir: Path = Path(__file__).resolve().parent.parent / "sql"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="SIGPROV_",
        extra="ignore",
        case_sensitive=False,
    )

    @property
    def cors_origins_list(self) -> list[str]:
        """Origenes CORS como lista."""
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def database_url(self) -> str:
        """URL de conexion a la base de datos.

        Prioridad:
          1. database_url_override (URL completa)
          2. PostgreSQL (db_driver=postgres)
          3. SQLite local (db_driver=sqlite)
        """
        if self.database_url_override:
            return self.database_url_override

        if self.db_driver == "sqlite":
            return f"sqlite:///{self.sqlite_path}"

        return (
            f"postgresql+psycopg2://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )

    @property
    def es_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")

    @property
    def es_produccion(self) -> bool:
        return self.environment == "prod"

    def resumen_config(self) -> dict[str, object]:
        """Configuracion segura para logging: nunca incluye secretos."""
        return {
            "environment": self.environment,
            "api_version": self.api_version,
            "db_driver": self.db_driver,
            "db_host": self.db_host,
            "db_name": self.db_name,
            "cors_origins": self.cors_origins_list,
        }


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Devuelve la configuración cacheada.

    Los campos marcados como requeridos (db_password, secret_key) llegan desde
    el archivo .env o desde variables de entorno; por eso el constructor no
    los recibe como argumentos.
    """
    return Settings()  # type: ignore[call-arg]


settings = get_settings()

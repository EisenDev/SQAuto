import os
from urllib.parse import urlparse
from typing import Any


LOCALHOST_HOSTS = {"localhost", "127.0.0.1", "::1"}


def _read_value(source: dict[str, Any] | Any, key: str, default: Any = None) -> Any:
    if isinstance(source, dict):
        return source.get(key, default)
    return getattr(source, key, default)


def backend_runs_in_container() -> bool:
    return os.path.exists("/.dockerenv") or os.getenv("RUNNING_IN_DOCKER") == "1"


def sanitize_target_connection_settings(source: dict[str, Any] | Any) -> dict[str, Any]:
    settings = {
        "connection_name": str(_read_value(source, "name", "") or "").strip(),
        "host": str(_read_value(source, "host", "") or "").strip(),
        "port": int(_read_value(source, "port", 5432) or 5432),
        "database_name": str(_read_value(source, "database_name", "") or "").strip(),
        "username": str(_read_value(source, "username", "") or "").strip(),
        "password": str(_read_value(source, "password", "") or ""),
        "db_type": str(_read_value(source, "db_type", "postgresql") or "postgresql").strip().lower(),
        "ssl_mode": str(_read_value(source, "ssl_mode", "prefer") or "prefer").strip().lower(),
    }
    missing = [field for field in ("host", "database_name", "username", "password") if not settings[field]]
    if missing:
        raise ValueError(
            {
                "error_type": "invalid_target_configuration",
                "message": "Target connection is missing required fields.",
                "fields": missing,
            }
        )
    return settings


def build_target_connection_url(settings: dict[str, Any]) -> str:
    return (
        f"postgresql+psycopg://{settings['username']}:{settings['password']}"
        f"@{settings['host']}:{settings['port']}/{settings['database_name']}"
        f"?sslmode={settings['ssl_mode']}"
    )


def build_localhost_hint(host: str) -> str | None:
    normalized = (host or "").strip().lower()
    if normalized not in LOCALHOST_HOSTS:
        return None
    if not backend_runs_in_container():
        return None
    docker_host = os.getenv("HOST_DOCKER_INTERNAL", "host.docker.internal")
    return (
        "localhost points to the SQAuto backend container, not your laptop database. "
        f"Use {docker_host} for Docker-to-host access, a docker-compose service name, "
        "or a public/private reachable database host."
    )


def is_metadata_database_target(settings: dict[str, Any]) -> bool:
    metadata_url = os.getenv("METADATA_DATABASE_URL") or os.getenv("DATABASE_URL")
    if not metadata_url:
        return False
    parsed = urlparse(metadata_url.replace("+psycopg", ""))
    metadata_host = (parsed.hostname or "").strip().lower()
    metadata_port = parsed.port or 5432
    metadata_db = (parsed.path or "").lstrip("/").strip().lower()
    metadata_user = (parsed.username or "").strip().lower()
    return (
        settings.get("host", "").strip().lower() == metadata_host
        and int(settings.get("port", 5432) or 5432) == metadata_port
        and settings.get("database_name", "").strip().lower() == metadata_db
        and settings.get("username", "").strip().lower() == metadata_user
    )

# configs/settings.py
"""Application settings using Pydantic BaseSettings.
Environment variables can be loaded from a .env file.
Only safe defaults are provided; actual secrets should be set in the deployment environment.
"""

from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    # Database Configuration (Decoupled)
    METADATA_DATABASE_URL: str = Field("postgresql+psycopg://postgres:postgres@localhost:5432/sqauto", alias="METADATA_DATABASE_URL")
    STAGING_DATABASE_URL: str = Field("postgresql+psycopg://postgres:postgres@localhost:5432/staging_db", alias="STAGING_DATABASE_URL")
    DATABASE_URL: str = Field("", alias="DATABASE_URL") # Legacy/Fallback

    REDIS_URL: str = Field("redis://localhost:6379/0", alias="REDIS_URL")

    # Application ports (used by Docker compose)
    API_PORT: int = Field(8000, alias="API_PORT")
    WEB_PORT: int = Field(3000, alias="WEB_PORT")

    # Security / auth placeholders (future)
    SECRET_KEY: str = Field("change-me", alias="SECRET_KEY")

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",  # Allow extra fields in .env without crashing
    }

# Export a singleton for easy import
settings = Settings()

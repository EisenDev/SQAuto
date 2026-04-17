# configs/model_config.py
"""Placeholder for AI model configuration.
Defines default model identifiers and any provider‑specific settings.
Will be expanded when the AI assistant layer is implemented.
"""

from pydantic import BaseSettings, Field

class ModelConfig(BaseSettings):
    # Primary model used for development (as per TECH_STACK.md)
    PRIMARY_MODEL: str = Field("gemini-2.5-flash", env="PRIMARY_MODEL")
    # Optional fallback model
    FALLBACK_MODEL: str | None = Field(None, env="FALLBACK_MODEL")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

model_config = ModelConfig()

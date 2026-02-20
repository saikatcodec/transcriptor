from functools import lru_cache
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_env: str = "development"
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    debug: bool = True

    database_url: str = ''

    @field_validator("database_url", mode="before")
    @classmethod
    def normalise_db_url(cls, v: str) -> str:
        """
        Accept any standard postgres:// or postgresql:// URL (as copied from
        Neon dashboard) and rewrite it to use the psycopg3 async driver scheme.
        """
        v = v.strip()
        if v.startswith("postgres://") and "+psycopg" not in v:
            v = v.replace("postgres://", "postgresql+psycopg://", 1)
        elif v.startswith("postgresql://") and "+psycopg" not in v:
            v = v.replace("postgresql://", "postgresql+psycopg://", 1)
        return v

    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    whisper_model_size: str = "tiny"
    whisper_device: str = "cpu"
    whisper_compute_type: str = "int8"
    whisper_model_dir: str = "./models"

    audio_sample_rate: int = 16000
    partial_transcription_interval_sec: float = 2.0


@lru_cache
def get_settings() -> Settings:
    return Settings()

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """
    Central configuration. All values are overridable via environment
    variables (Render injects DATABASE_URL, JWT_SECRET, etc. as env vars).
    """
    PROJECT_NAME: str = "VaxiPredict"
    API_V1_PREFIX: str = "/api/v1"

    # Render provides DATABASE_URL for managed Postgres instances.
    DATABASE_URL: str = "postgresql://vaxipredict:vaxipredict@localhost:5432/vaxipredict"

    JWT_SECRET: str = "change-this-secret-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24h

    # Comma separated list of allowed origins for the deployed frontend.
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:4173"

    UPLOAD_DIR: str = "uploads"
    MODEL_CHECKPOINT_PATH: str = ""

    # WhatsApp Business API Settings
    WHATSAPP_PHONE_NUMBER_ID: str = ""
    WHATSAPP_BEARER_TOKEN: str = ""

    # Google Gemini API Settings
    GEMINI_API_KEY: str = ""

    # Google OAuth2 Client ID
    GOOGLE_CLIENT_ID: str = ""

    class Config:
        env_file = ".env"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

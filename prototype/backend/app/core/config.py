import os
import json
from typing import List, Union, Any, Optional
from urllib.parse import urlparse
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / ".env")

DEFAULT_CORS_ORIGINS: List[str] = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

DEFAULT_CORS_METHODS: List[str] = ["GET", "POST", "OPTIONS"]
DEFAULT_CORS_HEADERS: List[str] = ["*"]


def parse_cors_methods(v: Any) -> List[str]:
    """
    Parses and standardizes CORS allowed methods.
    Defaults to ['GET', 'POST', 'OPTIONS'].
    """
    if v is None:
        return list(DEFAULT_CORS_METHODS)
    if isinstance(v, str):
        v = v.strip()
        if not v:
            return list(DEFAULT_CORS_METHODS)
        items = [m.strip().upper() for m in v.split(",") if m.strip()]
        return items if items else list(DEFAULT_CORS_METHODS)
    if isinstance(v, (list, tuple, set)):
        return [str(m).strip().upper() for m in v if str(m).strip()]
    return list(DEFAULT_CORS_METHODS)


def validate_origin(origin: str) -> str:
    """
    Validates and normalizes a CORS origin.
    - Strips whitespace and trailing slashes.
    - Allows '*' only if explicitly specified.
    - Ensures scheme is http or https and host is present.
    """
    origin = origin.strip().rstrip("/")
    if not origin:
        return ""
    if origin == "*":
        return "*"
    
    parsed = urlparse(origin)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise ValueError(
            f"Invalid CORS origin: '{origin}'. Origins must be '*' or start with 'http://' or 'https://' with a valid host."
        )
    return f"{parsed.scheme}://{parsed.netloc}"

def parse_cors_origins(v: Any) -> List[str]:
    """
    Parses a raw CORS_ORIGINS value into a list of validated origin strings.
    Supports:
    - Comma-separated string: "http://localhost:3000,http://127.0.0.1:3000"
    - Single origin string: "http://localhost:3000"
    - JSON-encoded list string: '["http://localhost:3000"]'
    - List of strings: ["http://localhost:3000"]
    - None / Unset: falls back to DEFAULT_CORS_ORIGINS
    Strips whitespace, ignores empty items, and validates schemes.
    """
    if v is None:
        return list(DEFAULT_CORS_ORIGINS)

    raw_items: List[str] = []
    if isinstance(v, str):
        v = v.strip()
        if not v:
            return []
        
        # Backward compatibility for JSON-formatted strings
        if v.startswith("[") and v.endswith("]"):
            try:
                parsed_json = json.loads(v)
                if isinstance(parsed_json, list):
                    raw_items = [str(x) for x in parsed_json]
                else:
                    raw_items = [v]
            except Exception:
                raw_items = v.strip("[]").split(",")
        else:
            raw_items = v.split(",")
    elif isinstance(v, (list, tuple, set)):
        raw_items = [str(x) for x in v]
    else:
        raise ValueError(f"Invalid CORS_ORIGINS type: {type(v)}. Expected str or list.")

    validated: List[str] = []
    for item in raw_items:
        cleaned = item.strip()
        if not cleaned:
            continue
        val = validate_origin(cleaned)
        if val and val not in validated:
            validated.append(val)

    return validated

try:
    from pydantic import field_validator, model_validator, Field
    from pydantic_settings import BaseSettings, SettingsConfigDict

    class SettingsBase(BaseSettings):
        model_config = SettingsConfigDict(
            env_file=str(BASE_DIR / ".env"),
            env_file_encoding="utf-8",
            extra="ignore"
        )
except ImportError:
    from pydantic import BaseModel, Field
    class SettingsBase(BaseModel):
        pass
    def field_validator(*args, **kwargs):
        def decorator(fn):
            return fn
        return decorator

class Settings(SettingsBase):
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "SkyRate Airfare Intelligence API")
    VERSION: str = "1.0.0"
    
    # Environment and Prefix support (supporting both API_ENV / ENVIRONMENT and API_PREFIX / API_V1_STR)
    API_ENV: str = Field(default_factory=lambda: os.getenv("API_ENV", os.getenv("ENVIRONMENT", "development")))
    ENVIRONMENT: str = Field(default_factory=lambda: os.getenv("API_ENV", os.getenv("ENVIRONMENT", "development")))
    
    API_PREFIX: str = Field(default_factory=lambda: os.getenv("API_PREFIX", os.getenv("API_V1_STR", "/api/v1")))
    API_V1_STR: str = Field(default_factory=lambda: os.getenv("API_PREFIX", os.getenv("API_V1_STR", "/api/v1")))
    
    DEBUG: bool = Field(
        default_factory=lambda: (
            os.getenv(
                "DEBUG",
                "False" if os.getenv("API_ENV", os.getenv("ENVIRONMENT", "development")).lower() == "production" else "True"
            ).lower() in ("true", "1", "yes")
        )
    )
    ALLOWED_HOSTS: List[str] = Field(
        default_factory=lambda: [h.strip() for h in os.getenv("ALLOWED_HOSTS", "*").split(",") if h.strip()]
    )
    
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", 8000))
    
    # CORS Configuration - hardened: explicit methods, no credentials by default, strict origins
    CORS_ORIGINS: Union[List[str], str] = Field(default_factory=lambda: list(DEFAULT_CORS_ORIGINS))
    CORS_ALLOW_CREDENTIALS: bool = os.getenv("CORS_ALLOW_CREDENTIALS", "False").lower() in ("true", "1", "yes")
    CORS_ALLOW_METHODS: Union[List[str], str] = Field(default_factory=lambda: list(DEFAULT_CORS_METHODS))
    CORS_ALLOW_HEADERS: Union[List[str], str] = Field(default_factory=lambda: list(DEFAULT_CORS_HEADERS))

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Any) -> List[str]:
        return parse_cors_origins(v)

    @field_validator("CORS_ALLOW_METHODS", mode="before")
    @classmethod
    def assemble_cors_methods(cls, v: Any) -> List[str]:
        return parse_cors_methods(v)

    @field_validator("CORS_ALLOW_HEADERS", mode="before")
    @classmethod
    def assemble_cors_headers(cls, v: Any) -> List[str]:
        return parse_cors_methods(v)  # Reuse parse_cors_methods as it does comma-separated string parsing

    @model_validator(mode="after")
    def validate_cors_security(self) -> "Settings":
        """
        Guarantees that wildcard origin ('*') is NEVER combined with allow_credentials=True.
        Raises ValueError if misconfigured to prevent credential leakage vulnerabilities.
        """
        if self.CORS_ALLOW_CREDENTIALS and ("*" in self.CORS_ORIGINS):
            raise ValueError(
                "CORS security violation: allow_credentials=True cannot be used with wildcard origin '*'. "
                "Specify explicit origins or disable credentials."
            )
        return self

    # Supabase Credentials
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SECRET_KEY: str = os.getenv("SUPABASE_SECRET_KEY", "")
    SUPABASE_PUBLISHABLE_KEY: str = os.getenv("SUPABASE_PUBLISHABLE_KEY", "")
    
    # Rate Limiting Configuration
    RATE_LIMIT_ENABLED: bool = os.getenv("RATE_LIMIT_ENABLED", "True").lower() in ("true", "1", "yes")
    RATE_LIMIT_PROD_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_PROD_PER_MINUTE", 60))
    RATE_LIMIT_DEV_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_DEV_PER_MINUTE", 1000))
    RATE_LIMIT_PER_MINUTE: Optional[int] = (
        int(os.getenv("RATE_LIMIT_PER_MINUTE"))
        if os.getenv("RATE_LIMIT_PER_MINUTE")
        else None
    )
    RATE_LIMIT_WINDOW_SECONDS: int = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", 60))
    TRUST_PROXY_HEADERS: bool = os.getenv("TRUST_PROXY_HEADERS", "False").lower() in ("true", "1", "yes")

    # API Abuse Protections
    MAX_REQUEST_BODY_BYTES: int = int(os.getenv("MAX_REQUEST_BODY_BYTES", 1024 * 1024))  # 1 MB default
    ADMIN_SECRET: Optional[str] = os.getenv("ADMIN_SECRET", None)
    ENABLE_CACHE_CLEAR_ENDPOINT: bool = os.getenv("ENABLE_CACHE_CLEAR_ENDPOINT", "True").lower() in ("true", "1", "yes")

    def get_rate_limit(self) -> int:
        """
        Resolves effective rate limit in requests per minute.
        Precedence:
          1. Explicit RATE_LIMIT_PER_MINUTE override (if set)
          2. RATE_LIMIT_PROD_PER_MINUTE (60) if API_ENV == "production"
          3. RATE_LIMIT_DEV_PER_MINUTE (1000) otherwise
        """
        if self.RATE_LIMIT_PER_MINUTE is not None:
            return self.RATE_LIMIT_PER_MINUTE
        env = (self.API_ENV or self.ENVIRONMENT or "development").lower()
        if env == "production":
            return self.RATE_LIMIT_PROD_PER_MINUTE
        return self.RATE_LIMIT_DEV_PER_MINUTE

    # Path to ML directory (Read-only data access for fallback/metadata)
    ML_DIR: Path = BASE_DIR.parent / "ML"

settings = Settings()

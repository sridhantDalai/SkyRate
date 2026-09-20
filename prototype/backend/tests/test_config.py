import pytest
from app.core.config import (
    parse_cors_origins,
    parse_cors_methods,
    DEFAULT_CORS_METHODS,
    validate_origin,
    DEFAULT_CORS_ORIGINS,
    Settings,
)

def test_default_configuration():
    """Verify default CORS origins when unset or None."""
    parsed = parse_cors_origins(None)
    assert parsed == DEFAULT_CORS_ORIGINS
    assert "http://localhost:3000" in parsed
    assert "http://127.0.0.1:3000" in parsed

def test_single_origin():
    """Verify single origin plain text format without brackets."""
    raw = "http://localhost:3000"
    parsed = parse_cors_origins(raw)
    assert parsed == ["http://localhost:3000"]

    raw_https = "https://skyrate.example.com"
    parsed_https = parse_cors_origins(raw_https)
    assert parsed_https == ["https://skyrate.example.com"]

def test_multiple_origins():
    """Verify comma-separated multiple origins."""
    raw = "http://localhost:3000,http://127.0.0.1:3000,https://app.skyrate.com"
    parsed = parse_cors_origins(raw)
    assert parsed == [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://app.skyrate.com",
    ]

def test_whitespace_handling():
    """Verify surrounding and inter-item whitespace is stripped cleanly."""
    raw = "   http://localhost:3000   ,   http://127.0.0.1:3000   "
    parsed = parse_cors_origins(raw)
    assert parsed == ["http://localhost:3000", "http://127.0.0.1:3000"]

def test_empty_values():
    """Verify empty string, whitespace-only string, and empty items in list."""
    # Completely empty string
    assert parse_cors_origins("") == []
    # Whitespace only
    assert parse_cors_origins("   ") == []
    # Empty items embedded in comma-separated list
    raw = "http://localhost:3000, , , http://127.0.0.1:3000 , "
    assert parse_cors_origins(raw) == ["http://localhost:3000", "http://127.0.0.1:3000"]

def test_trailing_slash_normalization():
    """Verify trailing slashes are stripped to conform to CORS origin standards."""
    raw = "http://localhost:3000/"
    assert parse_cors_origins(raw) == ["http://localhost:3000"]

def test_security_wildcard_only_when_explicit():
    """Verify wildcard '*' is only accepted when explicitly passed."""
    assert parse_cors_origins("*") == ["*"]
    # Normal origins should not contain wildcard
    assert "*" not in parse_cors_origins("http://localhost:3000")

def test_invalid_origins_rejected():
    """Verify malformed origins raise a ValueError."""
    with pytest.raises(ValueError, match="Invalid CORS origin"):
        parse_cors_origins("not_a_url")

    with pytest.raises(ValueError, match="Invalid CORS origin"):
        parse_cors_origins("ftp://unsupported-scheme.com")

def test_settings_cors_origins_property():
    """Verify Settings object exposes CORS_ORIGINS as list[str]."""
    s = Settings()
    assert isinstance(s.CORS_ORIGINS, list)
    assert len(s.CORS_ORIGINS) > 0
    for origin in s.CORS_ORIGINS:
        assert origin.startswith("http://") or origin.startswith("https://") or origin == "*"


def test_cors_methods_parsing():
    """Verify parse_cors_methods parses strings and lists, normalizes to uppercase."""
    assert parse_cors_methods(None) == ["GET", "POST", "OPTIONS"]
    assert parse_cors_methods("get, post, options") == ["GET", "POST", "OPTIONS"]
    assert parse_cors_methods(["get", "post"]) == ["GET", "POST"]
    assert parse_cors_methods("") == ["GET", "POST", "OPTIONS"]


def test_settings_cors_defaults():
    """Verify Settings defaults: allow_credentials=False, allow_methods=['GET', 'POST', 'OPTIONS']."""
    s = Settings()
    assert s.CORS_ALLOW_CREDENTIALS is False
    assert s.CORS_ALLOW_METHODS == ["GET", "POST", "OPTIONS"]


def test_wildcard_origin_with_credentials_forbidden():
    """Verify security constraint: combining wildcard origin '*' with allow_credentials=True raises ValueError."""
    with pytest.raises(ValueError, match="CORS security violation"):
        Settings(CORS_ORIGINS="*", CORS_ALLOW_CREDENTIALS=True)

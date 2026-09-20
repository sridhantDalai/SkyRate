import pytest
from app.core.config import settings


def test_cors_get_allowed_origin(client):
    """A GET request from an allowed origin receives Access-Control-Allow-Origin."""
    response = client.get(
        "/api/v1/health",
        headers={"Origin": "http://localhost:3000"}
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"
    # Credentials must NOT be enabled
    assert response.headers.get("access-control-allow-credentials") is None


def test_cors_preflight_options_explicit_methods(client):
    """Preflight OPTIONS request returns explicitly allowed methods (GET, POST, OPTIONS)."""
    response = client.options(
        "/api/v1/health",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        }
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"
    allowed_methods = response.headers.get("access-control-allow-methods", "")
    # Must allow GET, POST, OPTIONS
    assert "GET" in allowed_methods
    assert "POST" in allowed_methods
    assert "OPTIONS" in allowed_methods
    # Must NOT allow wildcard methods
    assert allowed_methods != "*"
    # Must NOT allow DELETE or PUT
    assert "DELETE" not in allowed_methods
    assert "PUT" not in allowed_methods


def test_cors_preflight_disallowed_method_rejected(client):
    """Preflight for an unpermitted method (e.g. DELETE) is rejected with HTTP 400."""
    response = client.options(
        "/api/v1/health",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "DELETE",
        }
    )
    assert response.status_code == 400
    # Must not grant access to DELETE
    allowed_methods = response.headers.get("access-control-allow-methods", "")
    assert "DELETE" not in allowed_methods


def test_cors_untrusted_origin_rejected(client):
    """Requests from untrusted origins do NOT receive CORS authorization headers."""
    response = client.get(
        "/api/v1/health",
        headers={"Origin": "http://malicious-attacker.com"}
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") is None


def test_cors_no_credentials_by_default(client):
    """SkyRate public API does not return Access-Control-Allow-Credentials by default."""
    response = client.get(
        "/api/v1/indexes/overview",
        headers={"Origin": "http://localhost:3000"}
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-credentials") is None


def test_cors_both_localhost_and_loopback_allowed(client):
    """Verify both localhost:3000 and 127.0.0.1:3000 work seamlessly for local frontend."""
    for origin in ("http://localhost:3000", "http://127.0.0.1:3000"):
        res = client.get(
            "/api/v1/health",
            headers={"Origin": origin}
        )
        assert res.status_code == 200
        assert res.headers.get("access-control-allow-origin") == origin

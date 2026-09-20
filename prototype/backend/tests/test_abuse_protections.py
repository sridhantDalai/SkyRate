import pytest
from app.core.config import settings
from app.core.cache import cache


@pytest.fixture(autouse=True)
def restore_settings():
    """Preserve and restore settings between tests."""
    orig_env = settings.API_ENV
    orig_body_limit = settings.MAX_REQUEST_BODY_BYTES
    orig_admin_secret = settings.ADMIN_SECRET
    orig_cache_clear_enabled = settings.ENABLE_CACHE_CLEAR_ENDPOINT
    yield
    settings.API_ENV = orig_env
    settings.MAX_REQUEST_BODY_BYTES = orig_body_limit
    settings.ADMIN_SECRET = orig_admin_secret
    settings.ENABLE_CACHE_CLEAR_ENDPOINT = orig_cache_clear_enabled


# ============================================================================
# 1. REQUEST BODY PROTECTION (HTTP 413)
# ============================================================================

def test_request_body_size_within_limit_passes(client):
    """Requests with small payloads (< 1 MB) are processed normally."""
    settings.MAX_REQUEST_BODY_BYTES = 1024 * 1024
    response = client.get("/api/v1/health")
    assert response.status_code == 200


def test_request_body_content_length_exceeding_1mb_rejected_with_413(client):
    """Requests declaring Content-Length > 1 MB must be rejected immediately with HTTP 413."""
    settings.MAX_REQUEST_BODY_BYTES = 1024 * 1024  # 1 MB

    # 1.5 MB Content-Length header
    headers = {"Content-Length": str(1572864), "Content-Type": "application/json"}
    response = client.post("/api/v1/health/cache/clear", headers=headers)

    assert response.status_code == 413
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "PAYLOAD_TOO_LARGE"
    assert "exceeds maximum allowed size" in data["error"]["message"]
    assert data["error"]["details"]["max_bytes"] == 1048576
    assert data["error"]["details"]["content_length"] == 1572864


def test_request_body_stream_payload_exceeding_limit_rejected_with_413(client):
    """Requests sending actual payload body larger than configured limit are rejected with HTTP 413."""
    settings.MAX_REQUEST_BODY_BYTES = 1024  # 1 KB limit for testing

    # Send 2 KB payload
    oversized_payload = b"X" * 2048
    response = client.post(
        "/api/v1/health/cache/clear",
        content=oversized_payload,
        headers={"Content-Type": "application/octet-stream"}
    )

    assert response.status_code == 413
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "PAYLOAD_TOO_LARGE"


# ============================================================================
# 2. PAGINATION BOUNDS (OFFSET <= 5000, BOUNDED LIMITS)
# ============================================================================

def test_pagination_indexes_latest_bounds(client):
    """Verify offset <= 5000 and limit <= 200 on /api/v1/indexes/latest."""
    # Valid bounds
    r_valid_0 = client.get("/api/v1/indexes/latest?offset=0&limit=10")
    assert r_valid_0.status_code == 200

    r_valid_5000 = client.get("/api/v1/indexes/latest?offset=5000&limit=10")
    assert r_valid_5000.status_code == 200

    # Exceeded offset (> 5000)
    r_exceeded_offset = client.get("/api/v1/indexes/latest?offset=5001")
    assert r_exceeded_offset.status_code == 422
    data = r_exceeded_offset.json()
    assert data["success"] is False
    assert data["error"]["code"] in ("VALIDATION_ERROR", "INVALID_QUERY_PARAMETER")

    # Exceeded limit (> 200)
    r_exceeded_limit = client.get("/api/v1/indexes/latest?limit=201")
    assert r_exceeded_limit.status_code == 422
    assert r_exceeded_limit.json()["success"] is False


def test_pagination_fares_latest_bounds(client):
    """Verify offset <= 5000 and limit <= 200 on /api/v1/fares/latest."""
    # Valid bounds
    r_valid_0 = client.get("/api/v1/fares/latest?offset=0&limit=10")
    assert r_valid_0.status_code == 200

    r_valid_5000 = client.get("/api/v1/fares/latest?offset=5000&limit=10")
    assert r_valid_5000.status_code == 200

    # Exceeded offset (> 5000)
    r_exceeded_offset = client.get("/api/v1/fares/latest?offset=5001")
    assert r_exceeded_offset.status_code == 422
    data = r_exceeded_offset.json()
    assert data["success"] is False
    assert data["error"]["code"] in ("VALIDATION_ERROR", "INVALID_QUERY_PARAMETER")

    # Exceeded limit (> 200)
    r_exceeded_limit = client.get("/api/v1/fares/latest?limit=201")
    assert r_exceeded_limit.status_code == 422
    assert r_exceeded_limit.json()["success"] is False


def test_pagination_fares_history_bounds(client):
    """Verify offset <= 5000 and limit <= 100 on /api/v1/fares/history."""
    # Valid bounds
    r_valid_0 = client.get("/api/v1/fares/history?route=DEL-BOM&offset=0&limit=10")
    assert r_valid_0.status_code == 200

    r_valid_5000 = client.get("/api/v1/fares/history?route=DEL-BOM&offset=5000&limit=10")
    assert r_valid_5000.status_code == 200

    # Exceeded offset (> 5000)
    r_exceeded_offset = client.get("/api/v1/fares/history?route=DEL-BOM&offset=5001")
    assert r_exceeded_offset.status_code == 422
    data = r_exceeded_offset.json()
    assert data["success"] is False
    assert data["error"]["code"] in ("VALIDATION_ERROR", "INVALID_QUERY_PARAMETER")

    # Exceeded limit (> 100)
    r_exceeded_limit = client.get("/api/v1/fares/history?route=DEL-BOM&limit=101")
    assert r_exceeded_limit.status_code == 422
    assert r_exceeded_limit.json()["success"] is False


def test_pagination_analytics_trends_bounds(client):
    """Verify offset <= 5000 and limit <= 1000 on /api/v1/analytics/trends."""
    # Valid bounds
    r_valid_0 = client.get("/api/v1/analytics/trends?route=DEL-BOM&offset=0&limit=50")
    assert r_valid_0.status_code == 200

    r_valid_5000 = client.get("/api/v1/analytics/trends?route=DEL-BOM&offset=5000&limit=50")
    assert r_valid_5000.status_code == 200

    # Exceeded offset (> 5000)
    r_exceeded_offset = client.get("/api/v1/analytics/trends?route=DEL-BOM&offset=5001")
    assert r_exceeded_offset.status_code == 422
    data = r_exceeded_offset.json()
    assert data["success"] is False
    assert data["error"]["code"] in ("VALIDATION_ERROR", "INVALID_QUERY_PARAMETER")

    # Exceeded limit (> 1000)
    r_exceeded_limit = client.get("/api/v1/analytics/trends?route=DEL-BOM&limit=1001")
    assert r_exceeded_limit.status_code == 422
    assert r_exceeded_limit.json()["success"] is False


# ============================================================================
# 3. CACHE CLEAR ENDPOINT PROTECTION
# ============================================================================

def test_cache_clear_in_production_without_admin_secret_is_forbidden(client):
    """In production, cache clearing without configured ADMIN_SECRET returns HTTP 403."""
    settings.API_ENV = "production"
    settings.ADMIN_SECRET = None

    response = client.post("/api/v1/health/cache/clear")
    assert response.status_code == 403
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "FORBIDDEN"
    assert "disabled in production" in data["error"]["message"]


def test_cache_clear_in_production_requires_authentication(client):
    """In production with ADMIN_SECRET, missing credentials return 401."""
    settings.API_ENV = "production"
    settings.ADMIN_SECRET = "prod-super-secret-key"

    response = client.post("/api/v1/health/cache/clear")
    assert response.status_code == 401
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "UNAUTHORIZED"
    # Never expose secret
    assert "prod-super-secret-key" not in str(data)


def test_cache_clear_in_production_rejects_invalid_credentials(client):
    """In production with ADMIN_SECRET, invalid credentials return 403."""
    settings.API_ENV = "production"
    settings.ADMIN_SECRET = "prod-super-secret-key"

    response = client.post(
        "/api/v1/health/cache/clear",
        headers={"X-Admin-Secret": "wrong-secret"}
    )
    assert response.status_code == 403
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "FORBIDDEN"
    assert "prod-super-secret-key" not in str(data)


def test_cache_clear_in_production_succeeds_with_valid_credentials(client):
    """In production with ADMIN_SECRET, valid X-Admin-Secret flushes cache successfully."""
    settings.API_ENV = "production"
    settings.ADMIN_SECRET = "prod-super-secret-key"

    # Populate cache
    cache.set("test_key", "test_value", 300)
    assert cache.stats()["live_entries"] >= 1

    response = client.post(
        "/api/v1/health/cache/clear",
        headers={"X-Admin-Secret": "prod-super-secret-key"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "cache flushed"
    assert data["cleared_entries"] >= 1


def test_cache_clear_with_bearer_authorization_header(client):
    """Valid Bearer token in Authorization header is accepted."""
    settings.API_ENV = "production"
    settings.ADMIN_SECRET = "prod-super-secret-key"

    response = client.post(
        "/api/v1/health/cache/clear",
        headers={"Authorization": "Bearer prod-super-secret-key"}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "cache flushed"


def test_cache_clear_disabled_via_flag(client):
    """When ENABLE_CACHE_CLEAR_ENDPOINT=False, endpoint returns HTTP 403."""
    settings.ENABLE_CACHE_CLEAR_ENDPOINT = False

    response = client.post(
        "/api/v1/health/cache/clear",
        headers={"X-Admin-Secret": "any-key"}
    )
    assert response.status_code == 403
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == "FORBIDDEN"


def test_cache_clear_in_dev_without_secret_allows_local_execution(client):
    """In development without ADMIN_SECRET, local developers can flush cache."""
    settings.API_ENV = "development"
    settings.ADMIN_SECRET = None
    settings.ENABLE_CACHE_CLEAR_ENDPOINT = True

    response = client.post("/api/v1/health/cache/clear")
    assert response.status_code == 200
    assert response.json()["status"] == "cache flushed"

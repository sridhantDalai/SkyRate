import pytest
import re
from fastapi import HTTPException, status
from fastapi.testclient import TestClient
from app.main import app
from app.core.exceptions import (
    ResourceNotFoundException,
    PartitionNotFoundException,
    DatabaseException,
    InvalidParameterException,
    sanitize_message,
    format_error_response,
    skyrate_exception_handler,
    validation_exception_handler,
    http_exception_handler,
    database_exception_handler,
    generic_exception_handler,
)

@pytest.fixture
def client():
    return TestClient(app)

def test_validation_error_contract(client):
    """Verifies that invalid query parameters produce the standardized error contract."""
    response = client.get("/api/v1/fares/latest?route=INVALID_ROUTE")
    assert response.status_code == 422
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    json_data = response.json()
    
    assert "error" in json_data
    err = json_data["error"]
    assert "code" in err
    assert isinstance(err["code"], str)
    assert err["code"] == "INVALID_QUERY_PARAMETER"
    assert "message" in err
    assert isinstance(err["message"], str)
    assert "details" in err
    assert isinstance(err["details"], dict)
    assert "errors" in err["details"]
    assert json_data.get("success") is False

def test_not_found_error_contract(client):
    """Verifies that nonexistent routes or paths return a 404 with the standardized contract."""
    response = client.get("/api/v1/routes/NONEXISTENT-ROUTE")
    assert response.status_code == 404
    json_data = response.json()
    
    assert "error" in json_data
    err = json_data["error"]
    assert err["code"] == "NOT_FOUND"
    assert isinstance(err["message"], str)
    assert "not found" in err["message"].lower()
    assert isinstance(err["details"], dict)
    assert json_data.get("success") is False

def test_unregistered_endpoint_not_found_contract(client):
    """Verifies that an unmapped endpoint returns 404 with the standardized contract."""
    response = client.get("/api/v1/nonexistent/endpoint/xyz")
    assert response.status_code == 404
    json_data = response.json()
    
    assert "error" in json_data
    err = json_data["error"]
    assert err["code"] == "NOT_FOUND"
    assert isinstance(err["message"], str)
    assert isinstance(err["details"], dict)
    assert json_data.get("success") is False

def test_invalid_query_parameter_horizon(client):
    """Verifies validation error on invalid horizon parameter."""
    response = client.get("/api/v1/analytics/trends?horizon=T+999")
    assert response.status_code == 422
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    json_data = response.json()
    
    assert "error" in json_data
    err = json_data["error"]
    assert err["code"] == "INVALID_QUERY_PARAMETER"
    assert "horizon" in err["message"].lower() or "horizon" in str(err["details"]).lower()

def test_invalid_query_parameter_date(client):
    """Verifies validation error on invalid date string."""
    response = client.get("/api/v1/fares/latest?date=invalid-date")
    assert response.status_code == 422
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    json_data = response.json()
    
    assert "error" in json_data
    err = json_data["error"]
    assert err["code"] == "INVALID_QUERY_PARAMETER"

def test_database_exception_contract():
    """Verifies that DatabaseException generates 503 with standardized error structure."""
    from fastapi import FastAPI

    test_app = FastAPI()
    test_app.add_exception_handler(DatabaseException, database_exception_handler)

    @test_app.get("/trigger-db-error")
    def trigger():
        raise DatabaseException("Simulated connection timeout to pg_catalog.pg_tables")

    with TestClient(test_app, raise_server_exceptions=False) as tc:
        resp = tc.get("/trigger-db-error")
        assert resp.status_code == 503
        data = resp.json()
        assert "error" in data
        assert data["error"]["code"] == "DATABASE_ERROR"
        assert data["error"]["message"] == "Database operation failed. Please try again later."
        assert isinstance(data["error"]["details"], dict)
        assert data.get("success") is False
        # Verify no SQL, database internals, or connection details leak
        assert "password" not in resp.text
        assert "select" not in resp.text.lower()
        assert "pg_catalog" not in resp.text

def test_internal_error_contract():
    """Verifies that unhandled internal exceptions return 500 with sanitized contract."""
    from fastapi import FastAPI

    test_app = FastAPI()
    test_app.add_exception_handler(Exception, generic_exception_handler)

    @test_app.get("/trigger-crash")
    def trigger():
        raise RuntimeError("Secret internal failure in C:\\Users\\Administrator\\secret.py: Line 42")

    with TestClient(test_app, raise_server_exceptions=False) as tc:
        resp = tc.get("/trigger-crash")
        assert resp.status_code == 500
        data = resp.json()
        assert "error" in data
        assert data["error"]["code"] == "INTERNAL_SERVER_ERROR"
        assert data["error"]["message"] == "An unexpected server error occurred."
        assert isinstance(data["error"]["details"], dict)
        assert data.get("success") is False
        # Verify no file paths or stack traces leak
        assert "Administrator" not in resp.text
        assert "secret.py" not in resp.text
        assert "Traceback" not in resp.text

def test_redaction_guarantees():
    """Verifies that sanitize_message redacts credentials, SQL, file paths, and env vars."""
    # Credential leakage
    raw_secret = "Connection failed with sb_secret_ABC123456789_xyz for user"
    assert "sb_secret_" not in sanitize_message(raw_secret)
    assert "redacted" in sanitize_message(raw_secret).lower()

    # Connection string leakage
    raw_db = "Failed connecting to postgresql://postgres:mypassword@db.host.co:5432/postgres"
    assert "mypassword" not in sanitize_message(raw_db)
    assert "postgresql://" not in sanitize_message(raw_db)

    # SQL query leakage
    raw_sql = "Error in query: SELECT * FROM public.users WHERE id = 1"
    assert "SELECT *" not in sanitize_message(raw_sql)
    assert "redacted" in sanitize_message(raw_sql).lower()

    # File path leakage (Windows and Unix)
    raw_win_path = "Crash occurred at C:\\Users\\mkrma\\Desktop\\SkyRate\\secret.py line 12"
    sanitized_win = sanitize_message(raw_win_path)
    assert "C:\\Users\\mkrma" not in sanitized_win
    assert "[REDACTED_PATH]" in sanitized_win

    raw_unix_path = "Crash occurred at /Users/developer/project/models.py line 45"
    sanitized_unix = sanitize_message(raw_unix_path)
    assert "/Users/developer" not in sanitized_unix
    assert "[REDACTED_PATH]" in sanitized_unix

    # Environment variable leakage
    raw_env = "Config check failed: SUPABASE_URL=https://secret.supabase.co"
    assert "SUPABASE_URL=https://" not in sanitize_message(raw_env)
    assert "[REDACTED]" in sanitize_message(raw_env)

def test_custom_domain_exceptions():
    """Verifies domain-specific exceptions conform to status codes and codes."""
    res_exc = ResourceNotFoundException("Carrier", "VirginAtlantic")
    assert res_exc.status_code == 404
    assert res_exc.code == "NOT_FOUND"
    assert res_exc.details == {"resource": "Carrier", "identifier": "VirginAtlantic"}

    part_exc = PartitionNotFoundException("scraped_on_01_01_1990")
    assert part_exc.status_code == 404
    assert part_exc.code == "PARTITION_NOT_FOUND"
    assert part_exc.details["partition_date"] == "1990-01-01"
    assert "scraped_on" not in part_exc.message
    assert "partition_table" not in part_exc.details

    param_exc = InvalidParameterException("horizon", "Unsupported time horizon", location="query")
    assert param_exc.status_code == 422
    assert param_exc.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    assert param_exc.code == "INVALID_QUERY_PARAMETER"

# --- Phase 32 Security Audit Specific Tests ---

def test_secret_redaction_supabase_env_vars():
    """Verifies that SUPABASE_SECRET_KEY, SUPABASE_URL, and SUPABASE_DB_URL are properly redacted."""
    # Test SUPABASE_SECRET_KEY
    secret_val = "sb_sec_super_secret_token_value_98765"
    raw_msg = f"Failed to load client: SUPABASE_SECRET_KEY={secret_val}"
    sanitized = sanitize_message(raw_msg)
    assert secret_val not in sanitized
    assert "[REDACTED]" in sanitized or "redacted" in sanitized.lower()

    # Test custom non-prefixed secret value
    custom_secret = "my_custom_production_key_xyz987"
    raw_custom = f"Config alert: SUPABASE_SECRET_KEY={custom_secret}"
    sanitized_custom = sanitize_message(raw_custom)
    assert custom_secret not in sanitized_custom
    assert "SUPABASE_SECRET_KEY=[REDACTED]" in sanitized_custom

    # Test SUPABASE_URL
    raw_url = "Failed connecting: SUPABASE_URL=https://myproj.supabase.co, timeout"
    sanitized_url = sanitize_message(raw_url)
    assert "https://myproj.supabase.co" not in sanitized_url
    assert "SUPABASE_URL=[REDACTED]" in sanitized_url

    # Test SUPABASE_DB_URL
    raw_db_url = "DB connect error: SUPABASE_DB_URL=postgresql://user:pass@db.host.co:5432/postgres"
    sanitized_db = sanitize_message(raw_db_url)
    assert "pass@db.host.co" not in sanitized_db
    assert "redacted" in sanitized_db.lower() or "SUPABASE_DB_URL=[REDACTED]" in sanitized_db

def test_secret_redaction_jwt_and_service_role_tokens():
    """Verifies that JWT service-role tokens are detected and redacted."""
    jwt_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSJ9.abcdef1234567890"
    raw_jwt_msg = f"Auth failed with service token: {jwt_token}"
    sanitized = sanitize_message(raw_jwt_msg)
    assert jwt_token not in sanitized
    assert "redacted" in sanitized.lower() or "[REDACTED_TOKEN]" in sanitized

    # Service role key assignment pattern
    service_role_msg = "Error connecting with service_role_key: secret_admin_service_role_token_abc123"
    sanitized_sr = sanitize_message(service_role_msg)
    assert "secret_admin_service_role_token_abc123" not in sanitized_sr
    assert "redacted" in sanitized_sr.lower()

def test_error_envelope_structure_guarantee():
    """Verifies format_error_response preserves the exact error envelope contract."""
    envelope = format_error_response(
        code="TEST_CODE",
        message="A test message with C:\\Users\\Administrator\\app\\main.py",
        details={"test_key": "test_val"}
    )
    assert "error" in envelope
    assert envelope["error"]["code"] == "TEST_CODE"
    assert "Administrator" not in envelope["error"]["message"]
    assert "[REDACTED_PATH]" in envelope["error"]["message"]
    assert envelope["error"]["details"] == {"test_key": "test_val"}
    assert envelope["success"] is False

def test_validation_exception_handler_sanitizes_nested_errors():
    """Verifies that validation errors do not leak file paths or secrets in details."""
    from pydantic import BaseModel, Field, ValidationError

    class DummyModel(BaseModel):
        route: str = Field(...)

    try:
        DummyModel(route="bad")
    except ValidationError:
        pass

    # Test with mock RequestValidationError
    from fastapi.exceptions import RequestValidationError
    raw_error = [{
        "loc": ("query", "date"),
        "msg": "Invalid date in C:\\Users\\dev\\project\\date_util.py",
        "type": "value_error"
    }]
    exc = RequestValidationError(errors=raw_error)

    from fastapi import Request
    from starlette.datastructures import Headers

    class DummyRequest:
        url = type("URL", (), {"path": "/test"})()
        method = "GET"
        query_params = {"date": "bad"}
        headers = Headers()

    import asyncio
    resp = asyncio.run(validation_exception_handler(DummyRequest(), exc))
    assert resp.status_code == 422
    assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    import json
    body = json.loads(resp.body.decode("utf-8"))
    assert body["error"]["code"] == "INVALID_QUERY_PARAMETER"
    assert "C:\\Users\\dev" not in body["error"]["message"]
    assert "[REDACTED_PATH]" in body["error"]["message"]
    assert "C:\\Users\\dev" not in body["error"]["details"]["errors"][0]["message"]
    assert "[REDACTED_PATH]" in body["error"]["details"]["errors"][0]["message"]

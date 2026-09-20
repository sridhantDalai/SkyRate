import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture
def client():
    return TestClient(app)

def test_openapi_schema_metadata(client):
    """Verifies that /openapi.json contains the required title, SIH26056 description, and version."""
    response = client.get("/openapi.json")
    assert response.status_code == 200
    schema = response.json()

    # Title check
    assert schema["info"]["title"] == "SkyRate API"

    # Version check
    assert schema["info"]["version"] == "1.0.0"

    # Description check explaining SIH26056
    description = schema["info"]["description"]
    assert "SIH26056" in description
    assert "MoSPI" in description
    assert "CPI" in description
    assert "Air Passenger Price Index" in description or "APIx" in description

def test_openapi_tags(client):
    """Verifies that the required tags exist in the OpenAPI schema."""
    response = client.get("/openapi.json")
    assert response.status_code == 200
    schema = response.json()

    tag_names = {tag["name"] for tag in schema.get("tags", [])}
    required_tags = {"Health", "Fares", "Index", "Routes", "Analytics", "Metadata"}
    assert required_tags.issubset(tag_names), f"Missing tags: {required_tags - tag_names}"

def test_docs_and_redoc_endpoints(client):
    """Verifies that /docs and /redoc return 200 HTML content."""
    resp_docs = client.get("/docs")
    assert resp_docs.status_code == 200
    assert "swagger" in resp_docs.text.lower() or "html" in resp_docs.text.lower()

    resp_redoc = client.get("/redoc")
    assert resp_redoc.status_code == 200
    assert "redoc" in resp_redoc.text.lower() or "html" in resp_redoc.text.lower()

def test_endpoint_summaries_and_descriptions(client):
    """Verifies that endpoints across all required tags define summaries and descriptions."""
    response = client.get("/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    paths = schema.get("paths", {})

    required_endpoints = [
        "/api/v1/health",
        "/api/v1/fares/latest",
        "/api/v1/fares/history",
        "/api/v1/fares/distribution",
        "/api/v1/indexes/latest",
        "/api/v1/indexes/overview",
        "/api/v1/indexes/history",
        "/api/v1/indexes/compare",
        "/api/v1/routes",
        "/api/v1/routes/{route}",
        "/api/v1/analytics/overview",
        "/api/v1/analytics/trends",
        "/api/v1/analytics/elasticity",
        "/api/v1/analytics/carriers",
        "/api/v1/analytics/fare-components",
        "/api/v1/metadata/carriers",
        "/api/v1/metadata/airports",
        "/api/v1/metadata/routes",
        "/api/v1/metadata/horizons",
        "/api/v1/metadata",
    ]

    for ep in required_endpoints:
        assert ep in paths, f"Endpoint {ep} missing from OpenAPI paths"
        methods = paths[ep]
        for method, operation in methods.items():
            if method.lower() not in ["get", "post", "put", "delete"]:
                continue
            assert "summary" in operation, f"Summary missing for {method.upper()} {ep}"
            assert len(operation["summary"]) > 0
            assert "description" in operation, f"Description missing for {method.upper()} {ep}"
            assert len(operation["description"]) > 0

def test_parameter_descriptions_present(client):
    """Verifies that query and path parameters have informative descriptions."""
    response = client.get("/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    paths = schema.get("paths", {})

    # Check fares latest query params
    fares_latest_params = paths["/api/v1/fares/latest"]["get"].get("parameters", [])
    param_names = {p["name"]: p for p in fares_latest_params}
    for key in ["origin", "destination", "route", "carrier", "horizon", "limit", "offset"]:
        assert key in param_names, f"Parameter '{key}' missing from /api/v1/fares/latest"
        assert "description" in param_names[key], f"Description missing for parameter '{key}'"
        assert len(param_names[key]["description"]) > 0

    # Check route corridor path param
    route_details_params = paths["/api/v1/routes/{route}"]["get"].get("parameters", [])
    route_param = next((p for p in route_details_params if p["name"] == "route"), None)
    assert route_param is not None
    assert "description" in route_param
    assert "DEL-BOM" in str(route_param)

def test_response_examples_and_error_schemas(client):
    """Verifies that endpoints document response examples and standardized error responses."""
    response = client.get("/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    paths = schema.get("paths", {})

    # Check /api/v1/health responses
    health_responses = paths["/api/v1/health"]["get"]["responses"]
    assert "200" in health_responses
    assert "503" in health_responses
    assert "example" in str(health_responses["200"]) or "examples" in str(health_responses["200"])

    # Check /api/v1/fares/latest error responses
    fares_responses = paths["/api/v1/fares/latest"]["get"]["responses"]
    assert "422" in fares_responses
    assert "503" in fares_responses

    # Check /api/v1/routes/{route} error responses
    route_responses = paths["/api/v1/routes/{route}"]["get"]["responses"]
    assert "404" in route_responses

def test_no_sensitive_leaks_in_openapi(client):
    """Ensures no internal secrets, passwords, or file paths leak in the OpenAPI specification."""
    response = client.get("/openapi.json")
    assert response.status_code == 200
    schema_text = response.text

    # No credentials
    assert "sb_secret_" not in schema_text
    assert "postgresql://" not in schema_text
    assert "SUPABASE_SECRET_KEY=" not in schema_text

    # No internal absolute file paths
    assert "c:\\users" not in schema_text.lower()
    assert "/users/mkrma" not in schema_text.lower()

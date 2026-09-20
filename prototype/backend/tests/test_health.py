import pytest
from unittest.mock import patch, AsyncMock
from app.db.supabase import SupabaseManager
from app.core.config import settings

def test_health_endpoint_contract(client):
    """Verify the endpoint returns 200 and matches the exact specified contract schema."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["status"] == "ok"
    assert json_data["service"] == "skyrate-backend"
    assert "database" in json_data
    assert json_data["database"] in ("connected", "disconnected")

def test_health_endpoint_connected(client):
    """Verify endpoint returns 'connected' when the database connectivity check passes."""
    with patch.object(SupabaseManager, "check_database_connectivity", new_callable=AsyncMock) as mock_check:
        mock_check.return_value = "connected"
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        assert response.json() == {
            "status": "ok",
            "service": "skyrate-backend",
            "database": "connected"
        }

def test_health_endpoint_disconnected(client):
    """Verify endpoint returns 'disconnected' when the database connectivity check fails."""
    with patch.object(SupabaseManager, "check_database_connectivity", new_callable=AsyncMock) as mock_check:
        mock_check.return_value = "disconnected"
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        assert response.json() == {
            "status": "ok",
            "service": "skyrate-backend",
            "database": "disconnected"
        }

@pytest.mark.asyncio
async def test_supabase_connectivity_check_without_credentials():
    """Verify database check returns 'disconnected' when credentials are empty."""
    with patch.object(settings, "SUPABASE_URL", ""), patch.object(settings, "SUPABASE_SECRET_KEY", ""):
        result = await SupabaseManager.check_database_connectivity()
        assert result == "disconnected"

@pytest.mark.asyncio
async def test_supabase_connectivity_check_live_success():
    """Verify database check returns 'connected' when PostgREST probe responds 200 OK."""
    with patch.object(settings, "SUPABASE_URL", "https://xyz.supabase.co"), \
         patch.object(settings, "SUPABASE_SECRET_KEY", "dummy_secret_key"):
        
        mock_response = AsyncMock()
        mock_response.status_code = 200

        with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_response
            result = await SupabaseManager.check_database_connectivity()
            assert result == "connected"

@pytest.mark.asyncio
async def test_supabase_connectivity_check_network_failure():
    """Verify database check returns 'disconnected' on network or timeout errors."""
    with patch.object(settings, "SUPABASE_URL", "https://xyz.supabase.co"), \
         patch.object(settings, "SUPABASE_SECRET_KEY", "dummy_secret_key"):
        
        with patch("httpx.AsyncClient.get", side_effect=Exception("Connection timeout")):
            result = await SupabaseManager.check_database_connectivity()
            assert result == "disconnected"

import pytest
from types import SimpleNamespace
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.db.supabase import SupabaseManager
from app.core.exceptions import (
    DatabaseException,
    ResourceNotFoundException,
    PartitionNotFoundException,
    InvalidParameterException,
    sanitize_message
)

# ── Mock Query Helpers ────────────────────────────────────────────────────────

class MockQueryChain:
    """Chainable mock replicating PostgREST query builders without network activity."""
    def __init__(self, data=None, count=None, raise_exc=None):
        self._data = data if data is not None else []
        self._count = count if count is not None else len(self._data)
        self._raise_exc = raise_exc

    def select(self, *args, **kwargs):
        return self

    def eq(self, *args, **kwargs):
        return self

    def in_(self, *args, **kwargs):
        return self

    def lte(self, *args, **kwargs):
        return self

    def gte(self, *args, **kwargs):
        return self

    def order(self, *args, **kwargs):
        return self

    def range(self, *args, **kwargs):
        return self

    def limit(self, *args, **kwargs):
        return self

    def execute(self):
        if self._raise_exc:
            raise self._raise_exc
        return SimpleNamespace(data=self._data, count=self._count)

SAMPLE_FARES_DATA = [
    {
        "ID": "6E-101-DEL-BOM-001",
        "route": "DEL-BOM",
        "carrier": "IndiGo",
        "flight_number": "6E-101",
        "is_non_stop": True,
        "t_window": "T+1",
        "base_fare": 4200.0,
        "taxes": 450.0,
        "udf_fee": 77.0,
        "gross_fare": 4727.0,
        "status": "Available",
        "source": "SkyRate Network"
    },
    {
        "ID": "AI-202-DEL-BOM-002",
        "route": "DEL-BOM",
        "carrier": "Air India",
        "flight_number": "AI-202",
        "is_non_stop": True,
        "t_window": "T+1",
        "base_fare": 5100.0,
        "taxes": 550.0,
        "udf_fee": 77.0,
        "gross_fare": 5727.0,
        "status": "Available",
        "source": "SkyRate Network"
    },
    {
        "ID": "SG-303-DEL-BOM-003",
        "route": "DEL-BOM",
        "carrier": "SpiceJet",
        "flight_number": "SG-303",
        "is_non_stop": False,
        "t_window": "T+7",
        "base_fare": 3500.0,
        "taxes": 380.0,
        "udf_fee": 77.0,
        "gross_fare": 3957.0,
        "status": "Sold Out",
        "source": "SkyRate Network"
    }
]

SAMPLE_INDEX_DATA = [
    {
        "State": "All India",
        "Time_Horizon": "T",
        "MoSPI_Base": 100.0,
        "Basket_Inflation": "+4.2%",
        "RealTime_APIx": 104.2
    },
    {
        "State": "Delhi",
        "Time_Horizon": "T+1",
        "MoSPI_Base": 100.0,
        "Basket_Inflation": "+5.1%",
        "RealTime_APIx": 105.1
    },
    {
        "State": "Maharashtra",
        "Time_Horizon": "T+7",
        "MoSPI_Base": 100.0,
        "Basket_Inflation": "+3.8%",
        "RealTime_APIx": 103.8
    }
]

@pytest.fixture
def client():
    with TestClient(app) as tc:
        yield tc

# ─────────────────────────────────────────────────────────────────────────────
# 1. Health Coverage
# ─────────────────────────────────────────────────────────────────────────────

def test_01_health_comprehensive(client):
    """Tests health endpoint under connected, disconnected, and error states using mocks."""
    # 1a. Database connected state
    with patch.object(SupabaseManager, "check_database_connectivity", return_value="connected"):
        resp = client.get("/api/v1/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["service"] == "skyrate-backend"
        assert data["database"] == "connected"

    # 1b. Database disconnected state
    with patch.object(SupabaseManager, "check_database_connectivity", return_value="disconnected"):
        resp = client.get("/api/v1/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["database"] == "disconnected"

    # 1c. Network exception during health check handled gracefully
    with patch.object(SupabaseManager, "check_database_connectivity", side_effect=Exception("Timeout")):
        resp = client.get("/api/v1/health")
        # Route handler catches or returns disconnected
        assert resp.status_code in [200, 503]

# ─────────────────────────────────────────────────────────────────────────────
# 2. Invalid Parameters Coverage
# ─────────────────────────────────────────────────────────────────────────────

def test_02_invalid_parameters_comprehensive(client):
    """Verifies that malformed parameters produce 422 INVALID_QUERY_PARAMETER."""
    # Invalid 3-letter IATA code
    resp = client.get("/api/v1/fares/latest?origin=DELHI_INVALID")
    assert resp.status_code == 422
    err = resp.json()["error"]
    assert err["code"] == "INVALID_QUERY_PARAMETER"

    # Invalid route corridor format
    resp = client.get("/api/v1/fares/latest?route=DEL-BOMBAY")
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "INVALID_QUERY_PARAMETER"

    # Invalid advance purchase horizon
    resp = client.get("/api/v1/analytics/trends?horizon=T+999")
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "INVALID_QUERY_PARAMETER"

    # Out-of-bounds pagination limit (exceeds le=200)
    resp = client.get("/api/v1/fares/latest?limit=500")
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "INVALID_QUERY_PARAMETER"

    # Negative pagination offset
    resp = client.get("/api/v1/fares/latest?offset=-5")
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "INVALID_QUERY_PARAMETER"

    # Date format validation / SQL injection prevention
    resp = client.get("/api/v1/fares/latest?date=scraped_on_2026;DROP TABLE")
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "INVALID_QUERY_PARAMETER"

    # Inverted date range (date_from > date_to)
    resp = client.get("/api/v1/fares/history?date_from=2026-09-25&date_to=2026-09-10")
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "INVALID_QUERY_PARAMETER"

# ─────────────────────────────────────────────────────────────────────────────
# 3. Empty Datasets Coverage
# ─────────────────────────────────────────────────────────────────────────────

def test_03_empty_datasets_comprehensive(client):
    """Verifies that empty database partitions or query results return graceful 200 responses."""
    mock_client = MagicMock()
    mock_client.table.return_value = MockQueryChain(data=[], count=0)

    with patch.object(SupabaseManager, "get_client", return_value=mock_client), \
         patch.object(SupabaseManager, "resolve_active_scraped_table", return_value=("scraped_on_19_09_2026", True)), \
         patch.object(SupabaseManager, "resolve_active_index_table", return_value=("index_for_19_09_2026", True)):

        # Empty fares query
        resp = client.get("/api/v1/fares/latest?carrier=NonExistentAirline")
        assert resp.status_code == 200
        json_data = resp.json()
        assert json_data["success"] is True
        assert json_data["data"]["items"] == []
        assert json_data["data"]["total"] == 0

        # Empty index query
        resp_idx = client.get("/api/v1/indexes/latest?state=NonExistentState")
        assert resp_idx.status_code == 200
        assert resp_idx.json()["data"]["items"] == []
        assert resp_idx.json()["data"]["total"] == 0

        # State not found
        resp_st = client.get("/api/v1/indexes/state/Atlantis")
        assert resp_st.status_code == 404
        assert resp_st.json()["error"]["code"] == "NOT_FOUND"

# ─────────────────────────────────────────────────────────────────────────────
# 4. Fare Filtering Coverage
# ─────────────────────────────────────────────────────────────────────────────

def test_04_fare_filtering_comprehensive(client):
    """Verifies filtering fares by carrier, origin/destination, nonstop, and max_price."""
    mock_client = MagicMock()
    mock_client.table.return_value = MockQueryChain(data=SAMPLE_FARES_DATA, count=len(SAMPLE_FARES_DATA))

    with patch.object(SupabaseManager, "get_client", return_value=mock_client), \
         patch.object(SupabaseManager, "resolve_active_scraped_table", return_value=("scraped_on_19_09_2026", True)):

        # Filter by carrier
        resp_carrier = client.get("/api/v1/fares/latest?carrier=IndiGo")
        assert resp_carrier.status_code == 200
        assert resp_carrier.json()["data"]["filters_applied"]["carrier"] == "IndiGo"

        # Filter by nonstop
        resp_nonstop = client.get("/api/v1/fares/latest?nonstop=true")
        assert resp_nonstop.status_code == 200
        assert resp_nonstop.json()["data"]["filters_applied"]["nonstop"] is True

        # Filter by max_price
        resp_price = client.get("/api/v1/fares/latest?max_price=5000.0")
        assert resp_price.status_code == 200
        assert resp_price.json()["data"]["filters_applied"]["max_price"] == 5000.0

        # Filter by status
        resp_status = client.get("/api/v1/fares/latest?status=Available")
        assert resp_status.status_code == 200
        assert resp_status.json()["data"]["filters_applied"]["status"] == "Available"

# ─────────────────────────────────────────────────────────────────────────────
# 5. Date Filtering Coverage
# ─────────────────────────────────────────────────────────────────────────────

def test_05_date_filtering_comprehensive(client):
    """Verifies explicit partition dates, date ranges, and lookback windows."""
    mock_client = MagicMock()
    mock_client.table.return_value = MockQueryChain(data=SAMPLE_FARES_DATA, count=len(SAMPLE_FARES_DATA))

    with patch.object(SupabaseManager, "get_client", return_value=mock_client), \
         patch.object(SupabaseManager, "resolve_active_scraped_table", return_value=("scraped_on_19_09_2026", True)):

        # Specific partition date
        resp_date = client.get("/api/v1/fares/latest?date=2026-09-19")
        assert resp_date.status_code == 200
        p_date = resp_date.json()["data"]["partition_date"]
        assert "19_09_2026" in p_date or "2026-09-19" in p_date

        # Date range for history
        resp_hist = client.get("/api/v1/fares/history?route=DEL-BOM&date_from=2026-09-01&date_to=2026-09-15")
        assert resp_hist.status_code == 200
        assert resp_hist.json()["data"]["date_from"] == "2026-09-01"
        assert resp_hist.json()["data"]["date_to"] == "2026-09-15"

        # Days lookback window
        resp_days = client.get("/api/v1/fares/history?route=DEL-BOM&days=7")
        assert resp_days.status_code == 200
        assert resp_days.json()["success"] is True

# ─────────────────────────────────────────────────────────────────────────────
# 6. Route Filtering Coverage
# ─────────────────────────────────────────────────────────────────────────────

def test_06_route_filtering_comprehensive(client):
    """Verifies route corridor resolution, origin/dest mapping, and 404 for unknown routes."""
    mock_client = MagicMock()
    mock_client.table.return_value = MockQueryChain(data=SAMPLE_FARES_DATA, count=len(SAMPLE_FARES_DATA))

    with patch.object(SupabaseManager, "get_client", return_value=mock_client), \
         patch.object(SupabaseManager, "resolve_active_scraped_table", return_value=("scraped_on_19_09_2026", True)):

        # Route query parameter
        resp_route = client.get("/api/v1/fares/latest?route=DEL-BOM")
        assert resp_route.status_code == 200
        assert resp_route.json()["data"]["filters_applied"]["route"] == "DEL-BOM"

        # Separate origin and destination mapped to route
        resp_split = client.get("/api/v1/fares/latest?origin=DEL&destination=BOM")
        assert resp_split.status_code == 200
        assert resp_split.json()["data"]["filters_applied"]["route"] == "DEL-BOM"

        # Route details endpoint
        resp_details = client.get("/api/v1/routes/DEL-BOM")
        assert resp_details.status_code == 200
        assert resp_details.json()["data"]["route"] == "DEL-BOM"

        # Unknown route corridor raises 404
        resp_unknown = client.get("/api/v1/routes/NONEXISTENT-ROUTE")
        assert resp_unknown.status_code == 404
        assert resp_unknown.json()["error"]["code"] == "NOT_FOUND"

# ─────────────────────────────────────────────────────────────────────────────
# 7. Horizon Filtering Coverage
# ─────────────────────────────────────────────────────────────────────────────

def test_07_horizon_filtering_comprehensive(client):
    """Verifies all supported horizons (T, T+1, T+7, T+15, T+30, T+45, T+60, T+90) and normalization."""
    mock_client = MagicMock()
    mock_client.table.return_value = MockQueryChain(data=SAMPLE_FARES_DATA, count=len(SAMPLE_FARES_DATA))

    with patch.object(SupabaseManager, "get_client", return_value=mock_client), \
         patch.object(SupabaseManager, "resolve_active_scraped_table", return_value=("scraped_on_19_09_2026", True)):

        for h in ["T", "T+1", "T+7", "T+15", "T+30", "T+45", "T+60", "T+90"]:
            resp = client.get(f"/api/v1/fares/latest?horizon={h}")
            assert resp.status_code == 200
            assert resp.json()["data"]["filters_applied"]["horizon"] == h

        # Plus sign in query decoded as space normalized to T+1
        resp_space = client.get("/api/v1/fares/latest?horizon=T 1")
        assert resp_space.status_code == 200
        assert resp_space.json()["data"]["filters_applied"]["horizon"] == "T+1"

        # Unsupported horizon rejected
        resp_bad = client.get("/api/v1/fares/latest?horizon=T+100")
        assert resp_bad.status_code == 422
        assert resp_bad.json()["error"]["code"] == "INVALID_QUERY_PARAMETER"

# ─────────────────────────────────────────────────────────────────────────────
# 8. Pagination Coverage
# ─────────────────────────────────────────────────────────────────────────────

def test_08_pagination_comprehensive(client):
    """Verifies limit, offset, and pagination bounds across airfare and index endpoints."""
    mock_client = MagicMock()
    mock_client.table.return_value = MockQueryChain(data=SAMPLE_FARES_DATA[:1], count=100)

    with patch.object(SupabaseManager, "get_client", return_value=mock_client), \
         patch.object(SupabaseManager, "resolve_active_scraped_table", return_value=("scraped_on_19_09_2026", True)):

        # Limit and offset propagation
        resp = client.get("/api/v1/fares/latest?limit=1&offset=5")
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["limit"] == 1
        assert data["offset"] == 5
        assert len(data["items"]) == 1

        # Upper bound limit=200 accepted
        resp_max = client.get("/api/v1/fares/latest?limit=200")
        assert resp_max.status_code == 200
        assert resp_max.json()["data"]["limit"] == 200

# ─────────────────────────────────────────────────────────────────────────────
# 9. Index Retrieval Coverage
# ─────────────────────────────────────────────────────────────────────────────

def test_09_index_retrieval_comprehensive(client):
    """Verifies latest index, overview, history, comparison, and state-specific retrieval."""
    mock_client = MagicMock()
    mock_client.table.return_value = MockQueryChain(data=SAMPLE_INDEX_DATA, count=len(SAMPLE_INDEX_DATA))

    with patch.object(SupabaseManager, "get_client", return_value=mock_client), \
         patch.object(SupabaseManager, "resolve_active_index_table", return_value=("index_for_19_09_2026", True)):

        # Latest index
        resp_latest = client.get("/api/v1/indexes/latest")
        assert resp_latest.status_code == 200
        assert resp_latest.json()["success"] is True
        assert len(resp_latest.json()["data"]["items"]) > 0

        # Index overview
        resp_overview = client.get("/api/v1/indexes/overview")
        assert resp_overview.status_code == 200
        assert "all_india" in resp_overview.json()["data"]

        # Index history
        resp_hist = client.get("/api/v1/indexes/history?state=All India&days=5")
        assert resp_hist.status_code == 200
        assert isinstance(resp_hist.json()["data"], list)

        # Index compare
        resp_cmp = client.get("/api/v1/indexes/compare")
        assert resp_cmp.status_code == 200
        assert "comparisons" in resp_cmp.json()["data"]

        # State index lookup
        resp_state = client.get("/api/v1/indexes/state/Delhi")
        assert resp_state.status_code == 200
        assert resp_state.json()["data"]["state"] == "Delhi"

# ─────────────────────────────────────────────────────────────────────────────
# 10. Analytics Coverage
# ─────────────────────────────────────────────────────────────────────────────

def test_10_analytics_comprehensive(client):
    """Verifies analytics overview, trends, elasticity, carriers, fee breakdown, and macro oil."""
    mock_client = MagicMock()
    mock_client.table.return_value = MockQueryChain(data=SAMPLE_FARES_DATA, count=len(SAMPLE_FARES_DATA))

    with patch.object(SupabaseManager, "get_client", return_value=mock_client), \
         patch.object(SupabaseManager, "resolve_active_scraped_table", return_value=("scraped_on_19_09_2026", True)), \
         patch.object(SupabaseManager, "resolve_active_index_table", return_value=("index_for_19_09_2026", True)):

        # 10a. Analytics overview
        resp_ov = client.get("/api/v1/analytics/overview")
        assert resp_ov.status_code == 200
        ov_data = resp_ov.json()["data"]
        assert "number_of_observed_fares" in ov_data
        assert "number_of_routes" in ov_data

        # 10b. Analytics trends (daily, weekly, monthly)
        for gran in ["daily", "weekly", "monthly"]:
            resp_trend = client.get(f"/api/v1/analytics/trends?route=DEL-BOM&granularity={gran}")
            assert resp_trend.status_code == 200
            assert resp_trend.json()["data"]["granularity"] == gran

        # 10c. Lead-time price behaviour (elasticity)
        resp_elas = client.get("/api/v1/analytics/elasticity?route=DEL-BOM")
        assert resp_elas.status_code == 200
        assert "points" in resp_elas.json()["data"]
        assert len(resp_elas.json()["data"]["points"]) > 0

        # 10d. Carrier comparisons (objective statistics)
        resp_carrier = client.get("/api/v1/analytics/carriers?route=DEL-BOM")
        assert resp_carrier.status_code == 200
        assert "carriers" in resp_carrier.json()["data"]

        # 10e. Fare fee components decomposition
        resp_fee = client.get("/api/v1/analytics/fare-components?route=DEL-BOM")
        assert resp_fee.status_code == 200
        assert "breakdown" in resp_fee.json()["data"]

        # 10f. Macro Brent crude oil
        resp_oil = client.get("/api/v1/analytics/macro/oil")
        assert resp_oil.status_code == 200
        assert "oil_records" in resp_oil.json()["data"]

# ─────────────────────────────────────────────────────────────────────────────
# 11. Error Contract & Information Redaction Coverage
# ─────────────────────────────────────────────────────────────────────────────

def test_11_error_contract_comprehensive(client):
    """Verifies that all errors adhere to the error contract and suppress sensitive details."""
    # 404 Not Found error contract
    resp_404 = client.get("/api/v1/routes/UNKNOWN-CORRIDOR")
    assert resp_404.status_code == 404
    data_404 = resp_404.json()
    assert "error" in data_404
    assert data_404["error"]["code"] == "NOT_FOUND"
    assert isinstance(data_404["error"]["message"], str)
    assert isinstance(data_404["error"]["details"], dict)

    # 422 Validation error contract
    resp_422 = client.get("/api/v1/fares/latest?origin=BAD_CODE")
    assert resp_422.status_code == 422
    data_422 = resp_422.json()
    assert "error" in data_422
    assert data_422["error"]["code"] == "INVALID_QUERY_PARAMETER"
    assert "errors" in data_422["error"]["details"]

    # Redaction checks: credentials, SQL, paths, environment variables
    secret_msg = "Failed with sb_secret_SUPERKEY and postgresql://user:pass@host:5432/db"
    sanitized = sanitize_message(secret_msg)
    assert "sb_secret_" not in sanitized
    assert "postgresql://" not in sanitized
    assert "pass" not in sanitized

    sql_msg = "Error executing SELECT * FROM users WHERE id=1"
    assert "SELECT *" not in sanitize_message(sql_msg)

    path_msg = "Error at C:\\SecretPath\\backend\\app\\main.py line 42"
    assert "C:\\SecretPath" not in sanitize_message(path_msg)
    assert "[REDACTED_PATH]" in sanitize_message(path_msg)

# ─────────────────────────────────────────────────────────────────────────────
# 12. Database Failure Handling Coverage
# ─────────────────────────────────────────────────────────────────────────────

def test_12_database_failure_handling_comprehensive(client):
    """Verifies graceful handling of database timeouts, connection drops, and query exceptions."""
    # 12a. Database connection timeout raising DatabaseException
    mock_client_err = MagicMock()
    mock_client_err.table.return_value = MockQueryChain(raise_exc=Exception("Connection timed out after 3000ms"))

    with patch.object(SupabaseManager, "get_client", return_value=mock_client_err), \
         patch.object(SupabaseManager, "resolve_active_scraped_table", return_value=("scraped_on_19_09_2026", True)):

        # Fares latest catches DB query failure and falls back or returns clean response
        resp = client.get("/api/v1/fares/latest")
        assert resp.status_code in [200, 503]
        if resp.status_code == 503:
            assert resp.json()["error"]["code"] == "DATABASE_ERROR"

    # 12b. DatabaseException error envelope contract verification
    from fastapi import FastAPI
    from app.core.exceptions import database_exception_handler

    test_app = FastAPI()
    test_app.add_exception_handler(DatabaseException, database_exception_handler)

    @test_app.get("/trigger-db-timeout")
    def trigger_db_timeout():
        raise DatabaseException("Simulated connection timeout to Supabase")

    with TestClient(test_app, raise_server_exceptions=False) as tc:
        resp = tc.get("/trigger-db-timeout")
        assert resp.status_code == 503
        err = resp.json()["error"]
        assert err["code"] == "DATABASE_ERROR"
        assert "database" in err["details"]["service"]
        assert "password" not in resp.text
        assert "select" not in resp.text.lower()

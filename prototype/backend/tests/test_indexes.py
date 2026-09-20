def test_get_latest_index_default(client):
    """Test GET /api/v1/indexes/latest returns latest data with stable response schema and pagination."""
    response = client.get("/api/v1/indexes/latest")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["success"] is True
    data = json_data["data"]
    
    assert "partition_date" in data
    assert data["partition_date"] == "2026-09-19"
    assert "partition_table" not in data
    assert "total" in data
    assert "limit" in data
    assert "offset" in data
    assert "items" in data
    assert "filters_applied" in data
    assert isinstance(data["items"], list)
    assert len(data["items"]) > 0

    first_item = data["items"][0]
    assert "state" in first_item
    assert "time_horizon" in first_item
    assert "mospi_base" in first_item
    assert "basket_inflation" in first_item
    assert "real_time_apix" in first_item

def test_get_latest_index_filter_state(client):
    """Test filtering by state returns only matching records."""
    response = client.get("/api/v1/indexes/latest?state=Delhi")
    assert response.status_code == 200
    json_data = response.json()
    data = json_data["data"]
    assert data["filters_applied"]["state"] == "Delhi"
    for item in data["items"]:
        assert "delhi" in item["state"].lower()

def test_get_latest_index_filter_route(client):
    """Test filtering by route dynamically maps to the origin state."""
    response = client.get("/api/v1/indexes/latest?route=DEL-BOM")
    assert response.status_code == 200
    json_data = response.json()
    data = json_data["data"]
    assert data["filters_applied"]["route"] == "DEL-BOM"
    assert data["filters_applied"]["state"] == "Delhi"
    for item in data["items"]:
        assert item["state"] == "Delhi"

def test_get_latest_index_filter_horizon(client):
    """Test filtering by advance purchase horizon (e.g. T+1)."""
    response = client.get("/api/v1/indexes/latest?horizon=T+1")
    assert response.status_code == 200
    json_data = response.json()
    data = json_data["data"]
    assert data["filters_applied"]["horizon"] == "T+1"
    for item in data["items"]:
        assert item["time_horizon"] == "T+1"

def test_get_latest_index_filter_carrier_informative(client):
    """Test carrier query param is handled gracefully (noting macro aggregation)."""
    response = client.get("/api/v1/indexes/latest?carrier=IndiGo")
    assert response.status_code == 200
    json_data = response.json()
    data = json_data["data"]
    assert "carrier" in data["filters_applied"]
    assert "IndiGo" in data["filters_applied"]["carrier"]

def test_get_latest_index_pagination(client):
    """Test limit and offset pagination controls."""
    response = client.get("/api/v1/indexes/latest?limit=2&offset=1")
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["limit"] == 2
    assert data["offset"] == 1
    assert len(data["items"]) <= 2

def test_get_latest_index_no_data_graceful(client):
    """Test that queries with no matching data return 200 OK with empty items list, not 500 error."""
    response = client.get("/api/v1/indexes/latest?state=NonExistentState999")
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["total"] == 0
    assert data["items"] == []

def test_get_latest_index_credentials_never_exposed(client):
    """Security check: verify Supabase credentials and internal connection strings are never exposed."""
    response = client.get("/api/v1/indexes/latest")
    raw_text = response.text
    assert "service_role" not in raw_text
    assert "SECRET" not in raw_text
    assert "postgres:" not in raw_text

def test_get_index_overview(client):
    response = client.get("/api/v1/indexes/overview")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["success"] is True
    assert "all_india" in json_data["data"]
    assert "states" in json_data["data"]

def test_get_index_history(client):
    response = client.get("/api/v1/indexes/history?state=All India&days=5")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["success"] is True
    assert isinstance(json_data["data"], list)
    assert len(json_data["data"]) == 5
    assert "apix" in json_data["data"][0]

def test_get_index_compare(client):
    response = client.get("/api/v1/indexes/compare")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["success"] is True
    assert "comparisons" in json_data["data"]
    assert len(json_data["data"]["comparisons"]) > 0

def test_get_state_index(client):
    response = client.get("/api/v1/indexes/state/Delhi")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["success"] is True
    assert json_data["data"]["state"] == "Delhi"

def test_get_state_index_not_found(client):
    response = client.get("/api/v1/indexes/state/NonExistentStateXYZ")
    assert response.status_code == 404

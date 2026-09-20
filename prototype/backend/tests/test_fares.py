def test_get_fares_latest_basic(client):
    response = client.get("/api/v1/fares/latest")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["success"] is True
    data = json_data["data"]
    assert "items" in data
    assert "total" in data
    assert "total_count" in data
    assert "partition_date" in data
    assert data["partition_date"] == "2026-09-19"
    assert "partition_table" not in data
    assert isinstance(data["items"], list)
    assert len(data["items"]) > 0

def test_get_fares_latest_filters(client):
    # Filter by origin and destination
    response = client.get("/api/v1/fares/latest?origin=DEL&destination=BOM")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["success"] is True
    for item in json_data["data"]["items"]:
        assert item["route"] == "DEL-BOM"

    # Filter by carrier
    response = client.get("/api/v1/fares/latest?carrier=IndiGo")
    assert response.status_code == 200
    for item in response.json()["data"]["items"]:
        assert "IndiGo" in item["carrier"]

    # Filter by horizon
    response = client.get("/api/v1/fares/latest?horizon=T%2B1")
    assert response.status_code == 200
    for item in response.json()["data"]["items"]:
        assert item["t_window"] == "T+1"

    # Filter by nonstop
    response = client.get("/api/v1/fares/latest?nonstop=true")
    assert response.status_code == 200
    for item in response.json()["data"]["items"]:
        assert item["is_non_stop"] is True

    # Filter by status
    response = client.get("/api/v1/fares/latest?status=Available")
    assert response.status_code == 200
    for item in response.json()["data"]["items"]:
        assert item["status"] == "Available"

    # Filter by date partition
    response = client.get("/api/v1/fares/latest?date=2026-09-19")
    assert response.status_code == 200
    assert response.json()["data"]["partition_date"] == "2026-09-19"
    assert "partition_table" not in response.json()["data"]

def test_get_fares_latest_pagination(client):
    response = client.get("/api/v1/fares/latest?limit=2&offset=1")
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["limit"] == 2
    assert data["offset"] == 1
    assert len(data["items"]) <= 2

def test_get_fares_latest_validation_errors(client):
    # Invalid 3-letter IATA code
    resp = client.get("/api/v1/fares/latest?origin=DELHI")
    assert resp.status_code == 422
    assert resp.json()["success"] is False
    assert resp.json()["error"]["code"] in ["INVALID_QUERY_PARAMETER", "VALIDATION_ERROR"]

    # Invalid route
    resp = client.get("/api/v1/fares/latest?route=DEL-BOMBAY")
    assert resp.status_code == 422
    assert resp.json()["success"] is False

    # Invalid horizon
    resp = client.get("/api/v1/fares/latest?horizon=T+999")
    assert resp.status_code == 422
    assert resp.json()["success"] is False

    # SQL injection / raw table name injection prevention
    resp = client.get("/api/v1/fares/latest?date=scraped_on_2026;DROP TABLE")
    assert resp.status_code == 422
    assert resp.json()["success"] is False

def test_get_fares_history_basic(client):
    response = client.get("/api/v1/fares/history?route=DEL-BOM&days=5")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["success"] is True
    data = json_data["data"]
    assert "items" in data
    assert "total_points" in data
    assert "date_from" in data
    assert "date_to" in data
    assert len(data["items"]) == 6  # 5 days back through today inclusive = 6 points
    point = data["items"][0]
    assert "date" in point
    assert "avg_gross_fare" in point
    assert "min_gross_fare" in point
    assert "max_gross_fare" in point

def test_get_fares_history_filters_and_pagination(client):
    response = client.get(
        "/api/v1/fares/history?route=DEL-BOM&carrier=IndiGo&horizon=T%2B1&date_from=2026-09-10&date_to=2026-09-15&limit=3&offset=1"
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["route"] == "DEL-BOM"
    assert data["carrier"] == "IndiGo"
    assert data["horizon"] == "T+1"
    assert data["date_from"] == "2026-09-10"
    assert data["date_to"] == "2026-09-15"
    assert len(data["items"]) == 3
    assert data["total_points"] == 6

def test_get_fares_history_validation(client):
    # date_from after date_to
    resp = client.get("/api/v1/fares/history?date_from=2026-09-20&date_to=2026-09-10")
    assert resp.status_code == 422
    assert resp.json()["success"] is False

    # Date range > 90 days
    resp = client.get("/api/v1/fares/history?date_from=2026-01-01&date_to=2026-06-01")
    assert resp.status_code == 422
    assert resp.json()["success"] is False

def test_get_fares_distribution_basic(client):
    response = client.get("/api/v1/fares/distribution?route=DEL-BOM")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["success"] is True
    data = json_data["data"]
    assert "min_fare" in data
    assert "max_fare" in data
    assert "median_fare" in data
    assert "p25_fare" in data
    assert "p75_fare" in data
    assert "std_dev" in data
    assert "buckets" in data
    assert len(data["buckets"]) == 4
    for b in data["buckets"]:
        assert "price_range" in b
        assert "min_price" in b
        assert "max_price" in b
        assert "count" in b
        assert "percentage" in b

def test_get_fares_distribution_filters(client):
    response = client.get("/api/v1/fares/distribution?route=DEL-BOM&carrier=IndiGo&horizon=T%2B1&nonstop=true")
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["route"] == "DEL-BOM"
    assert data["carrier"] == "IndiGo"
    assert data["horizon"] == "T+1"
    assert data["sample_size"] > 0

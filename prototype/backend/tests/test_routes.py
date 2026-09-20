def test_get_routes(client):
    response = client.get("/api/v1/routes")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["success"] is True
    assert isinstance(json_data["data"], list)
    assert len(json_data["data"]) > 0
    first_route = json_data["data"][0]
    assert "route" in first_route
    assert "origin" in first_route
    assert "destination" in first_route

def test_get_route_details(client):
    response = client.get("/api/v1/routes/DEL-BOM")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["success"] is True
    data = json_data["data"]
    assert data["route"] == "DEL-BOM"
    assert "distance_km" in data
    assert "monitored_carriers" in data

def test_get_route_details_not_found(client):
    response = client.get("/api/v1/routes/INVALIDROUTE")
    assert response.status_code == 404

def test_get_metadata_subpaths(client):
    # Test /metadata/carriers
    r_carriers = client.get("/api/v1/metadata/carriers")
    assert r_carriers.status_code == 200
    assert len(r_carriers.json()["data"]) > 0

    # Test /metadata/airports
    r_airports = client.get("/api/v1/metadata/airports")
    assert r_airports.status_code == 200
    assert len(r_airports.json()["data"]) > 0

    # Test /metadata/routes
    r_routes = client.get("/api/v1/metadata/routes")
    assert r_routes.status_code == 200
    assert len(r_routes.json()["data"]) > 0

    # Test /metadata/horizons
    r_horizons = client.get("/api/v1/metadata/horizons")
    assert r_horizons.status_code == 200
    assert len(r_horizons.json()["data"]) > 0

def test_get_metadata_consolidated(client):
    response = client.get("/api/v1/metadata")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["success"] is True
    assert "airports" in json_data["data"]
    assert "horizons" in json_data["data"]
    assert "carriers" in json_data["data"]

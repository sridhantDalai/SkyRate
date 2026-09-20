def test_get_analytics_overview(client):
    response = client.get("/api/v1/analytics/overview")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["success"] is True
    data = json_data["data"]

    # 1. latest APIx
    assert "latest_apix" in data
    assert data["latest_apix"] is not None
    assert isinstance(data["latest_apix"], (int, float))

    # 2. previous APIx (either float or None if prior partition absent)
    assert "previous_apix" in data

    # 3. percentage change (either float or None)
    assert "percentage_change" in data

    # 4. number of observed fares
    assert "number_of_observed_fares" in data
    assert isinstance(data["number_of_observed_fares"], int)
    assert data["number_of_observed_fares"] > 0

    # 5. number of routes
    assert "number_of_routes" in data
    assert isinstance(data["number_of_routes"], int)
    assert data["number_of_routes"] > 0

    # 6. number of carriers
    assert "number_of_carriers" in data
    assert isinstance(data["number_of_carriers"], int)
    assert data["number_of_carriers"] > 0

    # 7. lowest observed fare
    assert "lowest_observed_fare" in data
    assert data["lowest_observed_fare"] is not None

    # 8. median fare
    assert "median_fare" in data
    assert data["median_fare"] is not None
    assert data["lowest_observed_fare"] <= data["median_fare"]

    # 9. highest observed fare
    assert "highest_observed_fare" in data
    assert data["highest_observed_fare"] is not None
    assert data["median_fare"] <= data["highest_observed_fare"]

    # 10. latest observation date
    assert "latest_observation_date" in data
    assert isinstance(data["latest_observation_date"], str)
    assert len(data["latest_observation_date"]) > 0

    # Backward compatibility fields
    assert "all_india_apix" in data
    assert "total_routes_monitored" in data
    assert "average_gross_fare_inr" in data
    assert "brent_crude_usd" in data

def test_get_analytics_trends_daily(client):
    response = client.get("/api/v1/analytics/trends?route=DEL-BOM&granularity=daily&days=7")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["success"] is True
    data = json_data["data"]
    assert data["granularity"] == "daily"
    assert data["route"] == "DEL-BOM"
    assert "series" in data
    assert isinstance(data["series"], list)
    assert len(data["series"]) == 8  # 7 days back through today inclusive
    point = data["series"][0]
    assert "date" in point
    assert "value" in point
    assert isinstance(point["value"], (int, float))

def test_get_analytics_trends_weekly(client):
    response = client.get("/api/v1/analytics/trends?route=DEL-BOM&granularity=weekly&date_from=2026-09-01&date_to=2026-09-19")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["success"] is True
    data = json_data["data"]
    assert data["granularity"] == "weekly"
    assert "series" in data
    assert len(data["series"]) > 0
    for pt in data["series"]:
        assert "date" in pt
        assert "value" in pt
        assert isinstance(pt["value"], (int, float))

def test_get_analytics_trends_monthly(client):
    response = client.get("/api/v1/analytics/trends?route=DEL-BOM&granularity=monthly&date_from=2026-06-01&date_to=2026-09-19")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["success"] is True
    data = json_data["data"]
    assert data["granularity"] == "monthly"
    assert "series" in data
    assert len(data["series"]) >= 4
    for pt in data["series"]:
        assert "date" in pt
        assert "value" in pt

def test_get_analytics_trends_filters(client):
    response = client.get("/api/v1/analytics/trends?origin=DEL&destination=BOM&carrier=IndiGo&horizon=T%2B1&granularity=daily&days=5")
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["route"] == "DEL-BOM"
    assert data["carrier"] == "IndiGo"
    assert data["horizon"] == "T+1"
    assert len(data["series"]) == 6

def test_get_analytics_trends_validation_errors(client):
    # Invalid granularity
    resp = client.get("/api/v1/analytics/trends?granularity=yearly")
    assert resp.status_code == 422
    assert resp.json()["success"] is False

    # Invalid date range
    resp = client.get("/api/v1/analytics/trends?date_from=2026-09-20&date_to=2026-09-10")
    assert resp.status_code == 422
    assert resp.json()["success"] is False

    # Invalid airport code
    resp = client.get("/api/v1/analytics/trends?origin=DELHI")
    assert resp.status_code == 422
    assert resp.json()["success"] is False

def test_get_analytics_elasticity(client):
    # 1. Standard route query
    response = client.get("/api/v1/analytics/elasticity?route=DEL-BOM")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["success"] is True
    data = json_data["data"]
    assert data["route"] == "DEL-BOM"
    assert "points" in data
    
    # Assert exact required horizons and days_before_departure
    expected_horizons = [
        ("T+1", 1),
        ("T+7", 7),
        ("T+15", 15),
        ("T+30", 30),
        ("T+45", 45),
    ]
    points = data["points"]
    assert len(points) == 5
    for pt, (h_code, days) in zip(points, expected_horizons):
        assert pt["horizon"] == h_code
        assert pt["days_before_departure"] == days
        assert "median_fare" in pt
        assert "min_fare" in pt
        assert "max_fare" in pt
        assert pt["min_fare"] <= pt["median_fare"] <= pt["max_fare"] or pt["median_fare"] == 0

    # 2. Optional route omitted (defaults to ALL routes)
    resp_all = client.get("/api/v1/analytics/elasticity")
    assert resp_all.status_code == 200
    assert resp_all.json()["data"]["route"] == "ALL"
    assert len(resp_all.json()["data"]["points"]) == 5

    # 3. Optional carrier filter
    resp_carrier = client.get("/api/v1/analytics/elasticity?route=DEL-BOM&carrier=IndiGo")
    assert resp_carrier.status_code == 200
    data_carrier = resp_carrier.json()["data"]
    assert data_carrier["carrier"] == "IndiGo"
    assert len(data_carrier["points"]) == 5

    # 4. Optional date filter
    resp_date = client.get("/api/v1/analytics/elasticity?route=DEL-BOM&date=2026-09-19")
    assert resp_date.status_code == 200
    assert resp_date.json()["success"] is True

    # 5. Invalid route format validation error
    resp_bad_route = client.get("/api/v1/analytics/elasticity?route=DELHI-MUMBAI")
    assert resp_bad_route.status_code == 422
    assert resp_bad_route.json()["success"] is False

    # 6. Invalid date format validation error
    resp_bad_date = client.get("/api/v1/analytics/elasticity?date=2026-99-99")
    assert resp_bad_date.status_code == 422
    assert resp_bad_date.json()["success"] is False

    # 7. Backward compatibility route
    resp_compat = client.get("/api/v1/analytics/surge/DEL-BOM")
    assert resp_compat.status_code == 200
    assert len(resp_compat.json()["data"]["points"]) == 5

def test_get_analytics_carriers(client):
    # 1. Default query across all routes in active partition
    response = client.get("/api/v1/analytics/carriers")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["success"] is True
    data = json_data["data"]
    assert "carriers" in data
    assert data["total_carriers"] > 0
    assert data["total_observations"] > 0
    carriers = data["carriers"]
    assert len(carriers) == data["total_carriers"]

    # Verify metrics per carrier
    carrier_names = []
    for c in carriers:
        assert isinstance(c["carrier"], str)
        carrier_names.append(c["carrier"].lower())
        assert c["observations"] > 0
        assert c["available_count"] >= 0
        assert c["sold_out_count"] >= 0
        assert c["available_count"] + c["sold_out_count"] == c["observations"]
        if c["available_count"] > 0:
            assert c["minimum"] is not None
            assert c["median"] is not None
            assert c["average"] is not None
            assert c["maximum"] is not None
            assert c["minimum"] <= c["median"] <= c["maximum"]
            assert c["minimum"] <= c["average"] <= c["maximum"]
        assert "market_share_pct" in c

    # Verify objective ordering (alphabetical, NOT ranked as best/worst)
    assert carrier_names == sorted(carrier_names)

    # 2. Filter by route
    resp_route = client.get("/api/v1/analytics/carriers?route=DEL-BOM")
    assert resp_route.status_code == 200
    assert resp_route.json()["data"]["route"] == "DEL-BOM"
    assert len(resp_route.json()["data"]["carriers"]) > 0

    # 3. Filter by horizon
    resp_horizon = client.get("/api/v1/analytics/carriers?horizon=T+1")
    assert resp_horizon.status_code == 200
    assert resp_horizon.json()["data"]["horizon"] == "T+1"

    # 4. Filter by date
    resp_date = client.get("/api/v1/analytics/carriers?date=2026-09-19")
    assert resp_date.status_code == 200
    assert resp_date.json()["success"] is True

    # 5. Combined filters
    resp_combined = client.get("/api/v1/analytics/carriers?route=DEL-BOM&horizon=T+1&date=2026-09-19")
    assert resp_combined.status_code == 200
    assert resp_combined.json()["data"]["route"] == "DEL-BOM"
    assert resp_combined.json()["data"]["horizon"] == "T+1"

    # 6. Validation errors
    resp_bad_route = client.get("/api/v1/analytics/carriers?route=INVALID")
    assert resp_bad_route.status_code == 422
    assert resp_bad_route.json()["success"] is False

    resp_bad_date = client.get("/api/v1/analytics/carriers?date=bad-date")
    assert resp_bad_date.status_code == 422
    assert resp_bad_date.json()["success"] is False

    resp_bad_h = client.get("/api/v1/analytics/carriers?horizon=T+999")
    assert resp_bad_h.status_code == 422
    assert resp_bad_h.json()["success"] is False

def test_get_analytics_fare_components(client):
    response = client.get("/api/v1/analytics/fare-components?route=DEL-BOM")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["success"] is True
    data = json_data["data"]
    assert "breakdown" in data
    components = [b["component"] for b in data["breakdown"]]
    assert "Base Fare" in components
    assert "User Development Fee (UDF)" in components


def test_get_analytics_summary_endpoints_and_calculation_date(client):
    """
    Phase 41 Contract Requirement:
    Verify that /summary and /analytics/summary endpoints return calculation_date
    correctly implemented as an ISO-8601 date string matching the observation date.
    """
    for endpoint in ["/api/v1/analytics/overview", "/api/v1/analytics/summary", "/api/v1/summary"]:
        response = client.get(endpoint)
        assert response.status_code == 200, f"Expected 200 on {endpoint}, got {response.status_code}"
        body = response.json()
        assert body["success"] is True
        data = body["data"]
        
        # Verify calculation_date is present and formatted as YYYY-MM-DD
        assert "calculation_date" in data
        assert data["calculation_date"] is not None
        assert len(data["calculation_date"]) == 10
        assert data["calculation_date"].count("-") == 2
        
        # Verify sync with latest_observation_date
        assert data["calculation_date"] == data["latest_observation_date"]


def test_phase42_carrier_normalization_akasa(client):
    """
    Phase 42 Verification:
    Verify that querying with 'Akasa Air' (UI metadata) and 'AkasaAir' (raw scraper)
    both correctly match observations and canonicalize to 'Akasa Air'.
    """
    # 1. Fares search
    r1 = client.get("/api/v1/fares/latest?carrier=Akasa Air")
    assert r1.status_code == 200
    assert r1.json()["data"]["total"] > 0

    r2 = client.get("/api/v1/fares/latest?carrier=AkasaAir")
    assert r2.status_code == 200
    assert r2.json()["data"]["total"] == r1.json()["data"]["total"]

    # 2. Carrier analytics filtering and canonical naming
    r3 = client.get("/api/v1/analytics/carriers?carrier=Akasa Air")
    assert r3.status_code == 200
    carriers = r3.json()["data"]["carriers"]
    assert len(carriers) == 1
    assert carriers[0]["carrier"] == "Akasa Air"
    assert carriers[0]["observations"] > 0

def test_phase42_statistical_integrity_gross_fare_and_sold_out(client):
    """
    Phase 42 Verification:
    Verify that gross fare is strictly used for analytical pricing distributions,
    and sold out/cancelled records (with null gross_fare) are safely handled
    without polluting statistical means or medians.
    """
    response = client.get("/api/v1/analytics/carriers?route=DEL-BOM")
    assert response.status_code == 200
    data = response.json()["data"]
    assert "carriers" in data
    
    for c in data["carriers"]:
        # Verify valid metrics
        if c["minimum"] is not None and c["maximum"] is not None:
            assert c["minimum"] <= c["maximum"], f"Minimum {c['minimum']} exceeds maximum {c['maximum']}"
        if c["median"] is not None and c["minimum"] is not None and c["maximum"] is not None:
            assert c["minimum"] <= c["median"] <= c["maximum"], f"Median {c['median']} not bounded by min/max"
        # Total observations must equal available + sold out
        assert c["observations"] == c["available_count"] + c["sold_out_count"]

import pytest
from app.core.sanitizer import sanitize_partition_date, sanitize_source_name
from app.core.exceptions import PartitionNotFoundException
from app.schemas.fare import FareItem


def test_sanitize_partition_date_edge_cases():
    """Verify conversion of internal partition names and suffixes to ISO YYYY-MM-DD format."""
    assert sanitize_partition_date("scraped_on_19_09_2026") == "2026-09-19"
    assert sanitize_partition_date("index_for_19_09_2026") == "2026-09-19"
    assert sanitize_partition_date("public.\"scraped_on_19_09_2026\"") == "2026-09-19"
    assert sanitize_partition_date("19_09_2026") == "2026-09-19"
    assert sanitize_partition_date("2026-09-19") == "2026-09-19"
    assert sanitize_partition_date("15_08_2026") == "2026-08-15"
    assert sanitize_partition_date(None) == "2026-09-19"


def test_source_sanitization():
    """Verify raw OTA/airline scraper source identities are masked."""
    assert sanitize_source_name("EaseMyTrip") == "SkyRate Network"
    assert sanitize_source_name("MakeMyTrip") == "SkyRate Network"
    assert sanitize_source_name("Scrape.do API") == "SkyRate Network"

    # In FareItem schema
    item = FareItem(
        ID="f999",
        route="DEL-BOM",
        carrier="IndiGo",
        flight_number="6E-101",
        is_non_stop=True,
        t_window="T+1",
        source="EaseMyTrip"
    )
    assert item.source == "SkyRate Network"


def test_partition_not_found_exception_sanitized():
    """PartitionNotFoundException must not expose internal SQL table names in message or details."""
    exc = PartitionNotFoundException("scraped_on_25_12_2025")
    assert exc.status_code == 404
    assert exc.code == "PARTITION_NOT_FOUND"
    assert exc.details["partition_date"] == "2025-12-25"
    assert "partition_table" not in exc.details
    assert "scraped_on" not in exc.message
    assert "table" not in exc.message.lower()


def test_fares_latest_response_sanitization(client):
    """GET /api/v1/fares/latest must return partition_date and omit internal table names."""
    response = client.get("/api/v1/fares/latest")
    assert response.status_code == 200
    json_data = response.json()
    data = json_data["data"]

    # Must contain public partition_date in ISO YYYY-MM-DD
    assert "partition_date" in data
    assert data["partition_date"] == "2026-09-19"

    # Must NOT contain internal partition_table
    assert "partition_table" not in data

    # Response message must not contain internal table names
    assert "scraped_on" not in json_data.get("message", "")
    assert "index_for" not in json_data.get("message", "")

    # Entire response JSON must not contain internal table identifiers
    raw_response_text = str(json_data)
    assert "scraped_on_" not in raw_response_text
    assert "index_for_" not in raw_response_text

    # Verify source sanitization in observations
    for item in data["items"]:
        assert item["source"] == "SkyRate Network"


def test_fares_distribution_response_sanitization(client):
    """GET /api/v1/fares/distribution must omit internal table names."""
    response = client.get("/api/v1/fares/distribution?route=DEL-BOM")
    assert response.status_code == 200
    json_data = response.json()
    data = json_data["data"]

    assert "partition_date" in data
    assert data["partition_date"] == "2026-09-19"
    assert "partition_table" not in data
    assert "scraped_on_" not in str(json_data)


def test_indexes_latest_response_sanitization(client):
    """GET /api/v1/indexes/latest must return partition_date and omit internal table names."""
    response = client.get("/api/v1/indexes/latest")
    assert response.status_code == 200
    json_data = response.json()
    data = json_data["data"]

    assert "partition_date" in data
    assert data["partition_date"] == "2026-09-19"
    assert "partition_table" not in data
    assert "index_for" not in json_data.get("message", "")
    assert "index_for_" not in str(json_data)


def test_indexes_overview_response_sanitization(client):
    """GET /api/v1/indexes/overview must return partition_date and omit partition_table."""
    response = client.get("/api/v1/indexes/overview")
    assert response.status_code == 200
    json_data = response.json()
    data = json_data["data"]

    assert "partition_date" in data
    assert data["partition_date"] == "2026-09-19"
    assert "partition_table" not in data
    assert "index_for_" not in str(json_data)

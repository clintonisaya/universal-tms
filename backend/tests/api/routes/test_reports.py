from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from tests.utils.trip import create_random_trip
from tests.utils.waybill import create_random_waybill


def test_get_waybill_tracking_report(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Story 6-19 AC-1/AC-3: Paginated response with count."""
    waybill = create_random_waybill(db)
    trip = create_random_trip(db, waybill_id=waybill.id)

    response = client.get(
        f"{settings.API_V1_STR}/reports/waybill-tracking",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    # AC-1: Response is now {"data": [...], "count": N}
    assert "data" in content
    assert "count" in content
    assert isinstance(content["data"], list)
    assert isinstance(content["count"], int)
    assert content["count"] >= 1
    assert len(content["data"]) >= 1

    # Check fields on a known item
    item = next((x for x in content["data"] if x["waybill_id"] == str(waybill.id)), None)
    assert item is not None
    assert item["waybill_number"] == waybill.waybill_number
    assert item["trip_number"] == trip.trip_number
    assert "risk_level" in item
    assert "truck_plate" in item
    assert "trailer_plate" in item


def test_waybill_tracking_pagination(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Story 6-19 AC-1: skip/limit params work correctly."""
    response = client.get(
        f"{settings.API_V1_STR}/reports/waybill-tracking?skip=0&limit=1",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert len(content["data"]) <= 1
    assert content["count"] >= 1  # total count > page size


def test_waybill_tracking_search_filter(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Story 6-19 AC-2: search query param filters server-side."""
    response = client.get(
        f"{settings.API_V1_STR}/reports/waybill-tracking?search=NONEXISTENT_PLATE_XYZ",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["count"] == 0
    assert len(content["data"]) == 0


def test_waybill_tracking_status_filter(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Story 6-19 AC-2: status query param filters server-side."""
    response = client.get(
        f"{settings.API_V1_STR}/reports/waybill-tracking?status=Waiting",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert "data" in content
    # All returned trips should have matching status
    for item in content["data"]:
        assert item["trip_status"] == "Waiting"


def test_waybill_tracking_export_mode(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Story 6-19 AC-5: export=true returns all records (ignores skip/limit)."""
    # First get total count
    response_all = client.get(
        f"{settings.API_V1_STR}/reports/waybill-tracking?export=true",
        headers=superuser_token_headers,
    )
    assert response_all.status_code == 200
    all_content = response_all.json()

    # Then get paginated (limit=1)
    response_page = client.get(
        f"{settings.API_V1_STR}/reports/waybill-tracking?skip=0&limit=1",
        headers=superuser_token_headers,
    )
    page_content = response_page.json()

    # Export should return more (or same if only 1 record)
    assert len(all_content["data"]) >= len(page_content["data"])
    # Total count should be the same
    assert all_content["count"] == page_content["count"]

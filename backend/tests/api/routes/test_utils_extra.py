from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from app.core.config import settings

def test_location_autocomplete(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """
    Test location autocomplete proxy endpoint.
    Should return mock results when Radar API is mocked.
    """
    # Mock settings.RADAR_API_KEY to ensure it passes the check
    settings.RADAR_API_KEY = "test_key"
    
    mock_response_data = {
        "addresses": [
            {"formattedAddress": "Ilala, Dar es Salaam, Tanzania"},
            {"formattedAddress": "Ilala Market, Dar es Salaam"}
        ]
    }

    # Patch requests.get to return mock data
    with patch("requests.get") as mock_get:
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_response_data
        mock_get.return_value = mock_response

        response = client.get(
            f"{settings.API_V1_STR}/utils/location-autocomplete?query=Ilala",
            headers=superuser_token_headers,
        )

        assert response.status_code == 200
        content = response.json()
        assert "addresses" in content
        assert len(content["addresses"]) == 2
        assert content["addresses"][0]["formattedAddress"] == "Ilala, Dar es Salaam, Tanzania"
        
        # Verify requests.get was called correctly
        mock_get.assert_called_once()
        args, kwargs = mock_get.call_args
        assert "https://api.radar.io/v1/search/autocomplete" in args[0]
        assert kwargs["params"]["query"] == "Ilala"
        assert kwargs["headers"]["Authorization"] == "test_key"

def test_location_autocomplete_no_key(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Test 503 when API key is missing."""
    # Temporarily remove key
    original_key = settings.RADAR_API_KEY
    settings.RADAR_API_KEY = None
    
    try:
        response = client.get(
            f"{settings.API_V1_STR}/utils/location-autocomplete?query=Ilala",
            headers=superuser_token_headers,
        )
        assert response.status_code == 503
        assert response.json()["detail"] == "Radar API Key not configured"
    finally:
        settings.RADAR_API_KEY = original_key

def test_location_autocomplete_empty_query(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Test empty/short query returns empty list without calling API."""
    settings.RADAR_API_KEY = "test_key"
    
    with patch("requests.get") as mock_get:
        response = client.get(
            f"{settings.API_V1_STR}/utils/location-autocomplete?query=a",
            headers=superuser_token_headers,
        )
        assert response.status_code == 200
        assert response.json() == {"addresses": []}
        mock_get.assert_not_called()

import os
import tempfile
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.core.config import settings


def test_get_file_unauthenticated_returns_401(client: TestClient) -> None:
    """Unauthenticated GET to /files/ must return 401."""
    r = client.get(f"{settings.API_V1_STR}/files/test.txt")
    assert r.status_code == 401


def test_get_file_path_traversal_returns_400(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Path traversal attempt must return 400."""
    r = client.get(
        f"{settings.API_V1_STR}/files/../../etc/passwd",
        headers=superuser_token_headers,
    )
    assert r.status_code == 400
    assert "Invalid file path" in r.json()["detail"]


def test_get_file_path_traversal_encoded_returns_400(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Encoded path traversal must also return 400."""
    r = client.get(
        f"{settings.API_V1_STR}/files/..%2F..%2Fetc%2Fpasswd",
        headers=superuser_token_headers,
    )
    assert r.status_code == 400


def test_get_file_not_found_returns_404(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Requesting a non-existent file must return 404."""
    r = client.get(
        f"{settings.API_V1_STR}/files/nonexistent_file.txt",
        headers=superuser_token_headers,
    )
    assert r.status_code == 404


def test_get_file_authenticated_success(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Authenticated request for a valid file must succeed."""
    # Create a temp file inside the upload dir
    from app.api.routes.files import UPLOAD_DIR

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    test_file = UPLOAD_DIR / "test_auth_file.txt"
    test_file.write_text("hello world")
    try:
        r = client.get(
            f"{settings.API_V1_STR}/files/test_auth_file.txt",
            headers=superuser_token_headers,
        )
        assert r.status_code == 200
        assert r.text == "hello world"
    finally:
        test_file.unlink(missing_ok=True)

import logging
import requests
from fastapi import APIRouter, Depends, HTTPException
from pydantic.networks import EmailStr

logger = logging.getLogger(__name__)

from app.api.deps import get_current_active_superuser, SessionDep, CurrentUser
from app.core.config import settings
from app.models import Message
from app.utils import generate_test_email, send_email

router = APIRouter(prefix="/utils", tags=["utils"])


@router.post(
    "/test-email/",
    dependencies=[Depends(get_current_active_superuser)],
    status_code=201,
)
def test_email(email_to: EmailStr) -> Message:
    """
    Test emails.
    """
    email_data = generate_test_email(email_to=email_to)
    send_email(
        email_to=email_to,
        subject=email_data.subject,
        html_content=email_data.html_content,
    )
    return Message(message="Test email sent")


@router.get("/health-check/")
def health_check() -> bool:
    return True


@router.get("/location-autocomplete")
def location_autocomplete(
    session: SessionDep,
    current_user: CurrentUser,
    query: str
):
    """
    Proxy to Radar.io Autocomplete API.
    """
    if not settings.RADAR_API_KEY:
        raise HTTPException(status_code=503, detail="Radar API Key not configured")

    if not query or len(query) < 2:
        return {"addresses": []}

    try:
        response = requests.get(
            "https://api.radar.io/v1/search/autocomplete",
            params={"query": query, "limit": 10},
            headers={"Authorization": settings.RADAR_API_KEY}
        )
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        logger.warning("Radar API error for query '%s': %s", query, e)
        # Return empty list on error to gracefully degrade to free text
        return {"addresses": []}

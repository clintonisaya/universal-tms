"""
Company Settings — Bank details management for invoices
"""
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.core.db import commit_or_rollback
from app.models import (
    CompanySettings,
    CompanySettingsPublic,
    CompanySettingsUpdate,
    UserRole,
)

router = APIRouter(prefix="/company-settings", tags=["company-settings"])

ADMIN_ROLES = {UserRole.admin, UserRole.finance}


@router.get("", response_model=CompanySettingsPublic)
def read_company_settings(
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    """Get current company settings (bank details). Any authenticated user."""
    settings = session.exec(select(CompanySettings)).first()
    if not settings:
        raise HTTPException(status_code=404, detail="Company settings not found")
    return settings


@router.put("", response_model=CompanySettingsPublic)
def update_company_settings(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    settings_in: CompanySettingsUpdate,
) -> Any:
    """Update company settings (bank details). Admin/Finance only."""
    if current_user.role not in ADMIN_ROLES and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Only Admin or Finance can update company settings")

    settings = session.exec(select(CompanySettings)).first()
    if not settings:
        raise HTTPException(status_code=404, detail="Company settings not found")

    update_dict = settings_in.model_dump(exclude_unset=True)
    settings.sqlmodel_update(update_dict)
    settings.updated_at = datetime.now(timezone.utc)
    settings.updated_by_id = current_user.id

    session.add(settings)
    commit_or_rollback(session)
    session.refresh(settings)
    return settings

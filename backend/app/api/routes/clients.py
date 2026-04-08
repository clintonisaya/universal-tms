"""
Client Management - Story 4.5
CRUD endpoints for client management.
"""
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import func, select

from app.api.deps import CurrentUser, SessionDep
from app.core.db import commit_or_rollback
from app.models import (
    Client,
    ClientCreate,
    ClientPublic,
    ClientsPublic,
    ClientUpdate,
    Message,
)

router = APIRouter(prefix="/clients", tags=["clients"])


@router.get("", response_model=ClientsPublic)
def read_clients(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
) -> Any:
    """
    Retrieve all clients.
    """
    count_statement = select(func.count()).select_from(Client)
    count = session.exec(count_statement).one()
    statement = (
        select(Client).order_by(Client.created_at.desc()).offset(skip).limit(limit)
    )
    clients = session.exec(statement).all()
    return ClientsPublic(data=clients, count=count)


@router.get("/{id}", response_model=ClientPublic)
def read_client(
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> Any:
    """
    Get client by ID.
    """
    client = session.get(Client, id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


@router.post("", response_model=ClientPublic)
def create_client(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    client_in: ClientCreate,
) -> Any:
    """
    Create new client.
    """
    # Check for duplicate system_id
    statement = select(Client).where(Client.system_id == client_in.system_id)
    existing_client = session.exec(statement).first()
    if existing_client:
        raise HTTPException(
            status_code=400,
            detail="Client with this System ID already exists",
        )

    client = Client.model_validate(client_in)
    session.add(client)
    commit_or_rollback(session)
    session.refresh(client)
    return client


@router.patch("/{id}", response_model=ClientPublic)
def update_client(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    client_in: ClientUpdate,
) -> Any:
    """
    Update a client.
    """
    client = session.get(Client, id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    update_dict = client_in.model_dump(exclude_unset=True)
    
    if "system_id" in update_dict and update_dict["system_id"] != client.system_id:
        statement = select(Client).where(Client.system_id == update_dict["system_id"])
        existing_client = session.exec(statement).first()
        if existing_client:
            raise HTTPException(
                status_code=400,
                detail="Client with this System ID already exists",
            )

    client.sqlmodel_update(update_dict)
    session.add(client)
    commit_or_rollback(session)
    session.refresh(client)
    return client


@router.delete("/{id}")
def delete_client(
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> Message:
    """
    Delete a client.
    """
    client = session.get(Client, id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    session.delete(client)
    commit_or_rollback(session)
    return Message(message="Client deleted successfully")

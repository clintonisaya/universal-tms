from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, delete

from app.core.config import settings
from app.core.db import engine, init_db
from app.main import app
from app.models import CargoType, City, Country, Driver, ExpenseRequest, Item, Trailer, Trip, Truck, User, VehicleStatus, Waybill
from tests.utils.user import authentication_token_from_username
from tests.utils.utils import get_superuser_token_headers


@pytest.fixture(scope="session", autouse=True)
def db() -> Generator[Session, None, None]:
    with Session(engine) as session:
        init_db(session)
        yield session
        # Delete in order respecting foreign key constraints
        # statement = delete(ExpenseRequest)
        # session.execute(statement)
        # statement = delete(Trip)
        # session.execute(statement)
        # statement = delete(Waybill)
        # session.execute(statement)
        # statement = delete(Item)
        # session.execute(statement)
        # statement = delete(Truck)
        # session.execute(statement)
        # statement = delete(Driver)
        # session.execute(statement)
        # statement = delete(Trailer)
        # session.execute(statement)
        # statement = delete(City)
        # session.execute(statement)
        # statement = delete(Country)
        # session.execute(statement)
        # statement = delete(Location)
        # session.execute(statement)
        # statement = delete(CargoType)
        # session.execute(statement)
        # statement = delete(VehicleStatus)
        # session.execute(statement)
        # statement = delete(User)
        # session.execute(statement)
        # session.commit()


@pytest.fixture(scope="module")
def client() -> Generator[TestClient, None, None]:
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def superuser_token_headers(client: TestClient) -> dict[str, str]:
    return get_superuser_token_headers(client)


@pytest.fixture(scope="module")
def normal_user_token_headers(client: TestClient, db: Session) -> dict[str, str]:
    return authentication_token_from_username(
        client=client, username=settings.TEST_USER, db=db
    )

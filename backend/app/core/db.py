import os
from sqlmodel import Session, create_engine, select

from app import crud
from app.core.config import settings
from app.models import CargoType, User, UserCreate, UserRole, VehicleStatus, Country, City

engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))


# make sure all SQLModel models are imported (app.models) before initializing DB
# otherwise, SQLModel might fail to initialize relationships properly
# for more details: https://github.com/fastapi/full-stack-fastapi-template/issues/28


def init_db(session: Session) -> None:
    # Tables are managed by Alembic migrations - do NOT use SQLModel.metadata.create_all()
    # as it conflicts with Alembic's migration tracking and causes DuplicateTable errors.

    user = session.exec(
        select(User).where(User.username == settings.FIRST_SUPERUSER)
    ).first()
    if not user:
        user_in = UserCreate(
            username=settings.FIRST_SUPERUSER,
            password=settings.FIRST_SUPERUSER_PASSWORD,
            is_superuser=True,
            role=UserRole.admin,
        )
        user = crud.create_user(session=session, user_create=user_in)
    else:
        # Ensure superuser password matches config (may have been changed by tests)
        from app.core.security import get_password_hash, verify_password
        verified, _ = verify_password(settings.FIRST_SUPERUSER_PASSWORD, user.hashed_password)
        if not verified:
            user.hashed_password = get_password_hash(settings.FIRST_SUPERUSER_PASSWORD)
            session.add(user)
            session.commit()
            session.refresh(user)

    # Seed transport master data if tables are empty
    _seed_cargo_and_statuses(session)
    _seed_countries_and_cities(session)


def _seed_countries_and_cities(session: Session) -> None:
    """Seed countries and cities from cities.txt."""
    if session.exec(select(Country)).first():
        return

    file_path = os.path.join(os.path.dirname(__file__), "..", "cities.txt")
    if not os.path.exists(file_path):
        return

    with open(file_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    current_country = None
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        if "SPECIAL ROUTE" in line:
            break
            
        if line.startswith("•"):
            if not current_country:
                continue
                
            # City line: •Code Name Sorting
            content = line.replace("•", "").strip()
            parts = [p.strip() for p in content.split('\t') if p.strip()]
            
            if len(parts) >= 2:
                city_name = parts[1]
                sorting = 10
                if len(parts) > 2 and parts[2].isdigit():
                    sorting = int(parts[2])
                
                existing_city = session.exec(select(City).where(City.name == city_name, City.country_id == current_country.id)).first()
                if not existing_city:
                    city = City(name=city_name, country_id=current_country.id, sorting=sorting)
                    session.add(city)
        else:
            # Country line
            country_name_raw = line
            country_name = country_name_raw.title()
            if country_name_raw == "DRC": country_name = "DRC"
            elif country_name_raw == "USA": country_name = "USA"
            
            current_country = session.exec(select(Country).where(Country.name == country_name)).first()
            if not current_country:
                code_map = {
                    "DRC": "CD", "ZAMBIA": "ZM", "MOZAMBIQUE": "MZ", "RWANDA": "RW", 
                    "MALAWI": "MW", "ZIMBABWE": "ZW", "KENYA": "KE", "TANZANIA": "TZ", 
                    "BURUNDI": "BI", "UGANDA": "UG"
                }
                code = code_map.get(country_name_raw, country_name[:2].upper())
                
                current_country = Country(name=country_name, code=code)
                session.add(current_country)
                session.commit()
                session.refresh(current_country)
    
    session.commit()


def _seed_cargo_and_statuses(session: Session) -> None:
    """Seed initial transport master data (cargo types, vehicle statuses)."""
    # Seed cargo types
    existing_cargo_types = session.exec(select(CargoType)).first()
    if not existing_cargo_types:
        cargo_types = [
            CargoType(name="20' Container", description="Standard 20-foot shipping container"),
            CargoType(name="40' Container", description="Standard 40-foot shipping container"),
            CargoType(name="Loose Cargo", description="Unpacked or bulk cargo"),
            CargoType(name="Hazardous", description="Hazardous materials requiring special handling"),
            CargoType(name="Refrigerated", description="Temperature-controlled cargo"),
            CargoType(name="Break Bulk", description="Non-containerized general cargo"),
        ]
        for ct in cargo_types:
            session.add(ct)

    # Seed vehicle statuses
    existing_statuses = session.exec(select(VehicleStatus)).first()
    if not existing_statuses:
        statuses = [
            VehicleStatus(name="Waiting Offloading", description="Vehicle waiting at destination to be offloaded"),
            VehicleStatus(name="Delivering", description="Vehicle actively delivering cargo"),
            VehicleStatus(name="Customs Clearance", description="Vehicle undergoing customs clearance"),
            VehicleStatus(name="At Weighbridge", description="Vehicle at weighbridge for inspection"),
            VehicleStatus(name="Parked at Yard", description="Vehicle parked at company yard"),
            VehicleStatus(name="En Route", description="Vehicle traveling between locations"),
            VehicleStatus(name="Loading", description="Vehicle being loaded with cargo"),
            VehicleStatus(name="Border Processing", description="Vehicle processing at border post"),
        ]
        for vs in statuses:
            session.add(vs)

    session.commit()

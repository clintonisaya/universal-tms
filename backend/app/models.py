import uuid
from datetime import datetime, timezone
from decimal import Decimal
from enum import Enum

from sqlalchemy import Column, DateTime, Index, JSON, Numeric, Enum as SAEnum, UniqueConstraint
from sqlmodel import Field, Relationship, SQLModel


def get_datetime_utc() -> datetime:
    return datetime.now(timezone.utc)


class UserRole(str, Enum):
    """User roles for RBAC - FR-ADMIN-01"""
    admin = "admin"
    manager = "manager"
    ops = "ops"
    finance = "finance"


# Shared properties
class UserBase(SQLModel):
    username: str = Field(unique=True, index=True, min_length=3, max_length=50)
    is_active: bool = True
    is_superuser: bool = False
    full_name: str | None = Field(default=None, max_length=255)
    role: UserRole = Field(default=UserRole.ops)
    permissions: list[str] = Field(default=[], sa_column=Column(JSON))


# Properties to receive via API on creation
class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)


class UserRegister(SQLModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on update, all are optional
class UserUpdate(UserBase):
    username: str | None = Field(default=None, min_length=3, max_length=50)  # type: ignore
    password: str | None = Field(default=None, min_length=8, max_length=128)
    role: UserRole | None = Field(default=None)  # type: ignore
    permissions: list[str] | None = Field(default=None)


class UserUpdateMe(SQLModel):
    full_name: str | None = Field(default=None, max_length=255)


class UpdatePassword(SQLModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


# Database model, database table inferred from class name
class User(UserBase, table=True):
    __tablename__ = "users"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    items: list["Item"] = Relationship(back_populates="owner", cascade_delete=True)


# Properties to return via API, id is always required
class UserPublic(UserBase):
    id: uuid.UUID
    created_at: datetime | None = None


class UsersPublic(SQLModel):
    data: list[UserPublic]
    count: int


# Shared properties
class ItemBase(SQLModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=255)


# Properties to receive on item creation
class ItemCreate(ItemBase):
    pass


# Properties to receive on item update
class ItemUpdate(ItemBase):
    title: str | None = Field(default=None, min_length=1, max_length=255)  # type: ignore


# Database model, database table inferred from class name
class Item(ItemBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    owner_id: uuid.UUID = Field(
        foreign_key="users.id", nullable=False, ondelete="CASCADE"
    )
    owner: User | None = Relationship(back_populates="items")


# Properties to return via API, id is always required
class ItemPublic(ItemBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime | None = None


class ItemsPublic(SQLModel):
    data: list[ItemPublic]
    count: int


# Generic message
class Message(SQLModel):
    message: str


# JSON payload containing access token
class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"


# Contents of JWT token
class TokenPayload(SQLModel):
    sub: str | None = None


class NewPassword(SQLModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


class AdminPasswordReset(SQLModel):
    new_password: str = Field(min_length=8, max_length=128)


# ============================================================================
# Truck Models - Story 1.4: Truck Registry Management
# ============================================================================


class TruckStatus(str, Enum):
    """Truck status values - FR-TRUCK-01, extended for Trip workflow"""
    idle = "Idle"
    waiting = "Waiting"
    dispatch = "Dispatched"
    wait_to_load = "Arrived at Loading Point"
    loading = "Loading"
    in_transit = "In Transit"
    at_border = "At Border"
    offloaded = "Offloaded"
    returned = "Arrived at Yard"
    waiting_for_pods = "Waiting for PODs"
    maintenance = "Maintenance"


# Shared properties
class TruckBase(SQLModel):
    plate_number: str = Field(min_length=1, max_length=20, description="Unique truck plate number")
    make: str = Field(min_length=1, max_length=100, description="Truck manufacturer")
    model: str = Field(min_length=1, max_length=100, description="Truck model name")
    status: str = Field(default="Idle", description="Current truck status (from VehicleStatus)")


# Properties to receive on creation
class TruckCreate(TruckBase):
    pass


# Properties to receive on update
class TruckUpdate(SQLModel):
    plate_number: str | None = Field(default=None, min_length=1, max_length=20)
    make: str | None = Field(default=None, min_length=1, max_length=100)
    model: str | None = Field(default=None, min_length=1, max_length=100)
    status: str | None = Field(default=None)


# Database model
class Truck(TruckBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    plate_number: str = Field(unique=True, index=True, max_length=20)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )


# Properties to return via API
class TruckPublic(TruckBase):
    id: uuid.UUID
    created_at: datetime | None = None


class TrucksPublic(SQLModel):
    data: list[TruckPublic]
    count: int


# ============================================================================
# Driver Models - Story 1.5: Driver Registry Management
# ============================================================================


class DriverStatus(str, Enum):
    """Driver status values - FR-DRIVER-01, extended for Trip workflow"""
    active = "Active"
    assigned = "Assigned"
    on_trip = "On Trip"
    inactive = "Inactive"


# Shared properties
class DriverBase(SQLModel):
    full_name: str = Field(min_length=1, max_length=255, description="Driver's full name")
    license_number: str = Field(min_length=1, max_length=50, description="Unique license number")
    license_expiry_date: datetime | None = Field(default=None, description="License expiration date")
    passport_number: str | None = Field(default=None, max_length=50, description="Passport number")
    passport_expiry_date: datetime | None = Field(default=None, description="Passport expiration date")
    phone_number: str = Field(min_length=1, max_length=50, description="Contact phone number")
    status: DriverStatus = Field(default=DriverStatus.active, description="Current driver status")


# Properties to receive on creation
class DriverCreate(DriverBase):
    pass


# Properties to receive on update
class DriverUpdate(SQLModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    license_number: str | None = Field(default=None, min_length=1, max_length=50)
    license_expiry_date: datetime | None = Field(default=None)
    passport_number: str | None = Field(default=None, max_length=50)
    passport_expiry_date: datetime | None = Field(default=None)
    phone_number: str | None = Field(default=None, min_length=1, max_length=50)
    status: DriverStatus | None = Field(default=None)


# Database model
class Driver(DriverBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    license_number: str = Field(unique=True, index=True, max_length=50)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )


# Properties to return via API
class DriverPublic(DriverBase):
    id: uuid.UUID
    license_expiry_date: datetime | None = None
    passport_number: str | None = None
    passport_expiry_date: datetime | None = None
    created_at: datetime | None = None


class DriversPublic(SQLModel):
    data: list[DriverPublic]
    count: int


# ============================================================================
# Trailer Models - Story 1.6: Trailer Registry Management
# ============================================================================


class TrailerStatus(str, Enum):
    """Trailer status values - FR-TRAILER-01, extended for Trip workflow"""
    idle = "Idle"
    waiting = "Waiting"
    dispatch = "Dispatched"
    wait_to_load = "Arrived at Loading Point"
    loading = "Loading"
    in_transit = "In Transit"
    at_border = "At Border"
    offloaded = "Offloaded"
    returned = "Arrived at Yard"
    waiting_for_pods = "Waiting for PODs"
    maintenance = "Maintenance"


class TrailerType(str, Enum):
    """Trailer type values - FR-TRAILER-01"""
    flatbed = "Flatbed"
    skeleton = "Skeleton"
    box = "Box"
    tanker = "Tanker"
    lowbed = "Lowbed"


# Shared properties
class TrailerBase(SQLModel):
    plate_number: str = Field(min_length=1, max_length=20, description="Unique trailer plate number")
    type: TrailerType = Field(description="Trailer type (Flatbed, Skeleton, Box, Tanker)")
    make: str = Field(min_length=1, max_length=100, description="Trailer manufacturer")
    status: str = Field(default="Idle", description="Current trailer status (from VehicleStatus)")


# Properties to receive on creation
class TrailerCreate(TrailerBase):
    pass


# Properties to receive on update
class TrailerUpdate(SQLModel):
    plate_number: str | None = Field(default=None, min_length=1, max_length=20)
    type: TrailerType | None = Field(default=None)
    make: str | None = Field(default=None, min_length=1, max_length=100)
    status: str | None = Field(default=None)


# Database model
class Trailer(TrailerBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    plate_number: str = Field(unique=True, index=True, max_length=20)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )


# Properties to return via API
class TrailerPublic(TrailerBase):
    id: uuid.UUID
    created_at: datetime | None = None


class TrailersPublic(SQLModel):
    data: list[TrailerPublic]
    count: int


# ============================================================================
# Waybill Models - Story 2.7: Waybill Management
# ============================================================================


class WaybillStatus(str, Enum):
    """Waybill status values - Story 2.7"""
    open = "Open"
    in_progress = "In Progress"
    completed = "Completed"
    invoiced = "Invoiced"


class WaybillBase(SQLModel):
    waybill_number: str = Field(index=True, unique=True, description="Waybill number (WB-YYYY-SEQ)")
    client_name: str = Field(min_length=1, max_length=255, description="Client name")
    description: str = Field(min_length=1, max_length=500, description="Cargo details")
    cargo_type: str | None = Field(default=None, max_length=255, description="Cargo type (e.g. Loose Cargo)")
    weight_kg: float = Field(gt=0, description="Cargo weight in KG")
    origin: str = Field(min_length=1, max_length=255, description="Loading point")
    destination: str = Field(min_length=1, max_length=255, description="Destination")
    expected_loading_date: datetime = Field(description="Expected loading date")
    status: WaybillStatus = Field(default=WaybillStatus.open, description="Current waybill status")
    agreed_rate: Decimal = Field(default=Decimal("0.00"), max_digits=12, decimal_places=2, description="Agreed rate")
    currency: str = Field(default="USD", max_length=3, description="Currency code")
    risk_level: str = Field(default="Low", max_length=20, description="Risk level (Low, Medium, High)")


class WaybillCreate(SQLModel):
    client_name: str = Field(min_length=1, max_length=255, description="Client name")
    description: str = Field(min_length=1, max_length=500, description="Cargo details")
    cargo_type: str | None = Field(default=None, max_length=255, description="Cargo type")
    weight_kg: float = Field(gt=0, description="Cargo weight in KG")
    origin: str = Field(min_length=1, max_length=255, description="Loading point")
    destination: str = Field(min_length=1, max_length=255, description="Destination")
    expected_loading_date: datetime = Field(description="Expected loading date")
    currency: str = Field(default="USD", max_length=3, description="Currency code")
    risk_level: str = Field(default="Low", description="Risk level (Low, Medium, High)")
    border_ids: list[uuid.UUID] | None = Field(default=None, description="Ordered list of border post IDs to cross (Story 2.26)")


class WaybillUpdate(SQLModel):
    client_name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, min_length=1, max_length=500)
    cargo_type: str | None = Field(default=None, max_length=255)
    weight_kg: float | None = Field(default=None, gt=0)
    origin: str | None = Field(default=None, min_length=1, max_length=255)
    destination: str | None = Field(default=None, min_length=1, max_length=255)
    expected_loading_date: datetime | None = Field(default=None)
    status: WaybillStatus | None = Field(default=None)
    agreed_rate: Decimal | None = Field(default=None, max_digits=12, decimal_places=2)
    currency: str | None = Field(default=None, max_length=3)
    risk_level: str | None = Field(default=None)
    border_ids: list[uuid.UUID] | None = Field(default=None, description="Ordered list of border post IDs to cross (Story 2.26)")


class Waybill(WaybillBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    # Audit trail (Story 6.13)
    created_by_id: uuid.UUID | None = Field(default=None, foreign_key="users.id", index=True)
    updated_by_id: uuid.UUID | None = Field(default=None, foreign_key="users.id", index=True)

    created_by: User | None = Relationship(sa_relationship_kwargs={"foreign_keys": "[Waybill.created_by_id]", "lazy": "selectin"})
    updated_by: User | None = Relationship(sa_relationship_kwargs={"foreign_keys": "[Waybill.updated_by_id]", "lazy": "selectin"})


class WaybillPublic(WaybillBase):
    id: uuid.UUID
    created_at: datetime | None = None
    # Audit trail (Story 6.13)
    created_by_id: uuid.UUID | None = None
    updated_by_id: uuid.UUID | None = None
    created_by: UserPublic | None = None
    updated_by: UserPublic | None = None
    # Invoice enrichment (set by API, not from DB column)
    invoice_id: uuid.UUID | None = None
    invoice_number: str | None = None
    invoice_status: str | None = None
    # Trip enrichment (set by API, not from DB column)
    trip_number: str | None = None


class WaybillsPublic(SQLModel):
    data: list[WaybillPublic]
    count: int


# ============================================================================
# Trip Models - Story 2.1: Trip Creation & Dispatch
# ============================================================================


class TripStatus(str, Enum):
    """Trip status values - Story 2.1, extended with return leg in Story 2.25, expanded in Story 2.27"""
    waiting = "Waiting"
    dispatch = "Dispatched"
    wait_to_load = "Arrived at Loading Point"   # renamed from "Waiting for Loading"
    loading = "Loading"
    loaded = "Loaded"                           # Auto-set when loading_end_date recorded
    in_transit = "In Transit"
    at_border = "At Border"
    arrived_at_destination = "Arrived at Destination"   # Manual, fills arrival_offloading_date
    offloading = "Offloading"
    offloaded = "Offloaded"                     # Auto-set when offloading_date is recorded
    returning_empty = "Returning Empty"         # renamed from "Returning to Yard" (no return WB)
    breakdown = "Breakdown"                     # Recoverable breakdown — selectable from any point
    # Return leg statuses — only valid when return_waybill_id is set
    waiting_return = "Waiting (Return)"         # First return status, waiting for return cargo
    dispatch_return = "Dispatched (Return)"
    wait_to_load_return = "Arrived at Loading Point (Return)"  # renamed
    loading_return = "Loading (Return)"
    loaded_return = "Loaded (Return)"           # Auto-set when loading_return_end_date recorded
    in_transit_return = "In Transit (Return)"
    at_border_return = "At Border (Return)"
    arrived_at_destination_return = "Arrived at Destination (Return)"  # Manual, fills arrival_destination_return_date
    offloading_return = "Offloading (Return)"
    offloaded_return = "Offloaded (Return)"     # Auto-set when offloading_return_date recorded
    # End of journey
    returned = "Arrived at Yard"
    waiting_for_pods = "Waiting for PODs"
    completed = "Completed"
    cancelled = "Cancelled"


# Shared properties
class TripBase(SQLModel):
    truck_id: uuid.UUID = Field(foreign_key="truck.id", description="Assigned truck ID")
    trailer_id: uuid.UUID = Field(foreign_key="trailer.id", description="Assigned trailer ID")
    driver_id: uuid.UUID = Field(foreign_key="driver.id", description="Assigned driver ID")
    route_name: str = Field(min_length=1, max_length=255, description="Route description (e.g., Mombasa - Nairobi)")
    trip_number: str = Field(index=True, unique=True, description="Trip number (T<Plate>-YYYY<Seq>)")
    waybill_id: uuid.UUID | None = Field(default=None, foreign_key="waybill.id", description="Link to commercial Waybill (Go leg)")
    return_waybill_id: uuid.UUID | None = Field(default=None, foreign_key="waybill.id", description="Link to return leg Waybill (Story 2.25)")
    current_location: str | None = Field(default=None, description="Current location")
    status: TripStatus = Field(
        default=TripStatus.waiting,
        sa_column=Column(
            SAEnum(TripStatus, values_callable=lambda obj: [e.value for e in obj]),
            nullable=False
        ),
        description="Current trip status"
    )
    is_delayed: bool = Field(default=False, description="Whether the trip is currently delayed")


# Properties to receive on creation
class TripCreate(SQLModel):
    truck_id: uuid.UUID = Field(description="Truck ID to assign")
    trailer_id: uuid.UUID = Field(description="Trailer ID to assign")
    driver_id: uuid.UUID = Field(description="Driver ID to assign")
    route_name: str = Field(min_length=1, max_length=255, description="Route description")
    waybill_id: uuid.UUID | None = Field(default=None, description="Link to commercial Waybill")
    current_location: str | None = Field(default=None, description="Current location")


# Properties to receive on update
class TripUpdate(SQLModel):
    truck_id: uuid.UUID | None = Field(default=None, description="New truck ID (for swap)")
    trailer_id: uuid.UUID | None = Field(default=None, description="New trailer ID (for swap)")
    driver_id: uuid.UUID | None = Field(default=None, description="New driver ID")
    route_name: str | None = Field(default=None, min_length=1, max_length=255)
    waybill_id: uuid.UUID | None = Field(default=None, description="Link to commercial Waybill (Go leg)")
    current_location: str | None = Field(default=None, description="Current location")
    status: TripStatus | None = Field(default=None, description="New status")
    pod_documents: list | None = Field(default=None, description="POD documents list (supports string URLs or {name,url,leg} dicts)")
    # Go leg tracking date fields
    dispatch_date: datetime | None = Field(default=None, description="Date dispatched from yard")
    arrival_loading_date: datetime | None = Field(default=None, description="Arrival at loading point (Wait to Load)")
    loading_start_date: datetime | None = Field(default=None, description="Loading started date")
    loading_end_date: datetime | None = Field(default=None, description="Loading completed date")
    arrival_offloading_date: datetime | None = Field(default=None, description="Arrival at offloading point")
    offloading_date: datetime | None = Field(default=None, description="Offloading completed date")
    arrival_return_date: datetime | None = Field(default=None, description="Date truck returned to yard (home base)")
    # Return leg tracking date fields (Story 2.25)
    dispatch_return_date: datetime | None = Field(default=None, description="Date dispatched for return journey")
    arrival_loading_return_date: datetime | None = Field(default=None, description="Arrival at return loading point")
    loading_return_start_date: datetime | None = Field(default=None, description="Return cargo loading started")
    loading_return_end_date: datetime | None = Field(default=None, description="Return cargo loading completed")
    offloading_return_date: datetime | None = Field(default=None, description="Return cargo offloaded at client destination")
    arrival_destination_return_date: datetime | None = Field(default=None, description="Arrival at return destination (Arrived at Destination (Return))")
    # Cancellation control flags (Story 2.25) — used when status=Cancelled with dual waybills
    cancel_go_waybill: bool | None = Field(default=None, description="Reset go waybill to Open on cancel (default: True)")
    cancel_return_waybill: bool | None = Field(default=None, description="Reset return waybill to Open on cancel (default: True)")
    # Client report fields
    return_empty_container_date: datetime | None = Field(default=None, description="Date empty container was returned")
    remarks: str | None = Field(default=None, description="Go-leg remarks for client report (frozen after offloading)")
    return_remarks: str | None = Field(default=None, description="Return-leg remarks for client report")
    pods_confirmed_date: datetime | None = Field(default=None, description="Date PODs were confirmed — auto-advances trip to Completed")
    is_delayed: bool | None = Field(default=None, description="Set or clear the delayed flag")


# Properties to receive for truck swap
class TripSwapTruck(SQLModel):
    truck_id: uuid.UUID = Field(description="New truck ID for swap")


# Request schema for attaching a return waybill (Story 2.25)
class AttachReturnWaybillRequest(SQLModel):
    return_waybill_id: uuid.UUID = Field(description="Waybill ID to attach as the return leg")


# Database model
class Trip(TripBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    pod_documents: list = Field(default=[], sa_column=Column(JSON))
    attachments: list = Field(default=[], sa_column=Column(JSON), description="Trip-level document attachments (keys in R2 storage)")
    start_date: datetime | None = Field(
        default=None,
        sa_type=DateTime(timezone=True),
    )
    end_date: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    updated_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    # Tracking date fields
    dispatch_date: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    arrival_loading_date: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    loading_start_date: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    loading_end_date: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    arrival_offloading_date: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    offloading_date: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    arrival_return_date: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    trip_duration_days: int | None = Field(default=None, description="Days from dispatch to return")
    # Return leg tracking date fields (Story 2.25)
    dispatch_return_date: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    arrival_loading_return_date: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    loading_return_start_date: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    loading_return_end_date: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    offloading_return_date: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    arrival_destination_return_date: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    # Client report fields
    return_empty_container_date: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    remarks: str | None = Field(default=None)
    return_remarks: str | None = Field(default=None)
    pods_confirmed_date: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))

    # Audit trail (Story 6.13)
    created_by_id: uuid.UUID | None = Field(default=None, foreign_key="users.id", index=True)
    updated_by_id: uuid.UUID | None = Field(default=None, foreign_key="users.id", index=True)

    # Relationships
    truck: Truck | None = Relationship()
    trailer: Trailer | None = Relationship()
    driver: Driver | None = Relationship()
    created_by: User | None = Relationship(sa_relationship_kwargs={"foreign_keys": "[Trip.created_by_id]", "lazy": "selectin"})
    updated_by: User | None = Relationship(sa_relationship_kwargs={"foreign_keys": "[Trip.updated_by_id]", "lazy": "selectin"})


# Properties to return via API
class TripPublic(TripBase):
    id: uuid.UUID
    pod_documents: list = []
    attachments: list = []
    start_date: datetime | None = None
    end_date: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    dispatch_date: datetime | None = None
    arrival_loading_date: datetime | None = None
    loading_start_date: datetime | None = None
    loading_end_date: datetime | None = None
    arrival_offloading_date: datetime | None = None
    offloading_date: datetime | None = None
    arrival_return_date: datetime | None = None
    trip_duration_days: int | None = None
    # Return leg date fields (Story 2.25)
    dispatch_return_date: datetime | None = None
    arrival_loading_return_date: datetime | None = None
    loading_return_start_date: datetime | None = None
    loading_return_end_date: datetime | None = None
    offloading_return_date: datetime | None = None
    arrival_destination_return_date: datetime | None = None
    # Client report fields
    return_empty_container_date: datetime | None = None
    remarks: str | None = None
    return_remarks: str | None = None
    pods_confirmed_date: datetime | None = None
    # Enrichment fields from waybill join (Story 4.6)
    waybill_rate: Decimal | None = None
    waybill_currency: str | None = None
    waybill_risk_level: str | None = None
    return_waybill_rate: Decimal | None = None
    return_waybill_currency: str | None = None
    waybill_number: str | None = None
    return_waybill_number: str | None = None
    return_route_name: str | None = None
    location_update_time: datetime | None = None
    # Audit trail (Story 6.13)
    created_by_id: uuid.UUID | None = None
    updated_by_id: uuid.UUID | None = None


# Trip with nested entities for detailed views
class TripPublicDetailed(TripPublic):
    truck: TruckPublic | None = None
    trailer: TrailerPublic | None = None
    driver: DriverPublic | None = None
    created_by: UserPublic | None = None
    updated_by: UserPublic | None = None


class TripsPublic(SQLModel):
    data: list[TripPublic]
    count: int


# ============================================================================
# Expense Models - Story 2.2: Expense Request Submission
# ============================================================================


class ExpenseStatus(str, Enum):
    """Expense request status values - Story 2.2"""
    pending_manager = "Pending Manager"
    pending_finance = "Pending Finance"
    paid = "Paid"
    rejected = "Rejected"
    returned = "Returned"
    voided = "Voided"


class ExpenseCategory(str, Enum):
    """Expense category values - Story 2.2"""
    fuel = "Fuel"
    allowance = "Allowance"
    maintenance = "Maintenance"
    office = "Office"
    border = "Border"
    other = "Other"


class PaymentMethod(str, Enum):
    """Payment method values - Story 2.4"""
    cash = "CASH"
    transfer = "TRANSFER"


# Shared properties
class ExpenseRequestBase(SQLModel):
    expense_number: str | None = Field(default=None, index=True, unique=True, description="Human-readable expense number (E<TripNumber><Seq> or EXP-YYYY-SEQ)")
    trip_id: uuid.UUID | None = Field(default=None, foreign_key="trip.id", description="Associated trip ID (optional for office expenses)")
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2, description="Expense amount")
    currency: str = Field(default="TZS", max_length=3, description="Currency code (TZS or USD)")
    exchange_rate: Decimal | None = Field(default=None, max_digits=12, decimal_places=2, description="Exchange rate snapshot (1 USD = X TZS)")
    category: ExpenseCategory = Field(description="Expense category")
    description: str = Field(min_length=1, max_length=500, description="Expense description")
    status: ExpenseStatus = Field(default=ExpenseStatus.pending_manager, description="Current expense status")
    manager_comment: str | None = Field(default=None, max_length=500, description="Comment from manager/finance")
    payment_method: PaymentMethod | None = Field(default=None, description="Payment method (CASH or TRANSFER)")
    payment_reference: str | None = Field(default=None, max_length=255, description="Payment reference (required for transfers)")
    payment_date: datetime | None = Field(default=None, sa_type=DateTime(timezone=True), description="Date payment was processed")
    paid_by_id: uuid.UUID | None = Field(default=None, foreign_key="users.id", description="User who processed the payment")
    approved_by_id: uuid.UUID | None = Field(default=None, foreign_key="users.id", description="User who approved the expense")
    approved_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True), description="Date expense was approved")
    voided_by_id: uuid.UUID | None = Field(default=None, foreign_key="users.id", description="User who voided the expense")
    voided_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True), description="Date expense was voided")
    void_reason: str | None = Field(default=None, max_length=500, description="Reason for voiding the expense")
    returned_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True), description="Date expense was last returned for revision")
    expense_metadata: dict | None = Field(default=None, description="Additional expense metadata (item details, payment info, etc.)")
    attachments: list[str] | None = Field(default=[], description="List of URLs for attached receipts/documents")


# Properties to receive on creation
class ExpenseRequestCreate(SQLModel):
    trip_id: uuid.UUID | None = Field(default=None, description="Associated trip ID (optional)")
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2, description="Expense amount")
    category: ExpenseCategory = Field(description="Expense category")
    description: str = Field(min_length=1, max_length=500, description="Expense description")
    currency: str = Field(default="TZS", max_length=3, description="Currency code (TZS or USD)")
    exchange_rate: Decimal | None = Field(default=None, max_digits=12, decimal_places=2, description="Exchange rate snapshot at creation")
    expense_metadata: dict | None = Field(default=None, description="Additional expense metadata")


# Properties to receive on update
class ExpenseRequestUpdate(SQLModel):
    amount: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)
    category: ExpenseCategory | None = Field(default=None)
    description: str | None = Field(default=None, min_length=1, max_length=500)
    status: ExpenseStatus | None = Field(default=None)
    expense_metadata: dict | None = Field(default=None)


# Database model
class ExpenseRequest(ExpenseRequestBase, table=True):
    __tablename__ = "expense_request"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    amount: Decimal = Field(sa_column=Column(Numeric(12, 2), nullable=False))
    expense_metadata: dict | None = Field(default=None, sa_column=Column(JSON))
    attachments: list[str] = Field(default=[], sa_column=Column(JSON))
    created_by_id: uuid.UUID = Field(foreign_key="users.id", description="User who created the expense")
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    updated_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )

    # Audit trail (Story 6.13)
    updated_by_id: uuid.UUID | None = Field(default=None, foreign_key="users.id")

    # Relationships
    trip: Trip | None = Relationship(sa_relationship_kwargs={"foreign_keys": "[ExpenseRequest.trip_id]"})
    created_by: User | None = Relationship(sa_relationship_kwargs={"foreign_keys": "[ExpenseRequest.created_by_id]"})
    updated_by: User | None = Relationship(sa_relationship_kwargs={"foreign_keys": "[ExpenseRequest.updated_by_id]"})
    paid_by: User | None = Relationship(sa_relationship_kwargs={"foreign_keys": "[ExpenseRequest.paid_by_id]"})
    approved_by: User | None = Relationship(sa_relationship_kwargs={"foreign_keys": "[ExpenseRequest.approved_by_id]"})
    voided_by: User | None = Relationship(sa_relationship_kwargs={"foreign_keys": "[ExpenseRequest.voided_by_id]"})


# Properties to return via API
class ExpenseRequestPublic(ExpenseRequestBase):
    id: uuid.UUID
    created_by_id: uuid.UUID
    created_at: datetime | None = None
    updated_at: datetime | None = None


# Expense with nested entities for detailed views
class ExpenseRequestPublicDetailed(ExpenseRequestPublic):
    trip: TripPublic | None = None
    created_by: UserPublic | None = None
    updated_by: UserPublic | None = None
    paid_by: UserPublic | None = None
    approved_by: UserPublic | None = None
    voided_by: UserPublic | None = None


class ExpenseRequestsPublic(SQLModel):
    data: list[ExpenseRequestPublicDetailed]
    count: int


class ExpenseBulkUpdate(SQLModel):
    ids: list[uuid.UUID]
    status: ExpenseStatus
    comment: str | None = Field(default=None, description="Optional comment for the action")


class ExpensePayment(SQLModel):
    """Schema for processing a payment - Story 2.4"""
    method: PaymentMethod = Field(description="Payment method: CASH or TRANSFER")
    reference: str | None = Field(default=None, max_length=255, description="Reference number (required for TRANSFER)")
    bank_name: str | None = Field(default=None, max_length=255, description="Bank name")
    account_name: str | None = Field(default=None, max_length=255, description="Account holder name")
    account_no: str | None = Field(default=None, max_length=100, description="Bank account number")


# ============================================================================
# Exchange Rate Models - Story 2.14: Multi-Currency Support
# ============================================================================


class ExchangeRateBase(SQLModel):
    month: int = Field(ge=1, le=12, description="Month (1-12)")
    year: int = Field(ge=2020, le=2100, description="Year")
    rate: Decimal = Field(gt=0, max_digits=12, decimal_places=2, description="1 USD = X TZS")


class ExchangeRateCreate(ExchangeRateBase):
    pass


class ExchangeRateUpdate(SQLModel):
    rate: Decimal = Field(gt=0, max_digits=12, decimal_places=2, description="1 USD = X TZS")


class ExchangeRate(ExchangeRateBase, table=True):
    __tablename__ = "exchange_rate"
    __table_args__ = (
        UniqueConstraint("month", "year", name="uq_exchange_rate_month_year"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    rate: Decimal = Field(sa_column=Column(Numeric(12, 2), nullable=False))
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),
    )


class ExchangeRatePublic(ExchangeRateBase):
    id: uuid.UUID
    created_at: datetime | None = None


class ExchangeRatesPublic(SQLModel):
    data: list[ExchangeRatePublic]
    count: int


# ============================================================================
# Transport Master Data Models - Story 2.8: Basic Settings
# ============================================================================


# --- Country & City (Hierarchical Locations) ---

class CountryBase(SQLModel):
    name: str = Field(unique=True, index=True, min_length=1, max_length=255, description="Country name")
    code: str | None = Field(default=None, min_length=2, max_length=10, description="ISO Country Code")
    sorting: int = Field(default=10, description="Sorting order")


class CountryCreate(CountryBase):
    pass


class CountryUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    code: str | None = Field(default=None, min_length=2, max_length=10)
    sorting: int | None = Field(default=None)


class Country(CountryBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    
    # Relationships
    cities: list["City"] = Relationship(back_populates="country", cascade_delete=True)


class CountryPublic(CountryBase):
    id: uuid.UUID
    created_at: datetime | None = None


class CountriesPublic(SQLModel):
    data: list[CountryPublic]
    count: int


class CityBase(SQLModel):
    name: str = Field(index=True, min_length=1, max_length=255, description="City name")
    country_id: uuid.UUID = Field(foreign_key="country.id", description="Country ID")
    sorting: int = Field(default=10, description="Sorting order")


class CityCreate(CityBase):
    pass


class CityUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    country_id: uuid.UUID | None = Field(default=None)
    sorting: int | None = Field(default=None)


class City(CityBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    
    # Relationships
    country: Country | None = Relationship(back_populates="cities")


class CityPublic(CityBase):
    id: uuid.UUID
    created_at: datetime | None = None
    country: CountryPublic | None = None


class CitiesPublic(SQLModel):
    data: list[CityPublic]
    count: int




# --- Cargo Type ---

class CargoTypeBase(SQLModel):
    name: str = Field(min_length=1, max_length=255, description="Cargo type name (e.g. Container 40ft)")
    description: str | None = Field(default=None, max_length=500, description="Cargo type description")


class CargoTypeCreate(CargoTypeBase):
    pass


class CargoTypeUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=500)


class CargoType(CargoTypeBase, table=True):
    __tablename__ = "cargo_type"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str = Field(unique=True, index=True, max_length=255)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )


class CargoTypePublic(CargoTypeBase):
    id: uuid.UUID
    created_at: datetime | None = None


class CargoTypesPublic(SQLModel):
    data: list[CargoTypePublic]
    count: int


# --- Vehicle Status ---

class VehicleStatusBase(SQLModel):
    name: str = Field(min_length=1, max_length=255, description="Status name (e.g. Waiting Offloading)")
    description: str | None = Field(default=None, max_length=500, description="Status description")
    is_active: bool = Field(default=True, description="Whether this status is currently active")


class VehicleStatusCreate(VehicleStatusBase):
    pass


class VehicleStatusUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=500)
    is_active: bool | None = Field(default=None)


class VehicleStatus(VehicleStatusBase, table=True):
    __tablename__ = "vehicle_status"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str = Field(unique=True, index=True, max_length=255)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )


class VehicleStatusPublic(VehicleStatusBase):
    id: uuid.UUID
    created_at: datetime | None = None


class VehicleStatusesPublic(SQLModel):
    data: list[VehicleStatusPublic]
    count: int


# --- Client ---

class ClientBase(SQLModel):
    system_id: str = Field(unique=True, index=True, description="System-generated client ID")
    name: str = Field(index=True, min_length=1, max_length=255, description="Client name")
    tin: str | None = Field(default=None, max_length=50, description="Tax Identification Number")


class ClientCreate(ClientBase):
    pass


class ClientUpdate(SQLModel):
    system_id: str | None = Field(default=None)
    name: str | None = Field(default=None, min_length=1, max_length=255)
    tin: str | None = Field(default=None, max_length=50)


class Client(ClientBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    updated_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )


class ClientPublic(ClientBase):
    id: uuid.UUID
    created_at: datetime | None = None


class ClientsPublic(SQLModel):
    data: list[ClientPublic]
    count: int


# ============================================================================
# Maintenance Models - Story 3.1: Maintenance Event Logging
# ============================================================================

class MaintenanceEventBase(SQLModel):
    truck_id: uuid.UUID | None = Field(default=None, foreign_key="truck.id", description="Truck receiving maintenance")
    trailer_id: uuid.UUID | None = Field(default=None, foreign_key="trailer.id", description="Trailer receiving maintenance")
    garage_name: str = Field(min_length=1, max_length=255, description="Garage/Service Provider name")
    description: str = Field(min_length=1, max_length=500, description="Maintenance details")
    start_date: datetime = Field(description="Date maintenance started")
    end_date: datetime | None = Field(default=None, description="Date maintenance completed")
    currency: str = Field(default="USD", max_length=3, description="Currency code (TZS or USD)")

class MaintenanceEventCreate(MaintenanceEventBase):
    cost: Decimal = Field(gt=0, max_digits=12, decimal_places=2, description="Total cost")
    update_truck_status: bool = Field(default=False, description="Set truck status to Maintenance")
    update_trailer_status: bool = Field(default=False, description="Set trailer status to Maintenance")

class MaintenanceEventUpdate(SQLModel):
    truck_id: uuid.UUID | None = Field(default=None)
    trailer_id: uuid.UUID | None = Field(default=None)
    garage_name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, min_length=1, max_length=500)
    start_date: datetime | None = Field(default=None)
    end_date: datetime | None = Field(default=None)
    cost: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)
    currency: str | None = Field(default=None, max_length=3)

class MaintenanceEvent(MaintenanceEventBase, table=True):
    __tablename__ = "maintenance_event"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    expense_id: uuid.UUID = Field(foreign_key="expense_request.id", description="Associated expense request")
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    updated_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )

    # Relationships
    truck: Truck | None = Relationship()
    trailer: Trailer | None = Relationship()
    expense: ExpenseRequest | None = Relationship()

class MaintenanceEventPublic(MaintenanceEventBase):
    id: uuid.UUID
    expense_id: uuid.UUID
    created_at: datetime | None = None
    updated_at: datetime | None = None
    expense: ExpenseRequestPublic | None = None

class MaintenanceEventsPublic(SQLModel):
    data: list[MaintenanceEventPublic]
    count: int


class MaintenanceHistoryPublic(SQLModel):
    """Response model for truck maintenance history with cost summary."""
    data: list[MaintenanceEventPublic]
    count: int
    total_maintenance_cost: Decimal = Decimal("0.00")


# ============================================================================
# Trip Expense Type Models - Story 2.19: Trip Expense Master Data
# ============================================================================


class TripExpenseTypeBase(SQLModel):
    name: str = Field(min_length=1, max_length=255, description="Expense type name (e.g., Abnormal Permit (Zimbabwe))")
    category: str = Field(min_length=1, max_length=100, description="Expense category (e.g., Cargo Charges)")
    is_active: bool = Field(default=True, description="Whether this expense type is active")


class TripExpenseTypeCreate(TripExpenseTypeBase):
    pass


class TripExpenseTypeUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    category: str | None = Field(default=None, min_length=1, max_length=100)
    is_active: bool | None = Field(default=None)


class TripExpenseType(TripExpenseTypeBase, table=True):
    __tablename__ = "trip_expense_type"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str = Field(unique=True, index=True, max_length=255)
    category: str = Field(index=True, max_length=100)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),
    )


class TripExpenseTypePublic(TripExpenseTypeBase):
    id: uuid.UUID
    created_at: datetime | None = None


class TripExpenseTypesPublic(SQLModel):
    data: list[TripExpenseTypePublic]
    count: int


# ============================================================================
# Office Expense Type Models - Story 2.22: Office Expense Master Data
# ============================================================================


class OfficeExpenseTypeBase(SQLModel):
    name: str = Field(unique=True, index=True, min_length=1, max_length=255, description="Office expense type name")
    category: str = Field(min_length=1, max_length=100, description="Expense category (e.g., Office, Salary, Tax)")
    description: str | None = Field(default=None, max_length=500, description="Description")
    is_active: bool = Field(default=True, description="Whether this expense type is active")


class OfficeExpenseTypeCreate(OfficeExpenseTypeBase):
    pass


class OfficeExpenseTypeUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    category: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    is_active: bool | None = Field(default=None)


class OfficeExpenseType(OfficeExpenseTypeBase, table=True):
    __tablename__ = "office_expense_type"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    category: str = Field(index=True, max_length=100)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),
    )


class OfficeExpenseTypePublic(OfficeExpenseTypeBase):
    id: uuid.UUID
    created_at: datetime | None = None


class OfficeExpenseTypesPublic(SQLModel):
    data: list[OfficeExpenseTypePublic]
    count: int


# ============================================================================
# Border Post Models - Story 2.26: Border Crossing Tracking
# ============================================================================


class BorderPostBase(SQLModel):
    display_name: str = Field(min_length=1, max_length=255, description="Display name e.g. 'Tunduma / Nakonde'")
    side_a_name: str = Field(min_length=1, max_length=255, description="Side A (go-direction first contact, e.g. 'Tunduma')")
    side_b_name: str = Field(min_length=1, max_length=255, description="Side B (return-direction first contact, e.g. 'Nakonde')")
    is_active: bool = Field(default=True, description="Whether this border post is active")


class BorderPostCreate(BorderPostBase):
    pass


class BorderPostUpdate(SQLModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=255)
    side_a_name: str | None = Field(default=None, min_length=1, max_length=255)
    side_b_name: str | None = Field(default=None, min_length=1, max_length=255)
    is_active: bool | None = Field(default=None)


class BorderPost(BorderPostBase, table=True):
    __tablename__ = "border_post"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),
    )


class BorderPostPublic(BorderPostBase):
    id: uuid.UUID
    created_at: datetime | None = None


class BorderPostsPublic(SQLModel):
    data: list[BorderPostPublic]
    count: int


# ============================================================================
# Waybill Border Junction - Story 2.26
# ============================================================================


class WaybillBorder(SQLModel, table=True):
    __tablename__ = "waybill_border"
    __table_args__ = (
        UniqueConstraint("waybill_id", "border_post_id", name="uq_waybill_border"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    waybill_id: uuid.UUID = Field(foreign_key="waybill.id", description="Linked waybill")
    border_post_id: uuid.UUID = Field(foreign_key="border_post.id", description="Border post")
    sequence: int = Field(description="1-based crossing order for this waybill")


class WaybillBorderPublic(SQLModel):
    id: uuid.UUID
    waybill_id: uuid.UUID
    border_post_id: uuid.UUID
    sequence: int
    border_post: BorderPostPublic | None = None


# ============================================================================
# Trip Border Crossing - Story 2.26
# ============================================================================


class TripBorderCrossingUpsert(SQLModel):
    direction: str = Field(max_length=10, description="'go' or 'return'")
    arrived_side_a_at: datetime | None = None
    documents_submitted_side_a_at: datetime | None = None
    documents_cleared_side_a_at: datetime | None = None
    arrived_side_b_at: datetime | None = None  # "Crossing Side A (= Arrive Side B)"
    departed_border_at: datetime | None = None


class TripBorderCrossing(SQLModel, table=True):
    __tablename__ = "trip_border_crossing"
    __table_args__ = (
        Index("ix_trip_border_crossing_lookup", "trip_id", "border_post_id", "direction"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    trip_id: uuid.UUID = Field(foreign_key="trip.id", description="Linked trip")
    border_post_id: uuid.UUID = Field(foreign_key="border_post.id", description="Border post")
    direction: str = Field(max_length=10, description="'go' or 'return'")
    # 5 progressive date stamps (side-B doc fields removed — not collected)
    arrived_side_a_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    documents_submitted_side_a_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    documents_cleared_side_a_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    arrived_side_b_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))  # Crossing Side A (= Arrive Side B)
    departed_border_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    created_at: datetime | None = Field(default_factory=get_datetime_utc, sa_type=DateTime(timezone=True))
    updated_at: datetime | None = Field(default_factory=get_datetime_utc, sa_type=DateTime(timezone=True))


class TripBorderCrossingPublic(SQLModel):
    id: uuid.UUID
    trip_id: uuid.UUID
    border_post_id: uuid.UUID
    direction: str
    arrived_side_a_at: datetime | None = None
    documents_submitted_side_a_at: datetime | None = None
    documents_cleared_side_a_at: datetime | None = None
    arrived_side_b_at: datetime | None = None  # Crossing Side A (= Arrive Side B)
    departed_border_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    border_post: BorderPostPublic | None = None


# ============================================================================
# Invoice Models — Invoice Generation & Payment Verification
# ============================================================================


class InvoiceStatus(str, Enum):
    """Invoice lifecycle statuses"""
    draft = "draft"
    issued = "issued"
    partially_paid = "partially_paid"
    fully_paid = "fully_paid"
    voided = "voided"


class InvoiceBase(SQLModel):
    invoice_number: str | None = Field(default=None, index=True, unique=True, description="Active display number for live invoices")
    archived_invoice_number: str | None = Field(default=None, max_length=50, description="Archived snapshot of a released invoice number")
    invoice_seq: int = Field(description="Sequential integer for auto-increment")
    date: str = Field(max_length=10, description="Invoice date ISO: YYYY-MM-DD")
    due_date: str | None = Field(default=None, max_length=10, description="Optional payment due date")
    status: InvoiceStatus = Field(default=InvoiceStatus.draft, description="Invoice lifecycle status")

    # Company (static, from system settings)
    company_name: str = Field(default="NABLAFLEET COMPANY LIMITED", max_length=255)
    company_address: str = Field(default="P.O.Box 999, Dar es Salaam, Tanzania", max_length=500)
    company_tin: str = Field(default="168883285", max_length=50)
    company_phone: str = Field(default="+255 718 478 666", max_length=50)
    company_email: str = Field(default="info@nablafleetcompany.com", max_length=255)

    # Customer
    customer_name: str = Field(max_length=255, description="Customer company name")
    customer_tin: str = Field(default="", max_length=50, description="Customer TIN")
    client_id: uuid.UUID | None = Field(default=None, foreign_key="client.id", description="FK to Client record")
    regarding: str = Field(default="TRANSPORTATION", max_length=255)

    # Financial
    currency: str = Field(default="USD", max_length=3, description="Base currency")
    vat_rate: Decimal = Field(default=Decimal("0"), max_digits=5, decimal_places=2, description="VAT percentage")
    exchange_rate: Decimal = Field(default=Decimal("0"), max_digits=12, decimal_places=2, description="TZS per USD")
    subtotal: Decimal = Field(default=Decimal("0"), max_digits=12, decimal_places=2)
    vat_amount: Decimal = Field(default=Decimal("0"), max_digits=12, decimal_places=2)
    total_usd: Decimal = Field(default=Decimal("0"), max_digits=12, decimal_places=2)
    total_tzs: Decimal = Field(default=Decimal("0"), max_digits=14, decimal_places=2)

    # Payment tracking (computed from payments — Phase 2)
    amount_paid: Decimal = Field(default=Decimal("0"), max_digits=12, decimal_places=2)
    amount_outstanding: Decimal = Field(default=Decimal("0"), max_digits=12, decimal_places=2)

    # References
    waybill_id: uuid.UUID | None = Field(default=None, foreign_key="waybill.id", description="One invoice per waybill")
    trip_id: uuid.UUID | None = Field(default=None, foreign_key="trip.id", description="Linked trip")


class Invoice(InvoiceBase, table=True):
    __table_args__ = (
        UniqueConstraint("waybill_id", name="uq_invoice_waybill"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)

    # JSON columns
    items: list = Field(default=[], sa_column=Column(JSON))
    bank_details_tzs: dict = Field(default={}, sa_column=Column(JSON))
    bank_details_usd: dict = Field(default={}, sa_column=Column(JSON))

    # Numeric columns needing explicit SA types for precision
    vat_rate: Decimal = Field(default=Decimal("0"), sa_column=Column(Numeric(5, 2), nullable=False))
    exchange_rate: Decimal = Field(default=Decimal("0"), sa_column=Column(Numeric(12, 2), nullable=False))
    subtotal: Decimal = Field(default=Decimal("0"), sa_column=Column(Numeric(12, 2), nullable=False))
    vat_amount: Decimal = Field(default=Decimal("0"), sa_column=Column(Numeric(12, 2), nullable=False))
    total_usd: Decimal = Field(default=Decimal("0"), sa_column=Column(Numeric(12, 2), nullable=False))
    total_tzs: Decimal = Field(default=Decimal("0"), sa_column=Column(Numeric(14, 2), nullable=False))
    amount_paid: Decimal = Field(default=Decimal("0"), sa_column=Column(Numeric(12, 2), nullable=False))
    amount_outstanding: Decimal = Field(default=Decimal("0"), sa_column=Column(Numeric(12, 2), nullable=False))

    # Audit trail
    created_by_id: uuid.UUID | None = Field(default=None, foreign_key="users.id", index=True)
    updated_by_id: uuid.UUID | None = Field(default=None, foreign_key="users.id", index=True)
    issued_by_id: uuid.UUID | None = Field(default=None, foreign_key="users.id", index=True)
    issued_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    created_at: datetime | None = Field(default_factory=get_datetime_utc, sa_type=DateTime(timezone=True))
    updated_at: datetime | None = Field(default_factory=get_datetime_utc, sa_type=DateTime(timezone=True))

    # Relationships
    created_by: User | None = Relationship(sa_relationship_kwargs={"foreign_keys": "[Invoice.created_by_id]", "lazy": "selectin"})
    updated_by: User | None = Relationship(sa_relationship_kwargs={"foreign_keys": "[Invoice.updated_by_id]", "lazy": "selectin"})
    issued_by: User | None = Relationship(sa_relationship_kwargs={"foreign_keys": "[Invoice.issued_by_id]", "lazy": "selectin"})
    payments: list["InvoicePayment"] = Relationship(back_populates="invoice")


class InvoiceCreate(SQLModel):
    """Used for manual invoice creation (rarely needed — prefer from-waybill endpoint)."""
    date: str = Field(max_length=10)
    customer_name: str = Field(min_length=1, max_length=255)
    customer_tin: str = Field(default="", max_length=50)
    client_id: uuid.UUID | None = None
    regarding: str = Field(default="TRANSPORTATION", max_length=255)
    currency: str = Field(default="USD", max_length=3)
    vat_rate: Decimal = Field(default=Decimal("0"), max_digits=5, decimal_places=2)
    exchange_rate: Decimal = Field(default=Decimal("0"), max_digits=12, decimal_places=2)
    items: list = Field(default=[])
    waybill_id: uuid.UUID | None = None
    trip_id: uuid.UUID | None = None


class InvoiceUpdate(SQLModel):
    """Fields editable while invoice is in draft status."""
    invoice_number: str | None = Field(default=None, min_length=1, max_length=50, description="Manually entered invoice number")
    date: str | None = Field(default=None, max_length=10)
    due_date: str | None = Field(default=None, max_length=10)
    customer_name: str | None = Field(default=None, min_length=1, max_length=255)
    customer_tin: str | None = Field(default=None, max_length=50)
    regarding: str | None = Field(default=None, max_length=255)
    currency: str | None = Field(default=None, max_length=3)
    vat_rate: Decimal | None = Field(default=None, max_digits=5, decimal_places=2)
    exchange_rate: Decimal | None = Field(default=None, max_digits=12, decimal_places=2)
    items: list | None = None


class InvoicePublic(InvoiceBase):
    id: uuid.UUID
    items: list = []
    bank_details_tzs: dict = {}
    bank_details_usd: dict = {}
    created_by_id: uuid.UUID | None = None
    updated_by_id: uuid.UUID | None = None
    issued_by_id: uuid.UUID | None = None
    issued_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    created_by: UserPublic | None = None
    updated_by: UserPublic | None = None
    issued_by: UserPublic | None = None
    # Enrichment fields (resolved in route)
    waybill_number: str | None = None
    trip_number: str | None = None


class InvoicesPublic(SQLModel):
    data: list[InvoicePublic]
    count: int


# ============================================================================
# Invoice Payment Models — Phase 2: Payment Recording
# ============================================================================


class PaymentType(str, Enum):
    """Invoice payment types"""
    full = "full"
    advance = "advance"
    balance = "balance"


class InvoicePayment(SQLModel, table=True):
    __tablename__ = "invoice_payment"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    invoice_id: uuid.UUID = Field(foreign_key="invoice.id", index=True)
    payment_type: PaymentType = Field(sa_type=SAEnum(PaymentType, name="payment_type"))
    amount: Decimal = Field(max_digits=12, decimal_places=2, sa_type=Numeric(12, 2))
    currency: str = Field(default="USD", max_length=3)
    payment_date: datetime = Field(sa_type=DateTime(timezone=True))
    reference: str | None = Field(default=None, max_length=255)
    notes: str | None = Field(default=None, max_length=500)
    verified_by_id: uuid.UUID | None = Field(default=None, foreign_key="users.id", index=True)
    attachments: list = Field(default=[], sa_column=Column(JSON), description="POP attachment storage keys in R2")
    created_at: datetime | None = Field(default_factory=get_datetime_utc, sa_type=DateTime(timezone=True))
    updated_at: datetime | None = Field(default_factory=get_datetime_utc, sa_type=DateTime(timezone=True))

    # Relationships
    invoice: Invoice | None = Relationship(back_populates="payments")
    verified_by: User | None = Relationship(sa_relationship_kwargs={"foreign_keys": "[InvoicePayment.verified_by_id]", "lazy": "selectin"})


class InvoicePaymentCreate(SQLModel):
    """Input for recording an invoice payment."""
    payment_type: PaymentType
    amount: Decimal = Field(ge=Decimal("0.01"))
    currency: str = Field(default="USD", max_length=3)
    payment_date: datetime
    reference: str | None = Field(default=None, max_length=255)
    notes: str | None = Field(default=None, max_length=500)


class InvoicePaymentPublic(SQLModel):
    id: uuid.UUID
    invoice_id: uuid.UUID
    payment_type: PaymentType
    amount: Decimal
    currency: str
    payment_date: datetime
    reference: str | None = None
    notes: str | None = None
    verified_by_id: uuid.UUID | None = None
    verified_by: UserPublic | None = None
    attachments: list = []
    created_at: datetime | None = None
    updated_at: datetime | None = None


class InvoicePaymentsPublic(SQLModel):
    data: list[InvoicePaymentPublic]
    count: int


# Company Settings — Story 9.2
class CompanySettingsBase(SQLModel):
    bank_name_tzs: str = Field(default="CRDB BANK - AZIKIWE BRANCH", max_length=255)
    bank_account_tzs: str = Field(default="015C001CVAW00", max_length=100)
    bank_account_name: str = Field(default="NABLAFLEET COMPANY LIMITED", max_length=255)
    bank_currency_tzs: str = Field(default="Tanzanian Shilling", max_length=50)
    bank_name_usd: str = Field(default="CRDB BANK - AZIKIWE BRANCH", max_length=255)
    bank_account_usd: str = Field(default="025C001CVAW00", max_length=100)
    bank_currency_usd: str = Field(default="USD", max_length=50)


class CompanySettingsCreate(CompanySettingsBase):
    pass


class CompanySettingsUpdate(SQLModel):
    bank_name_tzs: str | None = Field(default=None, max_length=255)
    bank_account_tzs: str | None = Field(default=None, max_length=100)
    bank_account_name: str | None = Field(default=None, max_length=255)
    bank_currency_tzs: str | None = Field(default=None, max_length=50)
    bank_name_usd: str | None = Field(default=None, max_length=255)
    bank_account_usd: str | None = Field(default=None, max_length=100)
    bank_currency_usd: str | None = Field(default=None, max_length=50)


class CompanySettings(CompanySettingsBase, table=True):
    __tablename__ = "company_settings"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    updated_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    updated_by_id: uuid.UUID | None = Field(default=None, foreign_key="users.id", ondelete="SET NULL")


class CompanySettingsPublic(CompanySettingsBase):
    id: uuid.UUID
    updated_at: datetime | None = None
    updated_by_id: uuid.UUID | None = None
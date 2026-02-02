# Story 2.8: Transport Master Data (Basic Settings)

**Epic:** 2 - Core Logistics Cycle
**Story Key:** 2-8-transport-master-data
**Status:** completed

## 1. User Story

**As an** Admin / Ops Manager,
**I want** to manage "Basic Transportation Data" (Locations, Cargo Types, Vehicle Statuses),
**So that** users can select from standard, pre-filled options when creating Trips and Waybills, reducing errors and typing.

## 2. Acceptance Criteria (BDD)

### Scenario 1: Manage Locations (Country & City Hierarchy)
**Given** I am on the "Country and City" settings page
**When** I view the list, I see Countries (e.g., "Zambia", "Tanzania") as top-level items
**And** I expand "Zambia"
**Then** I see the list of Cities (e.g., "Lusaka", "Ndola") nested under it.
**When** I click "Add City" on the "Zambia" row
**Then** the "Country" field is auto-locked to "Zambia" and I only enter the City Name.

### Scenario 2: Manage Cargo Types
**Given** I am on the "Cargo Type" settings page
**When** I list types like "20' Container", "Loose Cargo", "Hazardous"
**Then** these options appear in the "Cargo Type" selector.

### Scenario 3: Manage Vehicle Statuses
**Given** I am on the "Vehicle Status" settings page
**When** I add statuses like "Waiting Offloading", "Delivering", "Customs Clearance"
**Then** these options become available options for the "Current Location/Status" update on a Trip.

## 3. Technical Requirements

### 🏗️ Data Models

```python
class Country(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True) # e.g. "Zambia"
    code: str | None # Creation: Manual Input or Pre-seeded (ISO 3166 Standard, e.g. "ZMB")
                     # Usage: Dashboard filters, concise table display, and border documents.
    sorting: int = Field(default=10)

class City(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(index=True) # e.g. "Lusaka"
    country_id: int = Field(foreign_key="country.id")
    sorting: int = Field(default=10)
    # Relationship to Country
    country: Country | None = Relationship()

class CargoType(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(unique=True) # e.g. "Container 40ft"
    description: str | None

class VehicleStatus(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(unique=True) # e.g. "Waiting Offloading"
    description: str | None
    is_active: bool = True

# Future: ExpenseDescription model
```

### 🔗 Integration
*   **Waybill Form:** Use `Location` table to populate "Origin" and "Destination" Autocomplete/Select fields.
*   **Waybill Form:** Use `CargoType` table to populate "Cargo Type" dropdown.

## 4. Tasks / Subtasks

- [x] Backend: Master Data Models
    - [x] Create `Country` model & CRUD API
    - [x] Create `City` model & CRUD API (with foreign key)
    - [x] Create `CargoType` model & CRUD API
    - [x] Create `VehicleStatus` model & CRUD API
    - [x] Implementation: Seed initial data (Migrate to Country/City structure using cities.txt)
- [x] Frontend: Settings Pages
    - [x] Page: `settings/transport/locations` (Refactor to Tree Table - Country/City)
    - [x] Page: `settings/transport/cargo-types` (Table with Add/Edit)
    - [x] Page: `settings/transport/vehicle-statuses` (Table with Add/Edit)
- [x] Frontend: Integration
    - [x] Update Waybill Form to fetch `Cities` for autofill
    - [x] **Interaction Rule:** Dropdown options must display as `"City Name, Country Name"` (e.g., "Lusaka, Zambia") to provide context, while the backend saves the `City ID`.
- [x] Frontend: Trip Status Integration (Scenario 3)
    - [x] Add "Update Status" modal to Trip Detail page
    - [x] Use `VehicleStatus` and `City` tables for autofill options

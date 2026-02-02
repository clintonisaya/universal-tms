# Story 2.7: Waybill Management

**Epic:** 2 - Core Logistics Cycle
**Story Key:** 2-7-waybill-management
**Status:** completed

## 1. User Story

**As an** Ops Manager,
**I want** to manage Waybills separately from physical Trips,
**So that** I can track customer orders, cargo details, and revenue independently of the specific truck execution.

**As an** Ops Officer,
**I want** the system to automatically generate a professional Waybill Number (e.g., `WB-2026-001`),
**So that** I don't have to manually create valid identifiers.

## 2. Acceptance Criteria (BDD)

### Scenario 1: Create Waybill
**Given** I am on the "New Waybill" page
**When** I enter:
    - Client: "Africa Walk..."
    - Cargo Type: "Loose Cargo"
    - Weight: "30 Tons"
    - Loading Point: "Dar es Salaam Port"
    - Destination: "Lusaka, Zambia"
    - Rates/Revenue: "3500 USD"
**And** I submit the form
**Then** a new Waybill is created
**And** a **Waybill Number** is auto-generated (e.g., `WB-2026-001`)
**And** the status is "Open" or "Pending Dispatch"

### Scenario 2: Dispatch Trip from Waybill
**Given** an existing Waybill `WB-2026-001` (Status: Open)
**When** I click "Create Trip" from this Waybill
**Then** I am taken to the "New Trip" form
**And** the Waybill is automatically linked
**And** the Route/Cargo details are pre-filled

## 3. Technical Requirements

### 🏗️ Data Model (New)

```python
class WaybillStatus(str, Enum):
    OPEN = "Open"             # Created, no truck assigned yet
    IN_PROGRESS = "In Progress" # Trip active
    COMPLETED = "Completed"   # Delivered
    INVOICED = "Invoiced"     # Finance handling

class Waybill(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    waybill_number: str = Field(index=True, unique=True) # WB-YYYY-SEQ
    client_id: int # Link to a Client table (or just string for MVP)
    expected_loading_date: date
    description: str # Cargo details
    weight_kg: float
    origin: str
    destination: str
    border_point: str | None
    is_container: bool = False
    container_number: str | None
    
    # Financials (Optional for this story, but good to have placeholder)
    agreed_rate: float
    currency: str = "USD"
```

### 🔢 Waybill Number Generation
*   **Format:** `WB-{YEAR}-{SEQUENCE}` (e.g., `WB-2026-0001`)
*   **Logic:**
    *   Get current year.
    *   Find max sequence for this year in DB.
    *   Increment by 1.
    *   Pad with zeros to 4 digits.

### 🔗 Relationship
*   **Trip** table needs a new foreign key: `waybill_id` (Optional? Or Mandatory? Mandatory if we shift to this flow).
*   *Migration Note:* existing trips might have null waybill_id.

## 4. Tasks / Subtasks

- [x] Backend: Create `Waybill` Model
    - [x] Define SQLAlchemy model
    - [x] Add relationship to `Trip` (One Waybill -> One or Many Trips? Usually One Waybill = One Shipment. Let's assume One-to-One or One-to-Many splits. For now, simple link).
- [x] Backend: Waybill Number Generator
    - [x] Implement service to generate `WB-YYYY-SEQ`
- [x] Backend: API Endpoints
    - [x] CRUD for Waybills
- [x] Frontend: Waybill Management
    - [x] Page: `ops/waybills/new`
    - [x] Page: `ops/waybills/list`
    - [x] Link "Create Trip" button on Waybill row to the Trip Creation page (passing waybill_id)

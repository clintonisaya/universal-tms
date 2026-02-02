# Story 2.9: Location Autocomplete (Radar.com)

**Epic:** 2 - Core Logistics Cycle
**Story Key:** 2-9-location-autocomplete-integration
**Status:** planning

## 1. User Story

**As an** Ops Officer / Driver,
**I want** to easily search for my current location (e.g., "Ilala", "Chalinze") when updating a trip,
**So that** I don't make spelling errors and the data is consistent for reporting.

## 2. Acceptance Criteria (BDD)

### Scenario 1: Search and Select
**Given** I am on the "Update Trip Status" modal
**When** I type "Ilala" into the "Current Location" field
**Then** I see a dropdown with "Ilala, Dar es Salaam, Tanzania" (powered by Radar.com)
**When** I select it
**Then** the field is populated with the full string
**And** the coordinates (Lat/Long) are optionally captured (hidden field)

### Scenario 2: Offline/Fallback
**Given** the internet is slow or Radar.com is unreachable
**When** I type "Bush Stop 3"
**Then** I can still submit this text (Free Text fallback)
**And** the system accepts it

## 3. Technical Requirements

### 🏗️ Integrations
*   **Provider:** **Radar.com** (Free Tier: 100k requests/mo).
*   **SDK:** `@radar/sdk` or direct REST API call.
*   **API Key:** Store in `NEXT_PUBLIC_RADAR_PUBLISHABLE_KEY`.

### 📂 File Structure
*   `frontend/src/components/common/LocationAutocomplete.tsx`
*   `frontend/src/app/ops/trips/components/UpdateStatusModal.tsx` (Refactor)

## 4. Implementation Guide

1.  **Setup:**
    *   Get Radar Publishable Key.
    *   Env config: `NEXT_PUBLIC_RADAR_PUBLISHABLE_KEY=...`
2.  **Component (`LocationAutocomplete`):**
    *   Input field that calls `Radar.autocomplete({ query: '...' })` on change (debounced 300ms).
    *   Display results in a customized dropdown.
    *   On Select -> `onChange(value, coordinates)`.
3.  **Integration:**
    *   Replace standard `Input` in "Update Trip Status" modal with this component.

## 5. Tasks / Subtasks

- [x] Configuration
    - [x] Sign up for Radar.com and get keys
    - [x] Add env variables to Vercel/Local `.env`
- [x] Frontend: Component Implementation
    - [x] Create `frontend/src/components/common/LocationAutocomplete.tsx`
    - [x] Implement Debounced Search against Radar API
    - [x] Handle "No Results" and "Error" states (fallback to standard input)
- [x] Frontend: Integration
    - [x] Update `UpdateStatusModal` to use `LocationAutocomplete`
    - [x] Verify `current_location` string is saved correctly in `Trip` update API
    - [x] Validation: Check "Ilala" input results in correct save

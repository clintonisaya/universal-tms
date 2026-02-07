# Story 2.13: Manual Location Update & Radar Removal

Status: ready-for-dev

## Story

As a **Logistics Coordinator**,
I want to **manually enter the location and select a country when updating a trip's status**,
so that **the location data is accurate (e.g., "Mbeya, Tanzania") and I am not blocked by the malfunctioning Radar service.**

## Acceptance Criteria

1.  **Remove Radar.io Integration**:
    *   The "Radar.io" autocomplete functionality text and component usage in the "Update Trip Status" modal must be removed.
    *   Any code relying primarily on Radar.io for this feature should be deprecated or removed.

2.  **Manual Location Input**:
    *   In the "Update Trip Status" modal, replace the single AutoComplete field with two distinct fields:
        *   **City/Place**: A text input field for manual entry (e.g., "Mbeya", "Tunduma", "somewhere").
        *   **Country**: A dropdown (Select) field to choose the country.

3.  **Country Selection**:
    *   The Country dropdown must be populated with valid countries (fetched from the existing `/api/v1/countries/` endpoint or a reliable static list if API usage is not preferred for this modal, but API is recommended for consistency).
    *   **Validation**: The Country field is **mandatory** when providing a location update. The user "must choose the country".

4.  **Data Formatting**:
    *   When the form is submitted, the `current_location` field sent to the backend must be formatted as a single string: `"{City}, {Country}"` (e.g., "Mbeya, Tanzania").
    *   If only the Country is selected (edge case), prompt for City or handle gracefully (but AC 2 implies both).
    *   The backend expects a string, so this concatenation happens on the frontend.

5.  **UX/UI**:
    *   The City and Country fields should be placed **side-by-side** (e.g., using a Grid or Flex layout) to optimize space and show the relationship between them ("country beside...").
    *   Ensure the design matches the existing Ant Design theme.

## Tasks / Subtasks

- [ ] **Frontend Implementation** (AC 1, 2, 3, 5)
    - [ ] Update `UpdateTripStatusModal.tsx`:
        - [ ] Remove `LocationAutocomplete` component usage.
        - [ ] Add state or form fields for `city` and `country`.
        - [ ] Implement `fetchCountries` logic (similar to `CreateWaybillDrawer` or `LocationsPage`).
        - [ ] specific: Layout the `city` and `country` fields side-by-side (Row/Col with gutter).
    - [ ] Clean up: Remove `LocationAutocomplete.tsx` if it is no longer used elsewhere (Check `CreateWaybillDrawer` usage: it uses standard `AutoComplete` but check if it imports `LocationAutocomplete`).
        - *Note*: `CreateWaybillDrawer` uses generic `AutoComplete`, not the custom component. `UpdateTripStatusModal` used the custom one. If `LocationAutocomplete.tsx` is unused, delete it to clean the codebase.
- [ ] **Logic Integration** (AC 4)
    - [ ] In `handleSubmit`, concatenate the values: `const finalLocation = \`\${values.city}, \${values.country}\`;`.
    - [ ] Ensure validation prevents submission without a Country.

## Dev Notes

- **API Endpoints**:
    - GET `/api/v1/countries/`: Returns list of countries. Use this to populate the dropdown.
    - PATCH `/api/v1/trips/{id}`: Updating the trip. The payload expects `current_location` as a string.
- **Reference Code**:
    - `frontend/src/app/settings/transport/locations/page.tsx`: Example of fetching countries and structure.
    - `frontend/src/components/waybills/CreateWaybillDrawer.tsx`: Example of fetching generic resources.

### Project Structure Notes

- Keep the modal logic in `src/components/trips/`.
- If fetching countries becomes common, consider a custom hook `useCountries` or similar in `src/hooks/` (optional for this story but good practice).

## Dev Agent Record

### File List
- `frontend/src/components/trips/UpdateTripStatusModal.tsx`
- `frontend/src/components/common/LocationAutocomplete.tsx` (Target for deletion/check)

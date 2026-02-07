# Story 2.14: Multi-Currency Support & Exchange Rate Management

Status: ready-for-dev

## Story

As a **Finance Manager**,
I want to **set monthly exchange rates (USD to TZS) and ensure all cost applications allow specifying the currency**,
so that **the system accurately tracks expenses in the base TZS currency while accommodating USD transactions, and I can see estimated TZS values for approval.**

## Acceptance Criteria

1.  **Exchange Rate Management (Finance Settings)**:
    *   Add a new "Finance" or "Exchange Rate" tab in the Settings module (Story 2.11 extension).
    *   Use a table or list to manage rates:
        *   **Month/Year**: Selector (e.g., "February 2026").
        *   **Rate**: Input for 1 USD = X TZS (e.g., 2600.00).
        *   **Active**: Boolean/Status (Optional, can just use Month).
    *   Validation: Ensure only one rate per Month/Year combination.
    *   Defaults: If no rate is set for a current month, warn the user or use the previous month's rate as a fallback (with warning).

2.  **Expense Request Updates (Story 2.2 Refinement)**:
    *   Update the "Create Expense Request" form:
        *   Add **Currency** selector: "TZS" (Default) vs "USD".
        *   Add **Amount** field (existing).
    *   **Auto-Calculation**:
        *   If "USD" is selected, fetch the applicable exchange rate for the *Expense Date* (or current date).
        *   Display a read-only field: **"Estimated TZS: {Amount * Rate}"**.
        *   Show the rate used for calculation (e.g., "@ 2600.00").
    *   **Storage**: Save `currency`, `original_amount`, and `exchange_rate` (snapshot) in the Expense record.

3.  **Waybill / Trip Updates (Story 2.7 / 2.1 Refinement)**:
    *   Ensure "Agreed Rate" allows TZS/USD selection (confirm existing logic works with new rate system).
    *   If USD, store the rate or rely on finance month rate for reporting? (Ideally store rate at time of creation or use creation date lookup).
    *   For this story, focus on the **Expense Request** flow as primary user need ("application about cost").

4.  **System Base Currency**:
    *   Ensure reporting and totals (e.g., Dashboard metrics) use TZS.
    *   Convert USD amounts to TZS using the stored rate (if available) or monthly rate for aggregations.

5.  **Role Access**:
    *   Only `Finance` and `Admin` roles can set Exchange Rates.
    *   All users can Create Expenses with currency selection.

## Tasks / Subtasks

- [ ] **Backend Database & API**
    - [ ] Create `exchange_rates` table: `id`, `month` (Date or Int), `year` (Int), `rate` (Decimal), `created_at`.
    - [ ] Create API endpoints: `GET/POST/PUT /api/v1/finance/exchange-rates`.
    - [ ] Update `expenses` table: Add `currency` (VARCHAR, default 'TZS'), `exchange_rate` (Decimal, nullable).
    - [ ] Update `CreateExpense` logic to fetch/validate rate if USD.
- [ ] **Frontend: Finance Settings**
    - [ ] Create `ExchangeRateSettings` component in `src/app/settings/finance/page.tsx` (or similar).
    - [ ] Implement Rate management UI (Table + Modal).
- [ ] **Frontend: Expense Form**
    - [ ] Update `ExpenseRequestModal` (or equivalent):
        - [ ] Add Currency Toggle.
        - [ ] Fetch current rate on mount or date change.
        - [ ] Calc and display "Estimated TZS".
- [ ] **Frontend: Display**
    - [ ] Update Expense Lists to show Currency (e.g., "USD 100" instead of just "100").

## Dev Notes

- **Rates Strategy**: Store the rate *snapshot* with the transaction (Expense/Waybill) at the time of creation/approval. This prevents historical data from changing if the monthly rate is updated later.
- **Project Structure**:
    - Backend: `internal/domain/finance.go`, `internal/service/finance_service.go`, `internal/handler/http/finance_handler.go`.
    - Frontend: `src/types/finance.ts`, `src/components/finance/`.

### References
- User Request: "finance there will be setting the exchange rate for the system for particular month"

# Story 2.22: Financial Pulse & Profitability Insights

**Epic:** 2 - Core Logistics Cycle
**Story Key:** 2-22-financial-reports
**Status:** done

## 1. User Story

**As a** Business Owner / Manager,
**I want** to see real-time Profit, Income, and Expense insights on my dashboard,
**So that** I can track the financial health of my logistics operations daily and monthly.

## 2. Acceptance Criteria (BDD)

### Scenario 1: Financial Pulse Dashboard
**Given** I am on the Dashboard or Reports page
**Then** I see the **"Financial Pulse"** section with:
1.  **Daily Profit Trend**: A Line chart showing Net Profit over the last 30 days.
2.  **Monthly Pulse**: A Bar chart comparing **Income** vs. **Expenses** for the current month.
3.  **Expense Distribution**: A Donut chart breaking down expenses by category (Fuel, Allowance, Maintenance, Office, Border).

### Scenario 2: Calculation Logic (Strict "Paid" Only)
**Given** I am viewing any financial report
**Then** **Income** is calculated from **Waybills** (Freight Charges) linked to Active Trips.
**And** **Expenses** are calculated ONLY from records with status **`PAID`**.
**And** Pending or Draft expenses are **EXCLUDED**.
**And** **Net Profit** = `Total Revenue` - `Total Paid Expenses`.

### Scenario 3: Trip Profitability Report
**Given** I open the "Trip Profitability" detailed view
**Then** I see a table with columns:
*   Trip Number
*   Route Name
*   Client
*   **Income** (Waybill Amount)
*   **Total Expenses** (Sum of Paid Trip Expenses)
*   **Net Profit** (Income - Expenses)
*   **Margin %**
**And** I can sort by **Margin %** to see least profitable trips.

### Scenario 4: Office vs. Trip Expenses
**Given** I view the Expense Distribution
**Then** I can distinguish between **Direct Trip Costs** (Fuel, Allowances) and **Overhead** (Office Expenses).

## 3. Technical Requirements

### 📊 Visualization
*   **Library**: `Recharts` (or existing chart lib in project).
*   **Performance**: aggregated queries should be optimized.

### 🧮 Data Aggregation
*   **Backend Endpoint**: `GET /api/v1/reports/financial-pulse`
    *   Returns: `{ daily_trend: [], monthly_stats: {}, expense_breakdown: [] }`
*   **Currency**: All values normalized to **TZS** (Base Currency).
    *   USD expenses converted using their stored `exchange_rate`.

## 4. Implementation Tasks

- [x] **Backend: Reporting Service**
    - [x] Create `ReportingService` to aggregate Waybill and Expense data.
    - [x] Implement `get_financial_pulse` query with "Paid" status filter.
    - [x] Implement `get_trip_profitability` query.
- [x] **Frontend: Dashboard Widgets**
    - [x] Implement `ProfitTrendChart` (Line).
    - [x] Implement `IncomeVsExpenseChart` (Bar).
    - [x] Implement `ExpenseDistributionChart` (Donut).
- [x] **Frontend: Integration**
    - [x] Add "Financial Pulse" section to Ops Dashboard.
    - [x] Create detailed "Profitability" report page.

## 5. Implementation Summary

### Backend Changes
- **File**: `backend/app/api/routes/reports.py`
  - Added `GET /api/v1/reports/financial-pulse` endpoint returning:
    - `daily_trend`: 30-day daily profit data with revenue/expense breakdown
    - `monthly_stats`: Current month's income, expenses, net profit
    - `expense_breakdown`: Expenses by category (Fuel, Allowance, Maintenance, Office, Border, Other)
  - Added `GET /api/v1/reports/trip-profitability` endpoint with sorting and pagination
  - All amounts normalized to TZS using stored exchange rates
  - Only PAID expenses included in calculations

### Frontend Changes
- **New Components**:
  - `frontend/src/components/dashboard/IncomeVsExpenseChart.tsx` - Bar chart for monthly income vs expenses
  - `frontend/src/components/dashboard/ExpenseDistributionChart.tsx` - Donut chart for expense categories
- **Updated Components**:
  - `frontend/src/components/dashboard/ProfitTrendChart.tsx` - Enhanced with revenue/expense lines
  - `frontend/src/app/dashboard/page.tsx` - Added Financial Pulse section
  - `frontend/src/components/dashboard/DashboardLayout.tsx` - Added Reports menu with profitability link
- **New Pages**:
  - `frontend/src/app/reports/profitability/page.tsx` - Trip Profitability report with summary cards

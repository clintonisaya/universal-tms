# Product Brief: Financial Pulse & Profitability Insights

**Author:** Mary (Business Analyst)
**Date:** 2026-02-06
**Status:** DRAFT

## 1. Executive Summary
The goal is to empower the business with "Best-in-Class" financial transparency. We will move beyond simple data entry to **strategic insights**, providing real-time visibility into **Net Profit** (General & Per-Trip). The system will visualize the heartbeat of the logistics operation: *Income (Waybills)* vs. *Cost (Trip + Office Expenses)*.

## 2. Core Metrics & Logic

### 2.1. The Profit Equation 🧮
*   **Net Profit (General)** = `Total Revenue` - `Total Expenses`
*   **Net Profit (Per Trip)** = `Trip Revenue` - `Trip Specific Expenses`

### 2.2. Key Components
*   **Income (Revenue)**:
    *   **Source**: Derived from **Waybills** (Freight Charges).
    *   **Recognition Trigger**: "Active Trip" logic. Revenue "counts" begins when a **Waybill is created** AND **first expense is recorded**. This signifies the job has truly started.
*   **Expenses (Cost)**:
    *   **Strict Inclusion Criteria**: Only expenses with status **`Paid`** (fully approved and processed by Finance) are counted. Pending or Draft expenses are excluded from Profit calculations.
    *   **Trip Expenses**: Fuel, Allowances, Maintenance, Border fees, etc.
    *   **Office Expenses**: Utilities, Rent, Salaries, Supplies.

## 3. Visualization Requirements (The "Best Insights")

### 3.1. The "Financial Pulse" Dashboard
A dedicated dashboard or section providing high-level financial health at a glance.

*   **Widget 1: Daily Profit Trend (Line Chart)**
    *   X-Axis: Days (Last 30 days default).
    *   Y-Axis: Profit Amount (TZS).
    *   *Insight*: Quickly spot profitable days vs. loss-making days.

*   **Widget 2: Monthly Performance (Bar Chart)**
    *   Comparison: Income vs. Expenses (Side-by-side bars) per month.
    *   Overlay line: Net Profit Margin %.

*   **Widget 3: Expense Distribution (Donut Chart)**
    *   Breakdown of *Where the money is going*.
    *   Segments: Fuel (usually largest), Allowance, Office, Maintenance.
    *   *Insight*: "Why is Maintenance 40% of our costs this month?"

### 3.2. Detailed Reports
*   **Trip Profitability Table**:
    *   Columns: Trip #, Route, Client, Income (Waybill), Total Expenses, **Net Profit**, **Margin %**.
    *   *Sorting*: sort by "Lowest Margin" to identify problematic routes.

## 4. Technical Implications (for Developer)
*   **Data Aggregation**: Heavy reliance on joining `Waybills` (Income) with `Expenses` (Trip & Office).
*   **Currency Normalization**: All reports must be normalized to the **Base Currency (TZS)**. Multi-currency expenses (USD) must be converted using the recorded exchange rate.
*   **Performance**: Aggregating these sums on the fly might be slow. Consider a cached "Financial Stats" view or optimized SQL queries.

## 5. Next Steps
1.  **Approval**: Confirm this brief aligns with the vision.
2.  **Story Creation**: create `2-22-financial-reports.md`.
3.  **Implementation**: Build the dashboard widgets and aggregation queries.

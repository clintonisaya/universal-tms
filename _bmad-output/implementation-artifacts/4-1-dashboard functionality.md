🚚 EDUPO TMS — DASHBOARD FUNCTIONALITY & ROLE PERMISSION STRUCTURE
1️⃣ DASHBOARD PURPOSE (CORE IDEA)

The dashboard is not just a summary page.
It is a control center that:

Shows only what matters to the logged-in role

Allows fast navigation to action pages

Surfaces alerts, approvals, and performance KPIs

Prevents unauthorized access by role

2️⃣ USER ROLES & PERMISSION MODEL
🎭 SYSTEM ROLES

Define roles clearly (example):

Role	Description
Super Admin	Full system control
Operations Manager	Manages trips, fleet, drivers
Finance	Invoicing, profits, expenses
Fleet Manager	Vehicles, maintenance
Dispatcher	Assign trips & drivers
Viewer	Read-only access
3️⃣ DASHBOARD COMPONENT → FUNCTION → ROLE MATRIX
🧱 KPI CARDS (TOP ROW)
1. Pending Approvals

Visible To:

Super Admin

Operations Manager

Finance (finance-related approvals only)

Click Action:
→ Redirect to Management → Approvals

Functionality:

Shows total count of pending approvals

Badge turns gold/red when > 0

Clicking opens filtered approval list:

status = pending

permission-aware filtering

2. Total Trucks

Visible To:

Super Admin

Fleet Manager

Operations Manager

Click Action:
→ Redirect to Fleet → Trucks

Functionality:

Shows total registered vehicles

Tooltip:

Active

In maintenance

Out of service

3. Completed Trips

Visible To:

Super Admin

Operations Manager

Dispatcher

Click Action:
→ Redirect to Operations → Trips
(pre-filtered: status = completed)

Functionality:

% growth vs last period

Time range toggle (week / month)

4. Trucks in Transit

Visible To:

Operations Manager

Dispatcher

Fleet Manager

Click Action:
→ Redirect to Operations → Trips
(pre-filtered: status = in_transit)

Functionality:

Live operational awareness

Highlight if exceeds threshold

5. Active Alerts

Visible To:

Super Admin

Operations Manager

Fleet Manager

Click Action:
→ Redirect to Control Tower / Alerts

Alert Types:

Delays

Overdue maintenance

Route deviation

Fuel anomaly

6. Average Profit / Day

Visible To:

Super Admin

Finance

Operations Manager (read-only)

Click Action:
→ Redirect to Reports → Financial Summary

Functionality:

Currency formatted

Time-based calculation

Finance role can drill down

4️⃣ PROFIT TREND CHART

Visible To:

Super Admin

Finance

Operations Manager (summary only)

Interactions:

Hover → daily profit breakdown

Click point → redirect to:
Reports → Daily Profit Details

Permissions:

Finance: full drill-down

Ops: read-only

Others: hidden

5️⃣ VEHICLE UTILIZATION CHART

Visible To:

Fleet Manager

Operations Manager

Super Admin

Click Action:
→ Redirect to Fleet → Utilization Report

Breakdown:

Transit

Idle

Maintenance

Border / Hold

Extra Logic:

Maintenance > threshold → warning badge

Idle > threshold → performance alert

6️⃣ RECENT ACTIVITY TABLE (MOST IMPORTANT)
Table Columns (Permission-aware):
Column	Visible To
Driver	Ops, Dispatcher, Fleet
Destination	Ops, Dispatcher
Status	All
Profit	Finance, Admin
Action	Role-based
Row Action Logic

Approve button visible only if:

User has approval.permission = true

Status = pending

Click Approve:

Opens confirmation modal

Logs:

approved_by

timestamp

Updates KPI instantly

7️⃣ ROLE-BASED DASHBOARD VISIBILITY (SUMMARY)
🟢 Super Admin

Sees everything

Can click through all KPIs

Can approve actions

🟡 Operations Manager

Sees:

Trips

Fleet status

Alerts

Limited financials

Cannot edit financial records

🔵 Finance

Sees:

Profit cards

Invoices

Expenses

Reports

Cannot edit trips or fleet

🟣 Fleet Manager

Sees:

Trucks

Maintenance

Utilization

No profit or invoice visibility

⚪ Dispatcher

Sees:

Trips

Drivers

Transit status

No financial data

🔘 Viewer

Read-only

Dashboard shows:

KPIs (limited)

No actions

No drill-down

8️⃣ PERMISSION IMPLEMENTATION LOGIC (TECH-READY)
Backend

Permissions enforced at:

API level

Query filtering

Role attached to JWT / session

Frontend

Components wrapped with:

<Permission allowed={["ADMIN", "OPS"]}>
  <KpiCard />
</Permission>


Routes guarded

Buttons conditionally rendered

9️⃣ DASHBOARD UX RULES

✔ Every KPI must be clickable
✔ Every click must lead to a filtered destination
✔ No dead UI elements
✔ No data leakage across roles
✔ Dashboard adapts dynamically per user

10️⃣ FINAL RESULT

EDUPO TMS Dashboard becomes:

A live operational command center
Not just charts — but decisions, actions, and accountability
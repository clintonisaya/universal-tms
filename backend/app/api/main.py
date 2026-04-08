from fastapi import APIRouter

from app.api.routes import (
    border_posts,
    cargo_types,
    clients,
    cities,
    company_settings,
    countries,
    dashboard,
    drivers,
    exchange_rates,
    expenses,
    files,
    invoices,
    items,
    login,
    maintenance,
    office_expense_types,
    private,
    reports,
    tasks,
    trailers,
    trip_expense_types,
    trips,
    trucks,
    users,
    utils,
    vehicle_statuses,
    waybills,
)

api_router = APIRouter()
api_router.include_router(login.router)
api_router.include_router(dashboard.router)
api_router.include_router(users.router)
api_router.include_router(items.router)
api_router.include_router(trucks.router)
api_router.include_router(drivers.router)
api_router.include_router(trailers.router)
api_router.include_router(trips.router)
api_router.include_router(waybills.router)
api_router.include_router(invoices.router)
api_router.include_router(expenses.router)
api_router.include_router(cargo_types.router)
api_router.include_router(trip_expense_types.router)
api_router.include_router(office_expense_types.router)
api_router.include_router(vehicle_statuses.router)
api_router.include_router(countries.router)
api_router.include_router(cities.router)
api_router.include_router(clients.router)
api_router.include_router(reports.router)
api_router.include_router(maintenance.router)
api_router.include_router(exchange_rates.router)
api_router.include_router(border_posts.router)
api_router.include_router(tasks.router)
api_router.include_router(utils.router)
api_router.include_router(private.router)
api_router.include_router(files.router, prefix="/files", tags=["files"])
api_router.include_router(company_settings.router)

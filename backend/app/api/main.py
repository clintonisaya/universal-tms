from fastapi import APIRouter

from app.api.routes import (
    cargo_types,
    dashboard,
    drivers,
    expenses,
    items,
    login,
    private,
    trailers,
    trips,
    trucks,
    users,
    utils,
    vehicle_statuses,
    waybills,
    countries,
    cities,
    reports,
    maintenance,
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
api_router.include_router(expenses.router)
api_router.include_router(cargo_types.router)
api_router.include_router(vehicle_statuses.router)
api_router.include_router(countries.router)
api_router.include_router(cities.router)
api_router.include_router(reports.router)
api_router.include_router(maintenance.router)
api_router.include_router(utils.router)
api_router.include_router(private.router)

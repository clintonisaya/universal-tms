import sentry_sdk
from fastapi import FastAPI, Request
from fastapi.routing import APIRoute
from starlette.middleware.cors import CORSMiddleware

from app.api.main import api_router
from app.core.config import settings
from app.core.security import clear_auth_cookie


def custom_generate_unique_id(route: APIRoute) -> str:
    if route.tags:
        return f"{route.tags[0]}-{route.name}"
    return route.name


if settings.SENTRY_DSN and settings.ENVIRONMENT != "local":
    sentry_sdk.init(dsn=str(settings.SENTRY_DSN), enable_tracing=True)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    generate_unique_id_function=custom_generate_unique_id,
    redirect_slashes=False,
)

# Set all CORS enabled origins
if settings.all_cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.all_cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(api_router, prefix=settings.API_V1_STR)


@app.middleware("http")
async def clear_stale_auth_cookie(request: Request, call_next):
    """Auto-clear the access_token cookie when the backend returns 401.

    This prevents stale/expired cookies from persisting in the browser
    and causing redirect loops after deployments.
    """
    response = await call_next(request)
    if response.status_code == 401 and request.cookies.get("access_token"):
        clear_auth_cookie(response)
    return response


import socketio
from app.core.socket import sio

app = socketio.ASGIApp(sio, app)

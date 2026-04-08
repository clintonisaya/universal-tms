import sentry_sdk
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.routing import APIRoute
from slowapi.errors import RateLimitExceeded
from starlette.middleware.cors import CORSMiddleware

from app.api.main import api_router
from app.core.config import settings
from app.core.limiter import limiter
from app.core.security import clear_auth_cookie
from app.core.security_headers import SecurityHeadersMiddleware


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

# Rate limiting
app.state.limiter = limiter


def _rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    response = JSONResponse(
        status_code=429,
        content={"detail": f"Rate limit exceeded: {exc.detail}"},
    )
    response.headers["Retry-After"] = str(exc.detail)
    return response


app.add_exception_handler(RateLimitExceeded, _rate_limit_handler)  # type: ignore[arg-type]

# Set all CORS enabled origins
if settings.all_cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.all_cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
    )

app.include_router(api_router, prefix=settings.API_V1_STR)

# Security headers
app.add_middleware(SecurityHeadersMiddleware)


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

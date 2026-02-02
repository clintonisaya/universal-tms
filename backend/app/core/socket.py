import socketio
from app.core.config import settings

# Initialize Socket.IO server
# Allow all origins for now in development, or use settings.all_cors_origins
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",  # In production, set this to frontend URL
    logger=True,
    engineio_logger=True
)

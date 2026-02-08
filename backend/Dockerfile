FROM python:3.10-slim

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY ./alembic.ini ./
COPY ./alembic ./alembic
COPY ./app ./app

EXPOSE 8000

CMD ["bash", "-c", "alembic upgrade head && python -m app.initial_data && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
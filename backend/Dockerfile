# ── MIDMS Backend — Dockerfile ──────────────────────────────
# Python 3.11 slim keeps the image lightweight
FROM python:3.11-slim

WORKDIR /app

# System deps (earthengine-api needs these)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY midms_gee_engine.py .
COPY main.py .

# GEE service account key is mounted at runtime (never baked into image)
# See docker-compose.yml for the volume mount

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

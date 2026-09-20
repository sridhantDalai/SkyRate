# ==============================================================================
# SkyRate FastAPI Backend - Production Dockerfile
# Multi-stage build for optimal image size, security, and build-caching.
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build Dependencies
# ------------------------------------------------------------------------------
FROM python:3.12-slim-bookworm AS builder

# Prevent Python from writing .pyc files and buffer stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /install

# Install build tools if wheels need compiling
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Layer-cached dependency installation
COPY requirements.txt .

RUN pip install --no-cache-dir --prefix=/install/deps -r requirements.txt \
    && pip install --no-cache-dir --prefix=/install/deps gunicorn==23.0.0

# ------------------------------------------------------------------------------
# Stage 2: Final Production Runtime
# ------------------------------------------------------------------------------
FROM python:3.12-slim-bookworm AS runtime

# Runtime labels following OCI standards
LABEL org.opencontainers.image.title="SkyRate FastAPI Backend" \
      org.opencontainers.image.description="Real-Time Airfare Price Intelligence & Econometric Indexing Platform" \
      org.opencontainers.image.version="1.0.0" \
      org.opencontainers.image.authors="SkyRate Engineering Team" \
      org.opencontainers.image.licenses="Proprietary"

# Standard Python runtime settings
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/app/deps/bin:$PATH" \
    PYTHONPATH="/app/deps/lib/python3.12/site-packages:/app:$PYTHONPATH" \
    PORT=8000 \
    HOST=0.0.0.0 \
    WORKERS=4 \
    API_ENV=production

WORKDIR /app

# Create dedicated non-root group and user (UID/GID 10001)
RUN groupadd -g 10001 skyrate \
    && useradd -u 10001 -g skyrate -s /sbin/nologin -M -d /app skyrate

# Copy installed dependencies from builder
COPY --from=builder /install/deps /app/deps

# Copy application source code (strictly excluding secrets via .dockerignore)
COPY --chown=skyrate:skyrate app /app/app

# Enforce secure ownership and permissions
RUN chown -R skyrate:skyrate /app \
    && chmod -R 755 /app

# Switch to unprivileged non-root user
USER skyrate

# Expose microservice port
EXPOSE 8000

# Container Health Check targeting FastAPI /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request, sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/v1/health', timeout=4).getcode() == 200 else 1)" || exit 1

# Predictable production startup command
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4", "--proxy-headers", "--forwarded-allow-ips", "*"]

# ✈️ SkyRate Backend API

FastAPI backend service for **SkyRate** (Real-Time Airfare Price Intelligence for MoSPI CPI Augmentation).

This service interfaces between the frontend application and the **Supabase PostgreSQL** database populated by the daily ML pipeline, providing real-time APIx metrics, flight searches, surge analysis, fee decomposition, and macro economic indicators.

---

## 🧭 API Route Blueprint (`/api/v1`)

```text
/api/v1
│
├── /health
│
├── /fares
│   ├── /latest
│   ├── /history
│   └── /distribution
│
├── /indexes
│   ├── /latest
│   ├── /history
│   └── /compare
│
├── /routes
│   ├── /
│   └── /{route}
│
├── /analytics
│   ├── /overview
│   ├── /trends
│   ├── /elasticity
│   ├── /carriers
│   └── /fare-components
│
└── /metadata
    ├── /carriers
    ├── /airports
    ├── /routes
    └── /horizons
```

---

## 🏗️ Architecture

```text
prototype/backend/
├── app/
│   ├── main.py                     # FastAPI application entrypoint & lifespan
│   ├── core/
│   │   ├── config.py               # Pydantic BaseSettings, .env loader & CORS parser
│   │   ├── logging.py              # Structured logging configuration
│   │   └── exceptions.py           # Custom exceptions & global handlers
│   │
│   ├── api/
│   │   ├── router.py               # Consolidates v1 endpoints
│   │   └── v1/
│   │       ├── health.py           # GET /api/v1/health
│   │       ├── fares.py            # GET /api/v1/fares/latest, /history, /distribution
│   │       ├── indexes.py          # GET /api/v1/indexes/latest, /history, /compare
│   │       ├── routes.py           # GET /api/v1/routes, /routes/{route}
│   │       ├── analytics.py        # GET /api/v1/analytics/overview, /trends, /elasticity, /carriers, /fare-components
│   │       └── metadata.py         # GET /api/v1/metadata/carriers, /airports, /routes, /horizons
│   │
│   ├── schemas/                    # Pydantic v2 schemas
│   │   ├── common.py               # ResponseEnvelope & HealthStatus
│   │   ├── fare.py                 # FareItem, FareFilterQuery, FareListResponse, FareDistribution
│   │   ├── index.py                # APIxIndexRecord, IndexOverview, IndexHistory, IndexCompare
│   │   └── analytics.py            # AnalyticsOverview, TrendPoint, CarrierAnalytics, SurgeAnalysis
│   │
│   ├── services/                   # Business logic layer
│   │   ├── fare_service.py
│   │   ├── index_service.py
│   │   ├── analytics_service.py
│   │   └── route_service.py
│   │
│   ├── repositories/               # Data access layer (Supabase / Fallback)
│   │   ├── fare_repository.py
│   │   ├── index_repository.py
│   │   └── route_repository.py
│   │
│   └── db/
│       └── supabase.py             # Supabase client & dynamic partition resolver
│
├── tests/                          # pytest test suite (30 passed)
│   ├── conftest.py
│   ├── test_config.py
│   ├── test_health.py
│   ├── test_fares.py
│   ├── test_indexes.py
│   ├── test_analytics.py
│   └── test_routes.py
├── requirements.txt
├── .env.example
├── .env
├── .gitignore
├── DATABASE_CONTRACT.md
└── README.md
```

---

## 📡 API Endpoints Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Service health status, database connectivity & active partition |
| `GET` | `/api/v1/fares/latest` | Real-time flight fares with filtering (origin, dest, carrier, horizon, price) |
| `GET` | `/api/v1/fares/history` | Historical flight fares timeline per route |
| `GET` | `/api/v1/fares/distribution` | Statistical price distribution, percentiles (p25, median, p75) & histogram buckets |
| `GET` | `/api/v1/indexes/latest` | Latest MoSPI RealTime APIx index (All-India & States) |
| `GET` | `/api/v1/indexes/history` | Historical APIx inflation trajectories |
| `GET` | `/api/v1/indexes/compare` | Cross-state APIx inflation divergence comparison |
| `GET` | `/api/v1/indexes/state/{state}` | State-specific APIx progression across advance-purchase horizons |
| `GET` | `/api/v1/routes` | Monitored DGCA routes catalogue |
| `GET` | `/api/v1/routes/{route}` | Single route detailed profile (duration, distance, monitored carriers) |
| `GET` | `/api/v1/analytics/overview` | Executive metrics: All-India APIx, national inflation, avg fare, Brent crude |
| `GET` | `/api/v1/analytics/trends` | 14-day multi-signal price and crude oil trend trajectory |
| `GET` | `/api/v1/analytics/elasticity` | Dynamic surge pricing curve across advance booking horizons ($T \rightarrow T+45$) |
| `GET` | `/api/v1/analytics/carriers` | Commercial airline market share, pricing competitiveness, and on-time performance |
| `GET` | `/api/v1/analytics/fare-components` | Additive fare decomposition: Base Fare vs Taxes vs User Development Fee (UDF) |
| `GET` | `/api/v1/metadata/carriers` | Supported commercial carriers list |
| `GET` | `/api/v1/metadata/airports` | Supported airports with IATA codes, cities, and UDF fee rates |
| `GET` | `/api/v1/metadata/routes` | Supported DGCA airport pairs list |
| `GET` | `/api/v1/metadata/horizons` | Supported advance purchase windows ($T, T+1, T+7, T+15, T+30, T+45$) |

---



## 🛡️ API Abuse Protections

SkyRate implements multi-layer defense-in-depth against resource abuse, deep-scan attacks, and denial-of-service:

1. **Request Body Size Protection**:
   - Strictly enforces a maximum request payload size of 1 MB (1,048,576 bytes) via `MAX_REQUEST_BODY_BYTES`.
   - Rejects oversized requests immediately with `HTTP 413 Payload Too Large` and standard error envelope (`code: "PAYLOAD_TOO_LARGE"`).
2. **Pagination Offset Hard Cap**:
   - All public endpoints (`/api/v1/indexes/latest`, `/api/v1/fares/latest`, `/api/v1/fares/history`, `/api/v1/analytics/trends`) enforce `offset <= 5000`.
   - Requests exceeding offset 5000 return `HTTP 422 Unprocessable Entity` (`code: "VALIDATION_ERROR"`).
3. **Protected Administrative Endpoints**:
   - `POST /api/v1/health/cache/clear` is strictly restricted:
     - In production (`API_ENV=production`), it requires `ADMIN_SECRET` configured in environment and an authenticated `X-Admin-Secret` header. Unauthenticated or misconfigured requests return `HTTP 401 Unauthorized` or `HTTP 403 Forbidden`.
     - Can be disabled entirely by setting `ENABLE_CACHE_CLEAR_ENDPOINT=false`.
     - Admin secrets are compared via constant-time hashing (`secrets.compare_digest`) and are never leaked in logs or error responses.

## 🛡️ API Rate Limiting & Protection

SkyRate implements an application-level sliding-window rate limiter to safeguard database performance and prevent denial-of-service or quota exhaustion:

- **Production Tier**: 60 requests/minute per client IP (default when `API_ENV=production`).
- **Development Tier**: 1,000 requests/minute per client IP (default when `API_ENV=development`).
- **Standard Error Contract**: When exceeded, the API returns `HTTP 429 Too Many Requests` with the standard error envelope:
  ```json
  {
    "success": false,
    "error": {
      "code": "RATE_LIMIT_EXCEEDED",
      "message": "Rate limit exceeded. Maximum 60 requests per 60s allowed. Try again in 45 seconds.",
      "details": {
        "limit": 60,
        "window_seconds": 60,
        "retry_after": 45,
        "client_ip": "127.0.0.1"
      }
    }
  }
  ```
- **Response Headers**:
  - `X-RateLimit-Limit`: Maximum requests permitted per window.
  - `X-RateLimit-Remaining`: Number of requests remaining in current window.
  - `X-RateLimit-Reset`: Unix epoch timestamp when the current window resets.
  - `Retry-After`: Required cooldown duration in seconds before subsequent requests (present on 429).
- **Reverse Proxy Protection**: `TRUST_PROXY_HEADERS` defaults to `False`. The backend safely resolves client IPs from direct socket connections (`request.client.host`) to prevent header spoofing via arbitrary `X-Forwarded-For` values. Set `TRUST_PROXY_HEADERS=True` only when deployed behind a validated, trusted reverse proxy (e.g. Cloudflare, AWS ALB, Nginx).
- **Health Check Exemption**: Health check endpoints (`/api/v1/health`, `/api/v1/health/cache`) and documentation routes (`/docs`, `/redoc`, `/openapi.json`) are exempt from strict throttles to guarantee uninterrupted monitoring and container orchestration probes.
- **Architectural Scalability (Distributed Deployments)**:
  The built-in `SlidingWindowRateLimiter` is an in-memory, thread-safe implementation suitable for single-instance or single-worker deployments. For horizontally scaled, multi-instance, or multi-worker container clusters, rate limiting state should be backed by a shared distributed key-value store such as **Redis** (e.g. via `redis-py` sliding window sorted sets or token bucket algorithms) so quotas are shared and synchronized across instances.

## 🚀 Running the Server & Tests

```bash
# Run tests
pytest

# Start development server
uvicorn app.main:app --reload --port 8000
```
Interactive documentation will be available at `http://localhost:8000/docs`.

## ▲ Deploying the Backend on Vercel

Create a Vercel project with `prototype/backend` as its **Root Directory**. The
included `pyproject.toml` explicitly exports `app.main:app`, so all existing
routes remain available under `/api/v1` (for example,
`/api/v1/health`). Vercel installs the existing `requirements.txt` and uses
Python 3.12.

Set these Vercel environment variables before deploying:

```text
API_ENV=production
SUPABASE_URL=<your Supabase URL>
SUPABASE_SECRET_KEY=<server-only Supabase key>
SUPABASE_PUBLISHABLE_KEY=<optional public key>
CORS_ORIGINS=https://<your-frontend>.vercel.app
TRUST_PROXY_HEADERS=true
ADMIN_SECRET=<long random value>
ENABLE_CACHE_CLEAR_ENDPOINT=false
```

Deploy with either the Vercel dashboard or `vercel --prod` from this directory.
The cache and rate limiter are process-local on serverless instances; use a
shared store if globally consistent rate limiting is required.

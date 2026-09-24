from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.logging import setup_logging, logger
from pydantic import ValidationError
from fastapi import HTTPException
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.exceptions import RequestValidationError
from app.core.rate_limit import RateLimitMiddleware
from app.core.request_size import RequestSizeLimitMiddleware
from app.core.exceptions import (
    SkyRateException,
    DatabaseException,
    skyrate_exception_handler,
    validation_exception_handler,
    http_exception_handler,
    database_exception_handler,
    generic_exception_handler
)
from app.api.router import api_router
from app.db.supabase import SupabaseManager

@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.core.cache import cache, TTL
    from app.api.v1.metadata import (
        AIRPORTS, CARRIERS, HORIZONS, MONITORED_ROUTES, _METADATA_BUNDLE
    )

    setup_logging()
    logger.info(f"Starting {settings.PROJECT_NAME} (Env: {settings.ENVIRONMENT})")

    # Seed static metadata cache at startup — never needs a DB round-trip
    cache.set("metadata_airports", AIRPORTS,          TTL.METADATA)
    cache.set("metadata_carriers", CARRIERS,          TTL.METADATA)
    cache.set("metadata_horizons", HORIZONS,          TTL.METADATA)
    cache.set("metadata_routes",   MONITORED_ROUTES,  TTL.METADATA)
    cache.set("metadata_all",      _METADATA_BUNDLE,  TTL.METADATA)

    # Verify active date partitions in Supabase on startup
    client = SupabaseManager.get_client()
    if client:
        scraped_tbl, is_live_s = await SupabaseManager.resolve_active_scraped_table()
        index_tbl,  is_live_i  = await SupabaseManager.resolve_active_index_table()
        logger.info(
            f"Active partitions: {scraped_tbl} (live: {is_live_s}), "
            f"{index_tbl} (live: {is_live_i})"
        )
        # Proactively invalidate any stale cache entries tagged to old partitions.
        # This is a no-op on first start (cache is empty).
        cache.invalidate_prefix("analytics_overview")
        cache.invalidate_prefix("index_")
    else:
        logger.info("Supabase client running in standalone fallback mode.")

    # Pre-warm all heavy caches in parallel so the first browser request is instant
    # NOTE: Disabled for Vercel deployment to prevent 500 FUNCTION_INVOCATION_FAILED 
    # due to the strict 10s serverless cold-start timeout.
    logger.info("Skipping heavy cache pre-warming for Serverless environment.")
    # try:
    #     import asyncio as _asyncio
    #     from app.services.analytics_service import AnalyticsService
    #     from app.repositories.index_repository import IndexRepository
    #     from app.schemas.analytics import LeadTimeAnalysisParams, CarrierAnalyticsParams

    #     await _asyncio.gather(
    #         AnalyticsService.get_overview(),
    #         IndexRepository.get_apix_overview_metrics(),
    #         IndexRepository.get_index_records(),
    #         AnalyticsService.get_lead_time_behaviour(LeadTimeAnalysisParams(route="DEL-BOM")),
    #         AnalyticsService.get_carriers_analytics(CarrierAnalyticsParams(route="DEL-BOM")),
    #         return_exceptions=True,
    #     )
    #     logger.info("Cache pre-warming complete.")
    # except Exception as e:
    #     logger.warning(f"Cache pre-warming failed (non-fatal): {e}")

    yield

    logger.info(f"Shutting down {settings.PROJECT_NAME}")

API_DESCRIPTION = """
### Smart India Hackathon (SIH) — Problem Statement ID: SIH26056
**Theme**: Real-Time Airfare Price Intelligence & Econometric Prediction Platform for MoSPI CPI Augmentation.

**SkyRate** is an econometric airfare monitoring and price indexing platform developed for the Ministry of Statistics and Programme Implementation (MoSPI). Under problem statement **SIH26056**, SkyRate ingests high-frequency commercial domestic flight fares across key Indian aviation corridors, computes Laspeyres-weighted Air Passenger Price Indexes (APIx) across advance-purchase booking horizons (T, T+1, T+7, T+15, T+30, T+45), and provides econometric price intelligence to modernize national Consumer Price Index (CPI) transport indicators.

---

### Core Architectural Domains:
- **Health**: Operational liveness diagnostics and live Supabase PostgreSQL database connectivity verifications.
- **Fares**: Granular flight-level airfare lookups, historical price timelines across scraping partitions, and statistical distributions.
- **Index**: Real-time and state-level MoSPI-calibrated Air Passenger Price Index (APIx) values across advance-purchase booking horizons.
- **Routes**: DGCA-monitored high-density domestic aviation corridors, airport pair metadata, and distance metrics.
- **Analytics**: High-level market overviews, normalized time-series trends (daily/weekly/monthly), observed lead-time price elasticity curves, and carrier-level fare distributions without biased rankings.
- **Metadata**: Master registries of monitored airports, User Development Fees (UDF), commercial carriers, route pairs, and lead-time horizons.

---

### API Abuse Protections:
- **Request Payload Limit**: Maximum 1 MB (1,048,576 bytes). Requests exceeding this limit receive HTTP 413 (`PAYLOAD_TOO_LARGE`).
- **Pagination Bounds**: All public query offsets are strictly bounded at `offset <= 5000` to prevent deep-scan denial of service.
- **Administrative Endpoints**: Cache-flushing operations (`POST /api/v1/health/cache/clear`) require administrative authentication via `X-Admin-Secret` and are disabled in production by default without explicit admin keys.

### API Rate Limiting & Quotas:
- **Production Tier**: 60 requests/minute per client IP (`X-RateLimit-Limit: 60`).
- **Development Tier**: 1,000 requests/minute per client IP.
- **Headers Returned**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After` (on HTTP 429).
- **Exemptions**: Health diagnostics (`/api/v1/health`), documentation (`/docs`, `/redoc`), and schema specs (`/openapi.json`) are exempt from strict limits.
- **Architectural Note**: For horizontally distributed multi-worker deployments, a shared Redis backing store should be configured.

### Standardized Error Contract:
All error responses adhere to the unified contract:
```json
{
  "success": false,
  "error": {
    "code": "STRING",
    "message": "STRING",
    "details": {}
  }
}
```
All database queries, SQL internals, internal file paths, credentials, and environment variables are strictly redacted.
"""

OPENAPI_TAGS = [
    {
        "name": "Health",
        "description": "System liveness, service health, and live Supabase database connectivity checks.",
    },
    {
        "name": "Fares",
        "description": "Flight-level scraped airfare queries, historical price timelines, and statistical distributions.",
    },
    {
        "name": "Index",
        "description": "MoSPI-calibrated Real-time Air Passenger Price Index (APIx) values, state-level comparisons, and macro indexes.",
    },
    {
        "name": "Routes",
        "description": "Monitored aviation corridors, airport pairs, and DGCA route details.",
    },
    {
        "name": "Analytics",
        "description": "Executive market overviews, normalized time-series trends, observed lead-time elasticity behavior, and carrier statistics.",
    },
    {
        "name": "Metadata",
        "description": "Reference datasets for airports, UDF tariffs, airlines, routes, and advance-purchase horizons.",
    },
]

app = FastAPI(
    title="SkyRate API",
    version=settings.VERSION,
    description=API_DESCRIPTION,
    openapi_tags=OPENAPI_TAGS,
    docs_url=None,  # Disabled to use custom dark-themed Scalar UI below
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
)

# Configure Trusted Host Protection if configured and not wildcard
if settings.ALLOWED_HOSTS and "*" not in settings.ALLOWED_HOSTS:
    from starlette.middleware.trustedhost import TrustedHostMiddleware
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.ALLOWED_HOSTS)

# Configure Request Body Size Protection (1 MB maximum payload)
app.add_middleware(RequestSizeLimitMiddleware)

# Configure Rate Limiting (layered inside CORS so CORS headers are added to 429 responses)
app.add_middleware(RateLimitMiddleware)

# Configure CORS (hardened: explicit methods, no credentials by default, strict origins)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.CORS_ALLOW_METHODS,
    allow_headers=settings.CORS_ALLOW_HEADERS,
)

# Register Exception Handlers
app.add_exception_handler(SkyRateException, skyrate_exception_handler)
app.add_exception_handler(DatabaseException, database_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(ValidationError, validation_exception_handler)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)

try:
    from postgrest.exceptions import APIError
    app.add_exception_handler(APIError, database_exception_handler)
except ImportError:
    pass

try:
    import psycopg2
    app.add_exception_handler(psycopg2.Error, database_exception_handler)
except ImportError:
    pass

app.add_exception_handler(Exception, generic_exception_handler)

# Include API Router under /api/v1
app.include_router(api_router, prefix=settings.API_V1_STR)

from fastapi.openapi.utils import get_openapi

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title="SkyRate API",
        version=settings.VERSION,
        description=API_DESCRIPTION,
        routes=app.routes,
        tags=OPENAPI_TAGS,
    )

    from app.schemas.fare import LatestFaresParams, FareHistoryParams, FareDistributionParams
    from app.schemas.analytics import LeadTimeAnalysisParams, CarrierAnalyticsParams, AnalyticsTrendsParams
    from app.schemas.index import IndexFilterParams

    models = [
        LatestFaresParams, FareHistoryParams, FareDistributionParams,
        LeadTimeAnalysisParams, CarrierAnalyticsParams, AnalyticsTrendsParams,
        IndexFilterParams
    ]
    param_docs = {}
    param_examples = {}
    for model in models:
        for fname, field in model.model_fields.items():
            if field.description and fname not in param_docs:
                param_docs[fname] = field.description
            if field.examples and fname not in param_examples:
                param_examples[fname] = field.examples

    for path_item in openapi_schema.get("paths", {}).values():
        for operation in path_item.values():
            if isinstance(operation, dict):
                for param in operation.get("parameters", []):
                    pname = param.get("name")
                    if pname in param_docs:
                        if not param.get("description"):
                            param["description"] = param_docs[pname]
                        if "schema" in param and isinstance(param["schema"], dict):
                            if not param["schema"].get("description"):
                                param["schema"]["description"] = param_docs[pname]
                            if pname in param_examples and not param["schema"].get("examples"):
                                param["schema"]["examples"] = param_examples[pname]

    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

@app.get("/docs", include_in_schema=False)
async def scalar_docs():
    from fastapi.responses import HTMLResponse
    html = f"""
    <!DOCTYPE html>
    <html>
      <head>
        <title>{app.title} - API Docs</title>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          body {{ margin: 0; padding: 0; background: #0f111a; }}
        </style>
      </head>
      <body>
        <!-- Scalar API Reference -->
        <script id="api-reference" data-url="{app.openapi_url}"></script>
        <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
      </body>
    </html>
    """
    return HTMLResponse(html)

@app.get("/", tags=["Root"], include_in_schema=False)
async def root():
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs_url": "/docs",
        "api_v1": settings.API_V1_STR
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)


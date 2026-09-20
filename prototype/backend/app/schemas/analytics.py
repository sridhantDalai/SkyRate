from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field, field_validator, model_validator
from app.schemas.fare import (
    IATA_REGEX, ROUTE_REGEX, VALID_HORIZONS, parse_and_validate_date_str
)

class LeadTimePoint(BaseModel):
    horizon: str = Field(description="Advance purchase window: T+1, T+7, T+15, T+30, T+45")
    days_before_departure: int = Field(description="Days prior to flight departure")
    median_fare: float = Field(description="Observed median gross fare in INR")
    min_fare: float = Field(description="Observed minimum gross fare in INR")
    max_fare: float = Field(description="Observed maximum gross fare in INR")
    sample_size: Optional[int] = Field(default=None, description="Number of observed flights")
    t_window: Optional[str] = None
    avg_gross_fare: Optional[float] = None
    min_gross_fare: Optional[float] = None
    max_gross_fare: Optional[float] = None

    @model_validator(mode="after")
    def sync_compatibility(self) -> "LeadTimePoint":
        if self.t_window is None:
            self.t_window = self.horizon
        if self.horizon is None and self.t_window is not None:
            self.horizon = self.t_window
        if self.avg_gross_fare is None:
            self.avg_gross_fare = self.median_fare
        if self.min_gross_fare is None:
            self.min_gross_fare = self.min_fare
        if self.max_gross_fare is None:
            self.max_gross_fare = self.max_fare
        return self

# Alias for backwards compatibility
SurgePoint = LeadTimePoint

class LeadTimeAnalysisResponse(BaseModel):
    route: str = Field(description="Monitored route e.g. DEL-BOM")
    carrier: Optional[str] = Field(default=None, description="Airline carrier filter if specified")
    partition_date: Optional[str] = Field(default=None, description="Partition date YYYY-MM-DD")
    analysis_type: str = Field(
        default="Observed Lead-Time Price Behaviour",
        description="Characterization of advance purchase price curve (non-causal observed pricing)"
    )
    currency: str = "INR"
    points: List[LeadTimePoint]

# Alias for backwards compatibility
RouteSurgeAnalysis = LeadTimeAnalysisResponse

class LeadTimeAnalysisParams(BaseModel):
    route: Optional[str] = Field(
        default=None,
        description="Aviation route corridor (e.g. DEL-BOM)",
        examples=["DEL-BOM"]
    )
    origin: Optional[str] = Field(
        default=None,
        description="3-letter IATA origin airport code (e.g. DEL)",
        examples=["DEL"]
    )
    destination: Optional[str] = Field(
        default=None,
        description="3-letter IATA destination airport code (e.g. BOM)",
        examples=["BOM"]
    )
    carrier: Optional[str] = Field(
        default=None,
        description="Airline carrier name (e.g. IndiGo)",
        examples=["IndiGo"]
    )
    date: Optional[str] = Field(
        default=None,
        description="Specific observation date partition formatted as YYYY-MM-DD",
        examples=["2026-09-19"]
    )

    @field_validator("origin", "destination")
    @classmethod
    def validate_airport(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        v = v.strip().upper()
        if not IATA_REGEX.match(v):
            raise ValueError(f"Invalid airport code: '{v}'")
        return v

    @field_validator("route")
    @classmethod
    def validate_route(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        v = v.strip().upper()
        if not ROUTE_REGEX.match(v):
            raise ValueError(f"Invalid route format: '{v}'")
        return v

    @field_validator("carrier")
    @classmethod
    def validate_carrier(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        return v.strip()

    @field_validator("date")
    @classmethod
    def validate_date(cls, v: Optional[str]) -> Optional[str]:
        return parse_and_validate_date_str(v)

    @model_validator(mode="after")
    def reconcile_route(self) -> "LeadTimeAnalysisParams":
        if self.route:
            parts = self.route.split("-")
            if not self.origin:
                self.origin = parts[0]
            if not self.destination:
                self.destination = parts[1]
        elif self.origin and self.destination:
            self.route = f"{self.origin}-{self.destination}"
        return self

class FeeBreakdownItem(BaseModel):
    component: str
    amount: float
    percentage: float

class RouteFeeBreakdown(BaseModel):
    route: str
    avg_gross_fare: float
    breakdown: List[FeeBreakdownItem]

class OilIndicatorRecord(BaseModel):
    date: str
    brent_crude_usd: float

class MacroAnalyticsResponse(BaseModel):
    oil_records: List[OilIndicatorRecord]
    latest_oil_usd: float
    correlation_insight: str

# New schemas for /analytics/overview, /trends, /elasticity, /carriers, /fare-components
class AnalyticsOverview(BaseModel):
    # Required application-level metrics derived from Supabase data
    latest_apix: Optional[float] = Field(default=None, description="Latest RealTime APIx index (All India, T horizon)")
    previous_apix: Optional[float] = Field(default=None, description="Previous RealTime APIx index from prior date partition")
    percentage_change: Optional[float] = Field(default=None, description="Percentage change from previous APIx to latest APIx")
    number_of_observed_fares: int = Field(default=0, description="Total number of flight fare records in the active partition")
    number_of_routes: int = Field(default=0, description="Number of distinct origin-destination routes observed")
    number_of_carriers: int = Field(default=0, description="Number of distinct airline carriers observed")
    lowest_observed_fare: Optional[float] = Field(default=None, description="Minimum gross fare across observed flights")
    median_fare: Optional[float] = Field(default=None, description="Median gross fare across observed flights")
    highest_observed_fare: Optional[float] = Field(default=None, description="Maximum gross fare across observed flights")
    latest_observation_date: str = Field(default="", description="Date of the latest observation partition (YYYY-MM-DD)")

    # Documentation notes for omitted/uncomputable metrics per contract
    omitted_metrics_notes: Optional[Dict[str, str]] = Field(
        default=None,
        description="Documentation of why any metric could not be derived reliably from existing schemas"
    )

    # Backward-compatibility and contextual fields
    all_india_apix: Optional[float] = None
    total_routes_monitored: Optional[int] = None
    total_flights_analyzed: Optional[int] = None
    average_gross_fare_inr: Optional[float] = None
    lowest_fare_inr: Optional[float] = None
    highest_fare_inr: Optional[float] = None
    brent_crude_usd: Optional[float] = None
    national_inflation_pct: Optional[str] = None
    active_partition_date: Optional[str] = None
    calculation_date: Optional[str] = Field(
        default=None,
        description="Observation partition calculation date (YYYY-MM-DD)",
        examples=["2026-09-19"]
    )

    @model_validator(mode="after")
    def sync_compatibility_fields(self) -> "AnalyticsOverview":
        if self.all_india_apix is None and self.latest_apix is not None:
            self.all_india_apix = self.latest_apix
        if self.latest_apix is None and self.all_india_apix is not None:
            self.latest_apix = self.all_india_apix

        if self.total_routes_monitored is None:
            self.total_routes_monitored = self.number_of_routes
        if self.number_of_routes == 0 and self.total_routes_monitored is not None:
            self.number_of_routes = self.total_routes_monitored

        if self.total_flights_analyzed is None:
            self.total_flights_analyzed = self.number_of_observed_fares
        if self.number_of_observed_fares == 0 and self.total_flights_analyzed is not None:
            self.number_of_observed_fares = self.total_flights_analyzed

        if self.lowest_fare_inr is None:
            self.lowest_fare_inr = self.lowest_observed_fare
        if self.lowest_observed_fare is None and self.lowest_fare_inr is not None:
            self.lowest_observed_fare = self.lowest_fare_inr

        if self.highest_fare_inr is None:
            self.highest_fare_inr = self.highest_observed_fare
        if self.highest_observed_fare is None and self.highest_fare_inr is not None:
            self.highest_observed_fare = self.highest_fare_inr

        if not self.active_partition_date:
            self.active_partition_date = self.latest_observation_date
        if not self.latest_observation_date and self.active_partition_date:
            self.latest_observation_date = self.active_partition_date

        if not self.calculation_date:
            self.calculation_date = self.latest_observation_date or self.active_partition_date
        if not self.latest_observation_date and self.calculation_date:
            self.latest_observation_date = self.calculation_date

        return self

class TrendPoint(BaseModel):
    date: str
    all_india_apix: float
    brent_crude_usd: float
    average_fare_inr: float

class CarrierFareStats(BaseModel):
    carrier: str = Field(description="Airline carrier name")
    observations: int = Field(description="Total observed flights for this carrier")
    available_count: int = Field(default=0, description="Count of flights with status Available")
    sold_out_count: int = Field(default=0, description="Count of flights marked Sold Out / Cancelled")
    minimum: Optional[float] = Field(default=None, description="Minimum observed gross fare in INR")
    median: Optional[float] = Field(default=None, description="Median observed gross fare in INR")
    average: Optional[float] = Field(default=None, description="Mean observed gross fare in INR")
    maximum: Optional[float] = Field(default=None, description="Maximum observed gross fare in INR")

    # Backward compatibility fields
    flight_count: Optional[int] = None
    min_fare: Optional[float] = None
    avg_gross_fare: Optional[float] = None
    max_fare: Optional[float] = None
    market_share_pct: Optional[float] = None
    on_time_performance_est: Optional[str] = None

    @model_validator(mode="after")
    def sync_backwards_compat(self) -> "CarrierFareStats":
        if self.flight_count is None:
            self.flight_count = self.observations
        if self.min_fare is None and self.minimum is not None:
            self.min_fare = self.minimum
        if self.avg_gross_fare is None and self.average is not None:
            self.avg_gross_fare = self.average
        if self.max_fare is None and self.maximum is not None:
            self.max_fare = self.maximum
        return self

CarrierMetric = CarrierFareStats

class CarrierAnalyticsResponse(BaseModel):
    route: Optional[str] = Field(default=None, description="Route filter if applied, or ALL")
    partition_date: Optional[str] = Field(default=None, description="Date of data partition queried (YYYY-MM-DD)")
    horizon: Optional[str] = Field(default=None, description="Time horizon filter if applied")
    currency: str = "INR"
    total_carriers: int = Field(description="Number of distinct carriers observed")
    total_observations: int = Field(default=0, description="Total observed flights across all carriers")
    carriers: List[CarrierFareStats] = Field(description="Comparable fare statistics per carrier")

class CarrierAnalyticsParams(BaseModel):
    route: Optional[str] = Field(
        default=None,
        description="Aviation route corridor (e.g. DEL-BOM)",
        examples=["DEL-BOM"]
    )
    origin: Optional[str] = Field(
        default=None,
        description="3-letter IATA origin airport code (e.g. DEL)",
        examples=["DEL"]
    )
    destination: Optional[str] = Field(
        default=None,
        description="3-letter IATA destination airport code (e.g. BOM)",
        examples=["BOM"]
    )
    carrier: Optional[str] = Field(
        default=None,
        description="Optional airline carrier filter (e.g. IndiGo, Akasa Air)",
        examples=["IndiGo"]
    )
    date: Optional[str] = Field(
        default=None,
        description="Specific observation date partition formatted as YYYY-MM-DD",
        examples=["2026-09-19"]
    )
    horizon: Optional[str] = Field(
        default=None,
        description="Advance-purchase booking window: T, T+1, T+7, T+15, T+30, T+45",
        examples=["T+1"]
    )
    t_window: Optional[str] = Field(
        default=None,
        description="Legacy alias for booking horizon",
        examples=["T+1"]
    )

    @field_validator("origin", "destination")
    @classmethod
    def validate_airport(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        v = v.strip().upper()
        if not IATA_REGEX.match(v):
            raise ValueError(f"Invalid airport code: '{v}'")
        return v

    @field_validator("route")
    @classmethod
    def validate_route(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        v = v.strip().upper()
        if not ROUTE_REGEX.match(v):
            raise ValueError(f"Invalid route format: '{v}'")
        return v

    @field_validator("date")
    @classmethod
    def validate_date(cls, v: Optional[str]) -> Optional[str]:
        return parse_and_validate_date_str(v)

    @field_validator("horizon", "t_window")
    @classmethod
    def validate_horizon(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        v = v.strip().upper()
        if v.startswith("T ") and v[2:].isdigit():
            v = f"T+{v[2:]}"
        if v not in VALID_HORIZONS:
            raise ValueError(f"Invalid horizon: '{v}'")
        return v

    @model_validator(mode="after")
    def reconcile_params(self) -> "CarrierAnalyticsParams":
        if self.horizon is None and self.t_window is not None:
            self.horizon = self.t_window

        if self.route:
            parts = self.route.split("-")
            if not self.origin:
                self.origin = parts[0]
            if not self.destination:
                self.destination = parts[1]
        elif self.origin and self.destination:
            self.route = f"{self.origin}-{self.destination}"
        return self

# ── Trend Analytics Schemas ───────────────────────────────────────────────────

VALID_GRANULARITIES = {"daily", "weekly", "monthly"}

class TimeSeriesPoint(BaseModel):
    date: str = Field(description="Period timestamp/date (YYYY-MM-DD)")
    value: float = Field(description="Aggregated fare value (INR) or index value")
    sample_count: Optional[int] = Field(default=None, description="Number of observed flights in period")
    min_value: Optional[float] = Field(default=None, description="Minimum fare observed in period")
    max_value: Optional[float] = Field(default=None, description="Maximum fare observed in period")

class AnalyticsTrendsResponse(BaseModel):
    route: Optional[str] = None
    origin: Optional[str] = None
    destination: Optional[str] = None
    carrier: Optional[str] = None
    horizon: Optional[str] = None
    date_from: str
    date_to: str
    granularity: str = "daily"
    metric: str = "gross_fare"
    currency: str = "INR"
    series: List[TimeSeriesPoint]

class AnalyticsTrendsParams(BaseModel):
    route: Optional[str] = Field(
        default=None,
        description="Aviation route corridor (e.g. DEL-BOM)",
        examples=["DEL-BOM"]
    )
    origin: Optional[str] = Field(
        default=None,
        description="3-letter IATA origin airport code (e.g. DEL)",
        examples=["DEL"]
    )
    destination: Optional[str] = Field(
        default=None,
        description="3-letter IATA destination airport code (e.g. BOM)",
        examples=["BOM"]
    )
    carrier: Optional[str] = Field(
        default=None,
        description="Airline carrier name (e.g. IndiGo)",
        examples=["IndiGo"]
    )
    horizon: Optional[str] = Field(
        default=None,
        description="Advance-purchase booking window: T, T+1, T+7, T+15, T+30, T+45",
        examples=["T+1"]
    )
    t_window: Optional[str] = Field(
        default=None,
        description="Legacy alias for booking horizon",
        examples=["T+1"]
    )
    date_from: Optional[str] = Field(
        default=None,
        description="Start date for trend series (YYYY-MM-DD)",
        examples=["2026-09-01"]
    )
    date_to: Optional[str] = Field(
        default=None,
        description="End date for trend series (YYYY-MM-DD)",
        examples=["2026-09-19"]
    )
    days: Optional[int] = Field(
        default=None,
        ge=1,
        le=365,
        description="Lookback window in days (e.g. 7, 30, 90)",
        examples=[30]
    )
    granularity: str = Field(
        default="daily",
        description="Time aggregation granularity: daily, weekly, monthly",
        examples=["daily"]
    )
    limit: int = Field(
        default=500,
        ge=1,
        le=1000,
        description="Maximum trend points to return",
        examples=[500]
    )
    offset: int = Field(
        default=0,
        ge=0,
        le=5000,
        description="Zero-indexed pagination offset (maximum: 5000)",
        examples=[0]
    )

    @field_validator("origin", "destination")
    @classmethod
    def validate_airport(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        v = v.strip().upper()
        if not IATA_REGEX.match(v):
            raise ValueError(f"Invalid airport code: '{v}'")
        return v

    @field_validator("route")
    @classmethod
    def validate_route(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        v = v.strip().upper()
        if not ROUTE_REGEX.match(v):
            raise ValueError(f"Invalid route format: '{v}'")
        return v

    @field_validator("horizon", "t_window")
    @classmethod
    def validate_horizon(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        v = v.strip().upper()
        if v.startswith("T ") and v[2:].isdigit():
            v = f"T+{v[2:]}"
        if v not in VALID_HORIZONS:
            raise ValueError(f"Invalid horizon: '{v}'")
        return v

    @field_validator("date_from", "date_to")
    @classmethod
    def validate_dates(cls, v: Optional[str]) -> Optional[str]:
        return parse_and_validate_date_str(v)

    @field_validator("granularity")
    @classmethod
    def validate_granularity(cls, v: str) -> str:
        v_clean = v.strip().lower()
        if v_clean not in VALID_GRANULARITIES:
            raise ValueError(f"Invalid granularity: '{v}'. Supported options: {sorted(list(VALID_GRANULARITIES))}")
        return v_clean

    @model_validator(mode="after")
    def reconcile_and_default_dates(self) -> "AnalyticsTrendsParams":
        if self.horizon is None and self.t_window is not None:
            self.horizon = self.t_window

        if self.route:
            parts = self.route.split("-")
            if not self.origin:
                self.origin = parts[0]
            if not self.destination:
                self.destination = parts[1]
        elif self.origin and self.destination:
            self.route = f"{self.origin}-{self.destination}"

        from datetime import datetime, timedelta
        now = datetime.now()

        # Date defaulting logic based on days / granularity
        if not self.date_to:
            self.date_to = now.strftime("%Y-%m-%d")

        if not self.date_from:
            if self.days is not None:
                self.date_from = (now - timedelta(days=self.days)).strftime("%Y-%m-%d")
            else:
                default_days = 14 if self.granularity == "daily" else (84 if self.granularity == "weekly" else 180)
                self.date_from = (now - timedelta(days=default_days)).strftime("%Y-%m-%d")

        d_from = datetime.strptime(self.date_from, "%Y-%m-%d")
        d_to = datetime.strptime(self.date_to, "%Y-%m-%d")
        if d_from > d_to:
            raise ValueError(f"date_from ({self.date_from}) cannot be after date_to ({self.date_to})")
        if (d_to - d_from).days > 365:
            raise ValueError("Trend query span cannot exceed 365 days.")

        return self

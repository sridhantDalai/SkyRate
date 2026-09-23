import re
from datetime import datetime, date
from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field, field_validator, model_validator, ConfigDict

# ── Validation Helpers ────────────────────────────────────────────────────────

IATA_REGEX = re.compile(r"^[A-Za-z]{3}$")
ROUTE_REGEX = re.compile(r"^[A-Za-z]{3}-[A-Za-z]{3}$")
VALID_HORIZONS = {"T", "T+1", "T+7", "T+15", "T+30", "T+45", "T+60", "T+90"}
VALID_STATUSES = {
    "available": "Available",
    "sold out": "Sold Out",
    "sold out / cancelled": "Sold Out / Cancelled",
    "cancelled": "Sold Out / Cancelled"
}

def parse_and_validate_date_str(v: Optional[str]) -> Optional[str]:
    """
    Validates calendar date format strictly (YYYY-MM-DD or DD_MM_YYYY).
    Prevents arbitrary strings and SQL injection.
    Returns standardized ISO date string YYYY-MM-DD.
    """
    if not v:
        return None
    v = v.strip()
    if not v:
        return None

    # Try YYYY-MM-DD
    for fmt in ("%Y-%m-%d", "%d_%m_%Y", "%d-%m-%Y"):
        try:
            parsed_dt = datetime.strptime(v, fmt)
            return parsed_dt.strftime("%Y-%m-%d")
        except ValueError:
            continue
    raise ValueError(f"Invalid date format: '{v}'. Expected YYYY-MM-DD or DD_MM_YYYY.")

# ── Models ────────────────────────────────────────────────────────────────────

class FareItem(BaseModel):
    ID: str
    route: str
    carrier: str
    flight_number: str
    is_non_stop: bool
    t_window: str
    base_fare: Optional[float] = None
    taxes: Optional[float] = None
    udf_fee: Optional[float] = None
    gross_fare: Optional[float] = None
    status: str = "Available"
    source: str = "SkyRate Network"  # Sanitized from raw OTA scrapers per contract

    @field_validator("source", mode="before")
    @classmethod
    def sanitize_source_field(cls, v: Any) -> str:
        from app.core.sanitizer import sanitize_source_name
        return sanitize_source_name(v)

class LatestFaresParams(BaseModel):
    origin: Optional[str] = Field(
        default=None,
        description="3-letter IATA origin airport code (e.g. DEL, BOM, BLR)",
        examples=["DEL"]
    )
    destination: Optional[str] = Field(
        default=None,
        description="3-letter IATA destination airport code (e.g. BOM, DEL, BLR)",
        examples=["BOM"]
    )
    route: Optional[str] = Field(
        default=None,
        description="Aviation route corridor formatted as ORIGIN-DESTINATION (e.g. DEL-BOM)",
        examples=["DEL-BOM"]
    )
    carrier: Optional[str] = Field(
        default=None,
        description="Airline carrier name (e.g. IndiGo, Air India, SpiceJet, Akasa Air)",
        examples=["IndiGo"]
    )
    horizon: Optional[str] = Field(
        default=None,
        description="Advance-purchase booking window: T, T+1, T+7, T+15, T+30, T+45, T+60, T+90",
        examples=["T+1"]
    )
    t_window: Optional[str] = Field(
        default=None,
        description="Legacy alias for booking horizon",
        examples=["T+1"]
    )
    date: Optional[str] = Field(
        default=None,
        description="Specific observation date partition formatted as YYYY-MM-DD",
        examples=["2026-09-19"]
    )
    status: Optional[str] = Field(
        default=None,
        description="Seat inventory availability filter: Available, Sold Out, Sold Out / Cancelled",
        examples=["Available"]
    )
    nonstop: Optional[bool] = Field(
        default=None,
        description="Filter for direct non-stop flights only (true/false)",
        examples=[True]
    )
    is_non_stop: Optional[bool] = Field(
        default=None,
        description="Legacy alias for nonstop filter",
        examples=[True]
    )
    max_price: Optional[float] = Field(
        default=None,
        gt=0,
        description="Maximum gross airfare price threshold in INR",
        examples=[7500.0]
    )
    min_price: Optional[float] = Field(
        default=None,
        gt=0,
        description="Minimum gross airfare price threshold in INR",
        examples=[3000.0]
    )
    limit: int = Field(
        default=50,
        ge=1,
        le=200,
        description="Maximum flight observations to return per page",
        examples=[50]
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
            raise ValueError(f"Invalid 3-letter IATA airport code: '{v}'")
        return v

    @field_validator("route")
    @classmethod
    def validate_route(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        v = v.strip().upper()
        if not ROUTE_REGEX.match(v):
            raise ValueError(f"Invalid route format: '{v}'. Expected ORIGIN-DESTINATION (e.g. DEL-BOM)")
        return v

    @field_validator("horizon", "t_window")
    @classmethod
    def validate_horizon(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        v = v.strip().upper()
        # Handle query string '+' decoded as space (e.g. 'T 1' -> 'T+1')
        if v.startswith("T ") and v[2:].isdigit():
            v = f"T+{v[2:]}"
        if v not in VALID_HORIZONS:
            raise ValueError(f"Invalid horizon: '{v}'. Valid options: {sorted(list(VALID_HORIZONS))}")
        return v

    @field_validator("date")
    @classmethod
    def validate_date(cls, v: Optional[str]) -> Optional[str]:
        return parse_and_validate_date_str(v)

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        norm = VALID_STATUSES.get(v.strip().lower())
        if not norm:
            raise ValueError(f"Invalid status: '{v}'. Valid options: Available, Sold Out, Sold Out / Cancelled")
        return norm

    @model_validator(mode="after")
    def reconcile_route_and_airports(self) -> "LatestFaresParams":
        if self.horizon is None and self.t_window is not None:
            self.horizon = self.t_window
        if self.nonstop is None and self.is_non_stop is not None:
            self.nonstop = self.is_non_stop
        if self.route:
            parts = self.route.split("-")
            if not self.origin:
                self.origin = parts[0]
            if not self.destination:
                self.destination = parts[1]
        elif self.origin and self.destination:
            self.route = f"{self.origin}-{self.destination}"
        return self

# Alias for backwards compatibility
FareFilterQuery = LatestFaresParams

class LatestFaresResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    partition_date: str = Field(..., description="Observation partition date (YYYY-MM-DD)", examples=["2026-09-19"])
    total: int
    total_count: int = 0
    limit: int
    offset: int
    filters_applied: Dict[str, Any]
    items: List[FareItem]

    @field_validator("partition_date", mode="before")
    @classmethod
    def sanitize_date(cls, v: Any) -> str:
        from app.core.sanitizer import sanitize_partition_date
        return sanitize_partition_date(v)

    @model_validator(mode="after")
    def sync_total(self) -> "LatestFaresResponse":
        if self.total_count == 0 and self.total != 0:
            self.total_count = self.total
        elif self.total == 0 and self.total_count != 0:
            self.total = self.total_count
        return self

# Alias for backwards compatibility
FareListResponse = LatestFaresResponse

class FareHistoryParams(BaseModel):
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
    route: Optional[str] = Field(
        default=None,
        description="Aviation route corridor (e.g. DEL-BOM)",
        examples=["DEL-BOM"]
    )
    carrier: Optional[str] = Field(
        default=None,
        description="Airline carrier name (e.g. IndiGo)",
        examples=["IndiGo"]
    )
    horizon: Optional[str] = Field(
        default=None,
        description="Advance-purchase booking window: T, T+1, T+7, T+15, T+30, T+45",
        examples=["T+7"]
    )
    date_from: Optional[str] = Field(
        default=None,
        description="Start date for historical timeline analysis (YYYY-MM-DD)",
        examples=["2026-09-01"]
    )
    date_to: Optional[str] = Field(
        default=None,
        description="End date for historical timeline analysis (YYYY-MM-DD)",
        examples=["2026-09-19"]
    )
    days: Optional[int] = Field(
        default=None,
        ge=1,
        le=90,
        description="Convenience lookback window in days (e.g. 7, 14, 30)",
        examples=[7]
    )
    limit: int = Field(
        default=50,
        ge=1,
        le=100,
        description="Maximum timeline records to return",
        examples=[50]
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

    @field_validator("horizon")
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

    @model_validator(mode="after")
    def validate_date_range(self) -> "FareHistoryParams":
        from datetime import timedelta
        if self.date_from is None and self.date_to is None and self.days is not None:
            now = datetime.now()
            self.date_to = now.strftime("%Y-%m-%d")
            self.date_from = (now - timedelta(days=self.days)).strftime("%Y-%m-%d")

        if self.date_from and self.date_to:
            d_from = datetime.strptime(self.date_from, "%Y-%m-%d")
            d_to = datetime.strptime(self.date_to, "%Y-%m-%d")
            if d_from > d_to:
                raise ValueError(f"date_from ({self.date_from}) cannot be after date_to ({self.date_to})")
            if (d_to - d_from).days > 90:
                raise ValueError("Date range cannot exceed 90 days.")
        if self.route:
            parts = self.route.split("-")
            if not self.origin:
                self.origin = parts[0]
            if not self.destination:
                self.destination = parts[1]
        elif self.origin and self.destination:
            self.route = f"{self.origin}-{self.destination}"
        return self

class FareHistoryPoint(BaseModel):
    date: str
    route: str
    carrier: str
    horizon: str
    avg_gross_fare: float
    min_gross_fare: float
    max_gross_fare: float
    sample_count: int

class FareHistoryResponse(BaseModel):
    route: Optional[str] = None
    carrier: Optional[str] = None
    horizon: Optional[str] = None
    date_from: str
    date_to: str
    total_points: int
    items: List[FareHistoryPoint]

class FareDistributionParams(BaseModel):
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
    route: Optional[str] = Field(
        default=None,
        description="Aviation route corridor (e.g. DEL-BOM)",
        examples=["DEL-BOM"]
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
    date: Optional[str] = Field(
        default=None,
        description="Specific observation date partition formatted as YYYY-MM-DD",
        examples=["2026-09-19"]
    )
    status: Optional[str] = Field(
        default=None,
        description="Seat inventory availability filter: Available, Sold Out",
        examples=["Available"]
    )
    nonstop: Optional[bool] = Field(
        default=None,
        description="Filter for direct non-stop flights only (true/false)",
        examples=[True]
    )
    is_non_stop: Optional[bool] = Field(
        default=None,
        description="Legacy alias for nonstop filter",
        examples=[True]
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

    @field_validator("horizon")
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

    @field_validator("date")
    @classmethod
    def validate_date(cls, v: Optional[str]) -> Optional[str]:
        return parse_and_validate_date_str(v)

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        norm = VALID_STATUSES.get(v.strip().lower())
        if not norm:
            raise ValueError(f"Invalid status: '{v}'. Valid options: Available, Sold Out, Sold Out / Cancelled")
        return norm

    @model_validator(mode="after")
    def reconcile_route(self) -> "FareDistributionParams":
        if self.nonstop is None and self.is_non_stop is not None:
            self.nonstop = self.is_non_stop
        if self.route:
            parts = self.route.split("-")
            if not self.origin:
                self.origin = parts[0]
            if not self.destination:
                self.destination = parts[1]
        elif self.origin and self.destination:
            self.route = f"{self.origin}-{self.destination}"
        return self

class FareDistributionBucket(BaseModel):
    price_range: str
    min_price: float
    max_price: float
    count: int
    percentage: float

class FareDistributionResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    partition_date: str = Field(..., description="Observation partition date (YYYY-MM-DD)", examples=["2026-09-19"])
    route: Optional[str] = None
    carrier: Optional[str] = None
    horizon: Optional[str] = None
    currency: str = "INR"
    sample_size: int
    min_fare: float
    max_fare: float
    median_fare: float
    p25_fare: float
    p75_fare: float
    std_dev: float
    buckets: List[FareDistributionBucket]

    @field_validator("partition_date", mode="before")
    @classmethod
    def sanitize_date(cls, v: Any) -> str:
        from app.core.sanitizer import sanitize_partition_date
        return sanitize_partition_date(v)

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator, ConfigDict

class APIxIndexRecord(BaseModel):
    State: str
    Time_Horizon: str
    MoSPI_Base: float
    Basket_Inflation: str
    RealTime_APIx: float

class IndexItem(BaseModel):
    state: str
    time_horizon: str
    mospi_base: float
    basket_inflation: str
    real_time_apix: float

class IndexFilterParams(BaseModel):
    state: Optional[str] = Field(
        default=None,
        description="Filter by Indian State or 'All India' (e.g. Delhi, Maharashtra, All India)",
        examples=["Delhi"]
    )
    route: Optional[str] = Field(
        default=None,
        description="Filter by aviation corridor mapped to origin state (e.g. DEL-BOM)",
        examples=["DEL-BOM"]
    )
    carrier: Optional[str] = Field(
        default=None,
        description="Optional carrier filter (note: macro index aggregates across carriers)",
        examples=["IndiGo"]
    )
    horizon: Optional[str] = Field(
        default=None,
        description="Advance-purchase booking window (e.g. T, T+1, T+7, T+15, T+30, T+45)",
        examples=["T+1"]
    )
    limit: int = Field(
        default=50,
        ge=1,
        le=200,
        description="Maximum index records to return",
        examples=[50]
    )
    offset: int = Field(
        default=0,
        ge=0,
        le=5000,
        description="Zero-indexed pagination offset (maximum: 5000)",
        examples=[0]
    )

class LatestIndexResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    partition_date: str = Field(..., description="Observation partition date (YYYY-MM-DD)", examples=["2026-09-19"])
    total: int
    limit: int
    offset: int
    filters_applied: Dict[str, Any]
    items: List[IndexItem]

    @field_validator("partition_date", mode="before")
    @classmethod
    def sanitize_date(cls, v: Any) -> str:
        from app.core.sanitizer import sanitize_partition_date
        return sanitize_partition_date(v)

class IndexOverview(BaseModel):
    model_config = ConfigDict(extra="ignore")

    partition_date: str = Field(..., description="Observation partition date (YYYY-MM-DD)", examples=["2026-09-19"])
    all_india: List[APIxIndexRecord]
    states: List[APIxIndexRecord]
    updated_at: str

    @field_validator("partition_date", mode="before")
    @classmethod
    def sanitize_date(cls, v: Any) -> str:
        from app.core.sanitizer import sanitize_partition_date
        return sanitize_partition_date(v)

class StateIndexComparison(BaseModel):
    state: str
    latest_apix: float
    mospi_base: float
    basket_inflation: str
    horizons: List[APIxIndexRecord]

class IndexHistoryItem(BaseModel):
    date: str
    state: str
    time_horizon: str
    apix: float
    mospi_base: float
    basket_inflation: str

class IndexComparisonItem(BaseModel):
    entity: str
    current_apix: float
    mospi_base: float
    inflation_rate: str
    divergence_pct: float

class IndexCompareResponse(BaseModel):
    benchmark: str = "MoSPI 2024 Base"
    comparisons: List[IndexComparisonItem]

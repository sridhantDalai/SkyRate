from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class FarePayload(BaseModel):
    ID: str
    route: str
    carrier: str
    flight_number: str
    is_non_stop: bool
    t_window: str
    base_fare: Optional[float] = None
    taxes: Optional[float] = None
    udf_fee: Optional[float] = None           # User Development Fee (if separable)
    convenience_fee: Optional[float] = None
    gross_fare: Optional[float] = None
    status: str = Field(default="Available")  # "Available", "Sold Out", "Cancelled"
    source: str
    extracted_at: datetime = Field(default_factory=datetime.now)

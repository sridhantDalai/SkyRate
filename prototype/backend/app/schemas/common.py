from typing import Generic, TypeVar, Optional, Any, Dict
from pydantic import BaseModel, Field
from datetime import datetime

T = TypeVar("T")

class ErrorDetail(BaseModel):
    code: str = Field(
        description="Machine-readable error code string",
        examples=["INVALID_QUERY_PARAMETER", "NOT_FOUND", "DATABASE_ERROR", "INTERNAL_SERVER_ERROR"]
    )
    message: str = Field(
        description="Human-readable explanation of the error",
        examples=["Invalid query parameter 'horizon': Unsupported horizon 'T+999'"]
    )
    details: Dict[str, Any] = Field(
        default_factory=dict,
        description="Structured error context details and validation failure breakdown",
        examples=[{"parameter": "horizon", "location": "query"}]
    )

class ErrorEnvelope(BaseModel):
    success: bool = Field(
        default=False,
        description="Boolean status indicating failure (always false for errors)",
        examples=[False]
    )
    error: ErrorDetail = Field(description="Encapsulated error details")

class ResponseEnvelope(BaseModel, Generic[T]):
    success: bool = Field(
        default=True,
        description="Boolean status indicating successful request processing",
        examples=[True]
    )
    data: T = Field(description="Primary payload data returned by the endpoint")
    message: Optional[str] = Field(
        default=None,
        description="Informative human-readable status message",
        examples=["Operation completed successfully."]
    )
    timestamp: datetime = Field(
        default_factory=datetime.now,
        description="ISO-8601 UTC server timestamp when the response was generated"
    )

class HealthResponse(BaseModel):
    status: str = Field(
        default="ok",
        description="Operational health status of the application layer",
        examples=["ok"]
    )
    service: str = Field(
        default="skyrate-backend",
        description="Unique identifier of the microservice backend",
        examples=["skyrate-backend"]
    )
    database: str = Field(
        description="Live Supabase PostgreSQL database connectivity status",
        examples=["connected", "disconnected"]
    )

class HealthStatus(BaseModel):
    status: str = "ok"
    environment: str
    supabase_connected: bool
    active_scraped_table: str
    active_index_table: str
    timestamp: datetime = Field(default_factory=datetime.now)

STANDARD_ERROR_RESPONSES: Dict[int, Dict[str, Any]] = {
    401: {
        "model": ErrorEnvelope,
        "description": "Unauthorized — Authentication credentials missing or invalid.",
        "content": {
            "application/json": {
                "example": {
                    "success": False,
                    "error": {
                        "code": "UNAUTHORIZED",
                        "message": "Administrative credentials required.",
                        "details": {}
                    }
                }
            }
        }
    },
    403: {
        "model": ErrorEnvelope,
        "description": "Forbidden — Caller does not possess required administrative permissions.",
        "content": {
            "application/json": {
                "example": {
                    "success": False,
                    "error": {
                        "code": "FORBIDDEN",
                        "message": "Invalid administrative credentials.",
                        "details": {}
                    }
                }
            }
        }
    },
    413: {
        "model": ErrorEnvelope,
        "description": "Payload Too Large — Request body exceeds the 1 MB maximum allowed limit.",
        "content": {
            "application/json": {
                "example": {
                    "success": False,
                    "error": {
                        "code": "PAYLOAD_TOO_LARGE",
                        "message": "Request payload exceeds maximum allowed size of 1048576 bytes (1 MB).",
                        "details": {"max_bytes": 1048576}
                    }
                }
            }
        }
    },
    400: {
        "model": ErrorEnvelope,
        "description": "Bad Request — Malformed request syntax or invalid filter arguments.",
        "content": {
            "application/json": {
                "example": {
                    "success": False,
                    "error": {
                        "code": "BAD_REQUEST",
                        "message": "Malformed request parameters.",
                        "details": {}
                    }
                }
            }
        }
    },
    404: {
        "model": ErrorEnvelope,
        "description": "Not Found — The specified resource, route, or database partition was not found.",
        "content": {
            "application/json": {
                "example": {
                    "success": False,
                    "error": {
                        "code": "NOT_FOUND",
                        "message": "Route 'DEL-XYZ' not found in monitored database.",
                        "details": {"resource": "route", "identifier": "DEL-XYZ"}
                    }
                }
            }
        }
    },
    422: {
        "model": ErrorEnvelope,
        "description": "Validation Error — Invalid query parameter, schema mismatch, or out-of-range value.",
        "content": {
            "application/json": {
                "example": {
                    "success": False,
                    "error": {
                        "code": "INVALID_QUERY_PARAMETER",
                        "message": "horizon: Value error, Invalid horizon: 'T+999'. Valid options: ['T', 'T+1', 'T+7', 'T+15', 'T+30', 'T+45', 'T+60', 'T+90']",
                        "details": {
                            "errors": [
                                {
                                    "field": "horizon",
                                    "message": "Invalid horizon: 'T+999'",
                                    "location": "query"
                                }
                            ]
                        }
                    }
                }
            }
        }
    },
    500: {
        "model": ErrorEnvelope,
        "description": "Internal Server Error — Unexpected failure with all sensitive traces sanitized.",
        "content": {
            "application/json": {
                "example": {
                    "success": False,
                    "error": {
                        "code": "INTERNAL_SERVER_ERROR",
                        "message": "An unexpected server error occurred.",
                        "details": {}
                    }
                }
            }
        }
    },
    503: {
        "model": ErrorEnvelope,
        "description": "Service Unavailable — Supabase database connection timeout or network outage.",
        "content": {
            "application/json": {
                "example": {
                    "success": False,
                    "error": {
                        "code": "DATABASE_ERROR",
                        "message": "Database operation failed. Please try again later.",
                        "details": {"service": "database"}
                    }
                }
            }
        }
    }
}

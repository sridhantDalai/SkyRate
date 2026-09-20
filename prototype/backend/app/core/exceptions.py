import re
from typing import Union, Dict, Any, Optional
from pydantic import ValidationError
from fastapi import HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from app.core.logging import logger

def sanitize_message(message: str) -> str:
    """
    Ensures no stack traces, SQL, Supabase credentials, internal file paths,
    or environment variables leak into client error responses.
    """
    if not message:
        return "An error occurred."

    # 1. Credentials, API keys, passwords, connection strings
    sensitive_patterns = [
        r"sb_secret_[a-zA-Z0-9_\-]+",
        r"sb_publishable_[a-zA-Z0-9_\-]+",
        r"postgresql://[^@\s]+@[^\s]+",
        r"password\s*=\s*['\"][^'\"]+['\"]",
        r"bearer\s+[a-zA-Z0-9_\-\.]+",
        r"eyJ[a-zA-Z0-9_\-]{10,}\.[a-zA-Z0-9_\-]{10,}\.[a-zA-Z0-9_\-]+",
        r"service_role[_\-\s]*key\s*[:=]\s*[^\s,]+",
    ]
    for pattern in sensitive_patterns:
        if re.search(pattern, message, re.IGNORECASE):
            return "A secure service error occurred. Sensitive information was redacted."

    # 2. Raw SQL statements or database catalog internals
    sql_patterns = [
        r"\bselect\b.*\bfrom\b",
        r"\binsert\b\s+into\b",
        r"\bdelete\b\s+from\b",
        r"\bupdate\b.*\bset\b",
        r"\bdrop\b\s+table\b",
        r"\bcreate\b\s+table\b",
        r"\bpg_catalog\b",
    ]
    for pattern in sql_patterns:
        if re.search(pattern, message, re.IGNORECASE):
            return "Database query error. Query details were redacted."

    # 3. File paths (Windows: C:\... or Unix: /Users/..., /home/...)
    message = re.sub(r'[A-Za-z]:\\[^:\s\n,]+', '[REDACTED_PATH]', message)
    message = re.sub(r'/(?:Users|home|usr|app|var|tmp)/[^\s\n,]+', '[REDACTED_PATH]', message)

    # 4. Environment variable names with values
    message = re.sub(r'(SUPABASE_URL|SUPABASE_SECRET_KEY|SUPABASE_DB_URL)=[^\s,]+', r'\1=[REDACTED]', message)

    # 5. Standalone JWT / service-role style tokens
    message = re.sub(r'eyJ[a-zA-Z0-9_\-]{10,}\.[a-zA-Z0-9_\-]{10,}\.[a-zA-Z0-9_\-]+', '[REDACTED_TOKEN]', message)

    return message

class SkyRateException(Exception):
    """Base application exception with structured error code and details."""
    def __init__(
        self,
        message: str,
        code: str = "SKYRATE_ERROR",
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)

class ResourceNotFoundException(SkyRateException):
    """Raised when a specific query (route, flight, state) yields no results."""
    def __init__(self, resource: str, identifier: str):
        super().__init__(
            message=f"{resource} '{identifier}' not found.",
            code="NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
            details={"resource": resource, "identifier": identifier}
        )

class PartitionNotFoundException(SkyRateException):
    """Raised when the target date partition is unavailable in Supabase."""
    def __init__(self, table_or_date: str):
        from app.core.sanitizer import sanitize_partition_date
        clean_date = sanitize_partition_date(table_or_date)
        super().__init__(
            message=f"Data partition for date '{clean_date}' not found. Observation records may not be available for this date.",
            code="PARTITION_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
            details={"partition_date": clean_date}
        )

class DatabaseException(SkyRateException):
    """Raised when a database query or connection fails."""
    def __init__(self, message: str = "Database operation failed. Please try again later.", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            code="DATABASE_ERROR",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            details=details or {"service": "database"}
        )

class PayloadTooLargeException(SkyRateException):
    """Raised when incoming request body exceeds the configured maximum byte limit."""
    def __init__(self, max_bytes: int = 1048576, actual_bytes: Optional[int] = None):
        super().__init__(
            message=f"Request payload exceeds maximum allowed size of {max_bytes} bytes (1 MB).",
            code="PAYLOAD_TOO_LARGE",
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            details={"max_bytes": max_bytes, "actual_bytes": actual_bytes}
        )


class RateLimitExceededException(SkyRateException):
    """Raised when request rate exceeds configured sliding window quota."""
    def __init__(self, limit: int = 60, window_seconds: int = 60, retry_after: int = 60):
        super().__init__(
            message=f"Rate limit exceeded. Maximum {limit} requests per {window_seconds}s allowed. Try again in {retry_after} seconds.",
            code="RATE_LIMIT_EXCEEDED",
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            details={"limit": limit, "window_seconds": window_seconds, "retry_after": retry_after}
        )

class InvalidParameterException(SkyRateException):
    """Raised when an invalid query or path parameter is supplied."""
    def __init__(self, parameter: str, reason: str, location: str = "query"):
        super().__init__(
            message=f"Invalid {location} parameter '{parameter}': {reason}",
            code="INVALID_QUERY_PARAMETER" if location == "query" else "VALIDATION_ERROR",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details={"parameter": parameter, "location": location, "reason": reason}
        )

def format_error_response(code: str, message: str, details: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Formats standardized error contract with backward-compatible success flag."""
    return {
        "success": False,
        "error": {
            "code": code,
            "message": sanitize_message(message),
            "details": details if details is not None else {}
        }
    }

async def skyrate_exception_handler(request: Request, exc: SkyRateException) -> JSONResponse:
    logger.error(f"SkyRateException [{exc.code}] on {request.url.path}: {exc.message}")
    return JSONResponse(
        status_code=exc.status_code,
        content=format_error_response(
            code=exc.code,
            message=exc.message,
            details=exc.details
        )
    )

async def validation_exception_handler(request: Request, exc: Union[RequestValidationError, ValidationError]) -> JSONResponse:
    errors = exc.errors()
    msg_parts = []
    error_details = []
    is_query_param = False

    for err in errors:
        loc = [str(x) for x in err.get("loc", ())]
        field = loc[-1] if loc else "request"
        location = loc[0] if loc else "body"

        loc_str_list = [l.lower() for l in loc]
        if "query" in loc_str_list or field in request.query_params or (request.method in ["GET", "HEAD", "DELETE"] and "body" not in loc_str_list):
            is_query_param = True
            location = "query"

        err_msg = err.get("msg", "Invalid value")
        sanitized_err_msg = sanitize_message(err_msg)
        msg_parts.append(f"{field}: {sanitized_err_msg}")
        error_details.append({
            "field": field,
            "message": sanitized_err_msg,
            "location": location
        })

    code = "INVALID_QUERY_PARAMETER" if is_query_param else "VALIDATION_ERROR"
    summary_message = "; ".join(msg_parts) if msg_parts else "Request validation failed."
    logger.warning(f"Validation error ({code}) on {request.url.path}: {summary_message}")

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=format_error_response(
            code=code,
            message=summary_message,
            details={"errors": error_details}
        )
    )

async def http_exception_handler(request: Request, exc: Any) -> JSONResponse:
    detail_msg = getattr(exc, "detail", str(exc))
    status_code = getattr(exc, "status_code", status.HTTP_500_INTERNAL_SERVER_ERROR)
    logger.warning(f"HTTPException [{status_code}] on {request.url.path}: {detail_msg}")

    status_code_map = {
        status.HTTP_400_BAD_REQUEST: "BAD_REQUEST",
        status.HTTP_401_UNAUTHORIZED: "UNAUTHORIZED",
        status.HTTP_403_FORBIDDEN: "FORBIDDEN",
        status.HTTP_404_NOT_FOUND: "NOT_FOUND",
        status.HTTP_405_METHOD_NOT_ALLOWED: "METHOD_NOT_ALLOWED",
        status.HTTP_422_UNPROCESSABLE_ENTITY: "VALIDATION_ERROR",
        status.HTTP_429_TOO_MANY_REQUESTS: "RATE_LIMIT_EXCEEDED",
        status.HTTP_500_INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
        status.HTTP_503_SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
    }
    code = status_code_map.get(status_code, f"HTTP_{status_code}")

    return JSONResponse(
        status_code=status_code,
        content=format_error_response(
            code=code,
            message=str(detail_msg),
            details={"status_code": status_code}
        )
    )


async def database_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error(f"Database error on {request.url.path}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content=format_error_response(
            code="DATABASE_ERROR",
            message="Database operation failed. Please try again later.",
            details={"service": "database"}
        )
    )

async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception(f"Unhandled error on {request.url.path}: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=format_error_response(
            code="INTERNAL_SERVER_ERROR",
            message="An unexpected server error occurred.",
            details={}
        )
    )

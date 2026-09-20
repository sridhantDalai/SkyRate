"""
SkyRate Request Size Limit Middleware
=====================================

Defends against HTTP body flooding, large payload denial-of-service,
and unbounded memory consumption by enforcing a strict maximum request
body size (default 1 MB / 1,048,576 bytes).
"""

from typing import Optional
from starlette.types import ASGIApp, Scope, Receive, Send
from starlette.responses import JSONResponse
from fastapi import status
from app.core.config import settings
from app.core.logging import logger
from app.core.exceptions import format_error_response, PayloadTooLargeException


class RequestSizeLimitMiddleware:
    """
    ASGI middleware that rejects request payloads larger than configured maximum bytes.
    Enforces limits both via Content-Length header fast-path and streaming chunk accumulation.
    """

    def __init__(self, app: ASGIApp, max_bytes: Optional[int] = None):
        self.app = app
        self.max_bytes = max_bytes

    def _get_max_bytes(self) -> int:
        if self.max_bytes is not None:
            return self.max_bytes
        return getattr(settings, "MAX_REQUEST_BODY_BYTES", 1024 * 1024)

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        max_limit = self._get_max_bytes()

        # 1. Fast-path check: Content-Length header
        content_length_header = None
        for name, val in scope.get("headers", []):
            if name.lower() == b"content-length":
                content_length_header = val
                break

        if content_length_header:
            try:
                content_length = int(content_length_header.decode("latin1"))
                if content_length > max_limit:
                    logger.warning(
                        f"Request rejected (Content-Length {content_length} > {max_limit} bytes) "
                        f"on {scope.get('method')} {scope.get('path')}"
                    )
                    response = JSONResponse(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        content=format_error_response(
                            code="PAYLOAD_TOO_LARGE",
                            message=f"Request payload exceeds maximum allowed size of {max_limit} bytes (1 MB).",
                            details={
                                "max_bytes": max_limit,
                                "content_length": content_length,
                            }
                        )
                    )
                    await response(scope, receive, send)
                    return
            except ValueError:
                pass

        # 2. Streaming protection: wrap receive to count actual received chunks
        received_bytes = 0
        limit_exceeded = False

        async def limited_receive():
            nonlocal received_bytes, limit_exceeded
            message = await receive()
            if message["type"] == "http.request":
                body = message.get("body", b"")
                received_bytes += len(body)
                if received_bytes > max_limit:
                    limit_exceeded = True
                    logger.warning(
                        f"Request rejected (streamed {received_bytes} > {max_limit} bytes) "
                        f"on {scope.get('method')} {scope.get('path')}"
                    )
                    raise PayloadTooLargeException(max_bytes=max_limit, actual_bytes=received_bytes)
            return message

        try:
            await self.app(scope, limited_receive, send)
        except PayloadTooLargeException as exc:
            response = JSONResponse(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                content=format_error_response(
                    code=exc.code,
                    message=exc.message,
                    details=exc.details
                )
            )
            await response(scope, receive, send)

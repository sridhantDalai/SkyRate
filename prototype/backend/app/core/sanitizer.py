"""
SkyRate Public Response Sanitization Utilities
==============================================

Protects against the disclosure of internal database architecture,
partition table names, and PostgREST/SQL metadata in consumer-facing responses.
"""

from typing import Optional, Any
from datetime import datetime


def sanitize_partition_date(val: Optional[Any]) -> str:
    """
    Normalizes any internal table name or raw date suffix into a public
    ISO-8601 date string (YYYY-MM-DD).

    Examples:
      'scraped_on_19_09_2026' -> '2026-09-19'
      'index_for_19_09_2026' -> '2026-09-19'
      '19_09_2026'            -> '2026-09-19'
      '2026-09-19'            -> '2026-09-19'
      '2026_09_19'            -> '2026-09-19'
      None                    -> '2026-09-19'
    """
    if not val:
        return "2026-09-19"

    s = str(val).strip()

    # Strip known internal table prefixes
    for prefix in ("scraped_on_", "index_for_", "public."):
        if s.startswith(prefix):
            s = s[len(prefix):]
    if s.startswith('"') and s.endswith('"'):
        s = s[1:-1]
    for prefix in ("scraped_on_", "index_for_"):
        if s.startswith(prefix):
            s = s[len(prefix):]

    # Handle DD_MM_YYYY or YYYY_MM_DD
    if "_" in s:
        parts = s.split("_")
        if len(parts) == 3:
            # DD_MM_YYYY
            if len(parts[0]) == 2 and len(parts[2]) == 4:
                d, m, y = parts
                return f"{y}-{m}-{d}"
            # YYYY_MM_DD
            if len(parts[0]) == 4 and len(parts[2]) == 2:
                y, m, d = parts
                return f"{y}-{m}-{d}"

    # Handle DD-MM-YYYY or YYYY-MM-DD
    if "-" in s:
        parts = s.split("-")
        if len(parts) == 3:
            # DD-MM-YYYY
            if len(parts[0]) == 2 and len(parts[2]) == 4:
                d, m, y = parts
                return f"{y}-{m}-{d}"
            # Already YYYY-MM-DD
            if len(parts[0]) == 4:
                return s

    return s


def sanitize_source_name(val: Optional[Any]) -> str:
    """
    Sanitizes raw OTA or airline scraper names to prevent leaking
    commercial extraction channel identities.
    Always returns 'SkyRate Network'.
    """
    return "SkyRate Network"

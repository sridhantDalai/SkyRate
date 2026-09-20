# SkyRate Supabase Security Audit Report

**Date:** September 20, 2026  
**Auditor:** Antigravity AI Security Audit  
**Scope:** `prototype/backend` & Supabase PostgreSQL Database Architecture  
**Reference Document:** `prototype/backend/DATABASE_CONTRACT.md`  
**Status:** Complete (READ-ONLY Analysis — No destructive or permission-changing SQL executed)

---

## 1. Executive Summary

A comprehensive security audit of the SkyRate Supabase database infrastructure, backend access paths, credential handling, and frontend architecture was performed. 

The audit established that while the **FastAPI backend architecture is well-hardened** (featuring sliding-window rate limiting, 1 MB request body caps, pagination bounds, CORS restrictions, and source masking), the **underlying Supabase database permissions allow public bypass** via direct PostgREST requests using the public `anon` key.

### Core Audit Conclusions
1. **Backend Credentials:** The backend uses `SUPABASE_SECRET_KEY` (`service_role` privileged secret) to query PostgREST, effectively bypassing Row Level Security (RLS).
2. **Frontend Exposure:** The frontend has **zero access** to privileged credentials and contains no direct Supabase connections. All traffic flows strictly through FastAPI.
3. **Public Readability:** Active database partition tables (`scraped_on_DD_MM_YYYY` and `index_for_DD_MM_YYYY`) are **directly readable through the public `anon` key via PostgREST**, bypassing all FastAPI security controls.
4. **Row Level Security (RLS):** RLS is **disabled** on all dynamically generated partition tables.
5. **Excessive Grants:** Dynamic partition tables are created with `GRANT ALL ... TO anon, authenticated`, granting `INSERT`, `UPDATE`, `DELETE`, and `TRUNCATE` rights to public clients.
6. **Security Boundary:** The **FastAPI backend is the intended architectural security boundary**, but this boundary is currently circumventable at the database network/API layer.

---

## 2. Detailed Findings by Evaluation Criteria

### Criterion 1: Which credentials does the backend use?
* **Analysis:** Inspected [`app/core/config.py`](file:///E:/SkyRate/prototype/backend/app/core/config.py) and [`app/db/supabase.py`](file:///E:/SkyRate/prototype/backend/app/db/supabase.py).
* **Finding:** 
  - `SupabaseManager.get_client()` explicitly instantiates the client using:
    ```python
    create_client(settings.SUPABASE_URL, settings.SUPABASE_SECRET_KEY)
    ```
  - `SUPABASE_SECRET_KEY` is the Supabase `service_role` secret key. In Supabase, the `service_role` key bypasses PostgreSQL Row Level Security (RLS) by default.
  - In `SupabaseManager.check_database_connectivity()`, the health check probe falls back to `SUPABASE_PUBLISHABLE_KEY` only when `SUPABASE_SECRET_KEY` is not supplied.
* **Security Posture:** Appropriate for a server-side backend acting as the authoritative gateway, provided that direct public access to PostgREST is blocked.

### Criterion 2: Can the frontend ever access privileged credentials?
* **Analysis:** Audited `prototype/frontend` codebase, environment files, and build outputs.
* **Finding:** 
  - **Zero privileged credentials exist in the frontend.** 
  - The frontend environment only defines `NEXT_PUBLIC_API_URL` pointing to the FastAPI backend (`http://localhost:8000/api/v1`).
  - No Supabase client libraries (`@supabase/supabase-js`) or credentials (`SUPABASE_SECRET_KEY`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`) are present in the frontend.
  - All communication is strictly unidirectional: Frontend $\rightarrow$ FastAPI $\rightarrow$ Supabase.
* **Security Posture:** **Secure.** The frontend cannot leak privileged credentials.

### Criterion 3: Are database tables readable through the public `anon` role?
* **Analysis:** Executed a non-destructive live HTTP probe against PostgREST (`https://pojoyxiciafjauryhfrc.supabase.co/rest/v1/`) using the `anon` publishable key:
  ```http
  GET /rest/v1/scraped_on_19_09_2026?select=ID,route,carrier,source&limit=2 HTTP/1.1
  apikey: <SUPABASE_PUBLISHABLE_KEY>
  Authorization: Bearer <SUPABASE_PUBLISHABLE_KEY>
  ```
* **Finding: VULNERABILITY CONFIRMED.**
  - The request returned `HTTP 200 OK` with raw database records:
    ```json
    [
      {"ID": "0ddfedd2", "route": "DEL-BOM", "carrier": "Air India Express", "source": "EaseMyTrip"},
      {"ID": "f3724e6a", "route": "DEL-BOM", "carrier": "Air India Express", "source": "EaseMyTrip"}
    ]
    ```
  - **Risks:**
    1. **Bypasses FastAPI Rate Limiting & Abuse Protections:** An attacker can scrape entire tables without triggering backend quotas or 1 MB payload checks.
    2. **Discloses Commercial OTA Sources:** The raw `source: "EaseMyTrip"` value is exposed in violation of the contract requiring `"SkyRate Network"` masking.
    3. **Exposes Internal Table Structures:** Leaks internal partition table names, schema structure, and column definitions.
* **Security Posture:** **High Risk.** Public `anon` role has direct read permissions.

### Criterion 4: Is Row Level Security (RLS) enabled where appropriate?
* **Analysis:** Checked table definitions in `DATABASE_CONTRACT.md` and live metadata.
* **Finding:**
  - Dynamic partition tables (`scraped_on_DD_MM_YYYY` and `index_for_DD_MM_YYYY`) are created via `CREATE TABLE IF NOT EXISTS` without `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`.
  - In PostgreSQL / Supabase, when RLS is disabled, table permissions fall back entirely to standard role grants (`GRANT ...`).
* **Security Posture:** **Vulnerable.** RLS is currently disabled on all dynamically provisioned partition tables.

### Criterion 5: Do dynamic partition tables have excessive grants?
* **Analysis:** Inspected `DATABASE_CONTRACT.md:L27-28` documenting the DDL generated by the daily ingestion pipeline:
  ```sql
  GRANT ALL ON public."scraped_on_{DD_MM_YYYY}" TO anon, authenticated, service_role;
  GRANT ALL ON public."index_for_{DD_MM_YYYY}" TO anon, authenticated, service_role;
  ```
* **Finding: CRITICAL MISCONFIGURATION.**
  - `GRANT ALL` grants: `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES`, and `TRIGGER`.
  - Assigning `ALL` to `anon` (unauthenticated web users) and `authenticated` (arbitrary logged-in Supabase users) gives public callers write, modify, and delete capabilities directly against the primary airfare partition tables.
* **Security Posture:** **Critical.** The `anon` role must never possess `ALL` permissions.

### Criterion 6: Is the backend the intended security boundary?
* **Analysis:** Evaluated full system architecture and Phase 31–36 defense implementations.
* **Finding:**
  - **The FastAPI backend is unequivocally the intended architectural security perimeter.**
  - The backend encapsulates:
    - IP sliding-window rate limiting (Phase 33)
    - Request payload size protection (Phase 34)
    - Deep-pagination offset caps (Phase 34)
    - Protected cache clear authorization (Phase 34)
    - CORS method whitelisting and credentials prohibition (Phase 35)
    - Response sanitization, internal table masking, and source redaction (Phase 36)
  - Allowing direct PostgREST communication via `anon` invalidates all of these perimeter protections.
* **Security Posture:** **Architecturally Inconsistent.** PostgREST access must be restricted so that FastAPI remains the single gateway.

---

## 3. Database Access Path Inventory

All backend repository queries were audited for credential handling and SQL safety:

| Repository | Function | Target Table | Method | SQL Injection Risk | Credential Used |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `FareRepository` | `get_fares` | `scraped_on_DD_MM_YYYY` | Supabase SDK `.table().select()` | None (Parameterized) | `service_role` |
| `FareRepository` | `get_fares_overview_metrics` | `scraped_on_DD_MM_YYYY` | Supabase SDK `.table().select()` | None (Parameterized) | `service_role` |
| `FareRepository` | `get_lead_time_fares` | `scraped_on_DD_MM_YYYY` | Supabase SDK `.table().select()` | None (Parameterized) | `service_role` |
| `FareRepository` | `get_carrier_fare_records` | `scraped_on_DD_MM_YYYY` | Supabase SDK `.table().select()` | None (Parameterized) | `service_role` |
| `IndexRepository` | `get_latest_indexes` | `index_for_DD_MM_YYYY` | Supabase SDK `.table().select()` | None (Parameterized) | `service_role` |
| `IndexRepository` | `get_apix_overview_metrics` | `index_for_DD_MM_YYYY` | Supabase SDK `.table().select()` | None (Parameterized) | `service_role` |
| `RouteRepository` | `get_all_routes` | `scraped_on_DD_MM_YYYY` | Supabase SDK `.table().select()` | None (Parameterized) | `service_role` |
| `SupabaseManager`| `resolve_active_scraped_table` | `scraped_on_DD_MM_YYYY` | Supabase SDK `.table().select()` | None (Parameterized) | `service_role` |
| `SupabaseManager`| `resolve_active_index_table` | `index_for_DD_MM_YYYY` | Supabase SDK `.table().select()` | None (Parameterized) | `service_role` |

*All backend repository paths utilize parameterized PostgREST builder methods, eliminating SQL injection risks in application code.*

---

## 4. Threat Matrix & Risk Analysis

| Vulnerability ID | Finding | Severity | CVSS v3.1 | Threat Vector | Impact |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SEC-SB-01** | `GRANT ALL TO anon` on partition tables | **CRITICAL** | 9.1 | Public PostgREST API | Public modification, deletion, or corruption of scraped airfare observations. |
| **SEC-SB-02** | Direct PostgREST table readability | **HIGH** | 7.5 | Direct HTTP request with anon key | Total bypass of FastAPI rate limiting, quota enforcement, and payload caps. |
| **SEC-SB-03** | Disclosure of raw OTA scraper sources | **MEDIUM** | 5.3 | Direct query on `source` column | Leakage of scraping targets (e.g. `"EaseMyTrip"`), creating legal/scraping friction. |
| **SEC-SB-04** | Absence of Row Level Security (RLS) | **HIGH** | 7.5 | Direct PostgREST access | Inability to enforce row-level or role-level tenancy policies. |

---

## 5. Recommended Remediation Plan (SQL Migrations)

> ⚠️ **IMPORTANT:** In accordance with audit requirements, the following SQL statements are **recommendations only** and must **NOT** be executed automatically without database administrative authorization and backup procedures.

### Step 1: Revoke Public and Authenticated Grants on Existing Partitions
Revoke excessive permissions from public roles so that only `service_role` can access the tables:

```sql
-- Revoke all permissions from anon and authenticated roles on raw fare tables
REVOKE ALL ON public."scraped_on_19_09_2026" FROM anon, authenticated;

-- Revoke all permissions from anon and authenticated roles on index tables
REVOKE ALL ON public."index_for_19_09_2026" FROM anon, authenticated;

-- Ensure service_role retains authoritative backend access
GRANT SELECT, INSERT, UPDATE, DELETE ON public."scraped_on_19_09_2026" TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."index_for_19_09_2026" TO service_role;
```

### Step 2: Enable Row Level Security (RLS)
Enable RLS to establish PostgreSQL default-deny behavior for non-service roles:

```sql
-- Enable RLS on active partition tables
ALTER TABLE public."scraped_on_19_09_2026" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."index_for_19_09_2026" ENABLE ROW LEVEL SECURITY;

-- Explicit Policy: Allow full access ONLY to service_role (used by FastAPI backend)
CREATE POLICY "service_role_full_access_scraped"
ON public."scraped_on_19_09_2026"
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "service_role_full_access_index"
ON public."index_for_19_09_2026"
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

### Step 3: Configure Default Schema Privileges
Prevent newly created partition tables from automatically inheriting public grants:

```sql
-- Alter default privileges for future tables created in schema public
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
REVOKE ALL ON TABLES FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public 
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;
```

### Step 4: Upstream Pipeline DDL Adjustment (Future Iteration)
When the ML pipeline (`prototype/ML/`) is opened for maintenance in a future phase, update `prototype/ML/ml/daily_pipeline.py:L221-222` to replace:
```python
# CURRENT (VULNERABLE):
# cur.execute(f'GRANT ALL ON public."{scraped_table}" TO anon, authenticated, service_role;')
# cur.execute(f'GRANT ALL ON public."{index_table}" TO anon, authenticated, service_role;')

# RECOMMENDED:
# cur.execute(f'ALTER TABLE public."{scraped_table}" ENABLE ROW LEVEL SECURITY;')
# cur.execute(f'ALTER TABLE public."{index_table}" ENABLE ROW LEVEL SECURITY;')
# cur.execute(f'GRANT ALL ON public."{scraped_table}" TO service_role;')
# cur.execute(f'GRANT ALL ON public."{index_table}" TO service_role;')
```

---

## 6. Verification & Impact on Current Architecture

- **Backend Operation:** Since the FastAPI backend connects using `SUPABASE_SECRET_KEY` (`service_role`), applying the recommended SQL remediation will **not disrupt backend functionality**. The `service_role` key retains full permissions to read, query, and aggregate all partitions.
- **Frontend Operation:** Since the frontend communicates exclusively through FastAPI endpoints (`http://localhost:8000/api/v1`), frontend features are **completely unaffected**.
- **Perimeter Defense:** Revoking public PostgREST grants enforces the FastAPI application as the **mandatory, sole security gateway** for all consumer queries.

# SkyRate Data Freshness & Statistical Integrity Audit

**Date:** September 20, 2026  
**Auditor:** Antigravity AI — Data Architecture & Statistical Verification  
**Scope:** `prototype/backend` consumption of finalized Supabase & ML data  
**Status:** Complete (READ-ONLY verification of `prototype/ML/`)

---

## 1. Executive Summary

A comprehensive data freshness and statistical integrity audit was performed on the SkyRate FastAPI backend to verify that it consumes, aggregates, and serves data from the upstream ML pipeline and Supabase PostgreSQL partitions with 100% mathematical fidelity.

The audit verified that:
1. **The backend NEVER recalculates the finalized ML index values.** It faithfully extracts `RealTime_APIx`, `MoSPI_Base`, and `Basket_Inflation` as calculated by `index_calculator.py`.
2. **Gross fare vs. Base fare semantics** are strictly maintained: `gross_fare` ($	ext{base\_fare} + 	ext{taxes} + 	ext{udf\_fee}$) is the single authoritative metric used for consumer-facing price distributions, percentiles, and trend indicators.
3. **Cancelled / Sold-out observations** (`gross_fare IS NULL`) are safely excluded from continuous price statistics while accurately tracked in `sold_out_count`.
4. **Carrier normalization** handles inconsistencies between scraper raw naming (`AkasaAir`) and UI/metadata specifications (`Akasa Air`).

---

## 2. 15-Point Statistical Integrity Verification Checklist

| Dimension | Upstream ML / DB Contract | Backend Consumption Reality | Status |
| :--- | :--- | :--- | :--- |
| **1. Gross Fare vs Base Fare** | `gross_fare = base_fare + taxes + udf_fee`. Null when sold out/cancelled. | Backend strictly uses `gross_fare` for all analytical distributions, min/max bounds, medians, and averages. | **PASS** |
| **2. Taxes & Fees Handling** | `taxes` has airport UDF subtracted: $\max(0.0, 	ext{raw\_tax} - 	ext{udf\_fee})$. `udf_fee` always present. | `RouteFeeBreakdown` decomposes fare into base fare, fuel surcharge, GST, and UDF per DGCA AIC circulars. | **PASS** |
| **3. `t_window` Interpretation** | Partition values: `"T"`, `"T+1"`, `"T+7"`, `"T+15"`, `"T+30"`, `"T+45"`. | Bounded set: `VALID_HORIZONS`. Legacy `T 1` or query param `t_window` normalized to canonical `"T+1"`. | **PASS** |
| **4. Route Normalization** | Always uppercase `^[A-Z]{3}-[A-Z]{3}$` (e.g. `"DEL-BOM"`). | Enforces uppercase regex and synchronizes `origin`/`destination` automatically. | **PASS** |
| **5. Carrier Normalization** | Scraper produces `"AkasaAir"`; metadata uses `"Akasa Air"`. | Filter query normalizer maps `"Akasa Air"` $\leftrightarrow$ `"AkasaAir"`. Carrier analytics canonicalizes to `"Akasa Air"`. | **PASS (Resolved in Phase 42)** |
| **6. Date Boundaries** | Dynamic partition tables: `scraped_on_{DD_MM_YYYY}` and `index_for_{DD_MM_YYYY}`. | Dual ISO (`YYYY-MM-DD`) and legacy (`DD_MM_YYYY`) parsing implemented; strict date range caps enforced. | **PASS** |
| **7. Missing Values Handling** | Sold-out flights have `NULL` (`NaN`) for base fare, taxes, and gross fare. | Filtered via `gross_fare IS NOT NULL` before numerical statistics; counted in `sold_out_count`. | **PASS** |
| **8. Duplicate Observations** | Pipeline runs SQL `DELETE WHERE route != '__SKYRATE_NEVER_MATCH__'` on same-day reruns. | Backend assigns 8-hex character `ID` and deduplicates records. | **PASS** |
| **9. Outlier Representation** | Isolation Forest / IQR filtering removes glitched fares in ML pipeline. | Backend computes non-parametric distribution (median, p25, p75, histogram buckets) to prevent skew. | **PASS** |
| **10. Index Values Fidelity** | Computed via Fisher Ideal formula (geometric mean of Laspeyres and Paasche). | **Zero recalculation.** The backend queries and delivers raw `RealTime_APIx` without alteration. | **PASS** |
| **11. State-Wise Index** | Mapped to origin departure state (e.g. `DEL` $ightarrow$ `Delhi`). | Serves exact state-level partitions (`/api/v1/indexes/state/{state_name}`). | **PASS** |
| **12. All-India Index** | National weighted index (`State = "All India"`). | Extracted directly for executive overview (`/api/v1/analytics/overview`). | **PASS** |
| **13. Calculation Date** | Partition date converted to canonical ISO string. | Returned in `LatestIndexResponse`, `IndexOverview`, and `AnalyticsOverview` as `calculation_date`. | **PASS** |
| **14. Data Freshness & Stale Fallbacks** | Probes active partition up to 7 days in the past. | Transparently sets `partition_date` and `calculation_date` to actual partition vintage; calibrated fallbacks. | **PASS** |
| **15. Median / Aggregate Semantics** | Uses `statistics.median` or PostgreSQL `percentile_cont(0.5)`. | Continuous variable middle-rank semantics preserved; no arbitrary row truncation. | **PASS** |

---

## 3. Discovered Edge Cases & Remediations

### Edge Case 1: Scraper Carrier Naming Discrepancy (`AkasaAir` vs `Akasa Air`)
- **Discovery:** The scraper ingestion pipeline stored `"AkasaAir"` (no space), while UI filter bars and official metadata schemas define `"Akasa Air"` (with space). Queries for `carrier=Akasa Air` previously returned 0 records against live Supabase data.
- **Remediation:**
  1. In `FareRepository`: Added `normalize_carrier_filter()` which maps `"Akasa Air"` to search term `"Akasa"`, matching both `"Akasa Air"` and `"AkasaAir"` across database partitions and fallback datasets.
  2. In `AnalyticsService.get_carriers_analytics()`: Canonicalizes all group keys to `"Akasa Air"`.
  3. Added `carrier` query parameter to `CarrierAnalyticsParams` schema.
- **Verification:** Live queries against `scraped_on_19_09_2026` confirmed both `carrier=Akasa Air` and `carrier=AkasaAir` return all 342 observations.

---

## 4. Verification Suite

All 124 backend tests passed:
- `test_phase42_carrier_normalization_akasa`: Confirms matching and canonical naming for Akasa Air.
- `test_phase42_statistical_integrity_gross_fare_and_sold_out`: Validates min <= median <= max bounding and observation counts (`observations = available_count + sold_out_count`).
- Total suite execution: `124 passed in 40.23s`.

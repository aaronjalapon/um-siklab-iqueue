# IQueue — Data Quality Report

**Generated:** 2026-05-30 20:37:29

## Overview

| Metric | Value |
|---|---|
| Row count (raw) | 86,777 |
| Row count (cleaned) | 86,777 |
| Duplicates removed | 0 |
| Outliers flagged | 0 |
| Date range | 2026-01-01 to 2026-03-31 |

## Missing Value Rates (Before Imputation)

| Field | Missing Count |
|---|---|
| bus_id | 0 (0.00%) |
| departure_date | 0 (0.00%) |
| passenger_id | 0 (0.00%) |
| seat_number | 0 (0.00%) |

**Rows removed due to critical missing values:** 0

## Cleaning Steps Applied

1. **Deduplication** — removed duplicate `passenger_id + bus_id + departure_date` records
2. **Date normalization** — all date columns converted to ISO YYYY-MM-DD
3. **Missing value imputation** — rows with missing critical fields removed
4. **Outlier flagging** — anomalous records flagged in `outlier_flags` column (not dropped)
5. **ASEAN holiday join** — binary `is_holiday` and `holiday_name` columns added
6. **Feature engineering** — `day_of_week`, `is_weekend`, `month` derived from departure date

## Data Source

- Input directory: `data/raw`
- Source: Synthetic (generated)

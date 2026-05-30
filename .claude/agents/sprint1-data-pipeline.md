# Agent Task: Sprint 1 — Data Pipeline & Environment Setup

**Sprint dates:** May 1–15, 2026
**Goal:** Cleaned and DVC-versioned ridership dataset; working local dev environment; PostgreSQL schema established.

---

## Context

You are setting up the foundation for IQueue. No code exists yet. Work systematically through each phase below. After completing each phase, confirm completion before moving to the next.

---

## Phase 1 — Project Scaffolding

Create the full project directory structure as defined in `CLAUDE.md`. Then:

1. Initialize a Git repository at the project root.
2. Create a `.gitignore` that covers: `.env`, `__pycache__`, `.venv`, `*.pkl`, `*.pt`, `node_modules`, `.dvc/cache`.
3. Copy `.env.example` with all required variable keys (empty values).
4. Initialize DVC: `dvc init` and commit the `.dvc/` folder.

---

## Phase 2 — Backend Python Environment

Inside `backend/`:

1. Create a Python 3.11 virtual environment: `python -m venv .venv`
2. Create `requirements.txt` with these packages (use latest stable versions):
   - `fastapi`, `uvicorn[standard]`
   - `sqlalchemy[asyncio]`, `asyncpg`, `alembic`
   - `pydantic[email]`, `pydantic-settings`
   - `python-dotenv`
   - `qrcode[pil]`
   - `ruff`, `black` (dev)
   - `pytest`, `pytest-asyncio`, `httpx` (dev)
3. Install: `pip install -r requirements.txt`
4. Create `requirements-dev.txt` for dev-only dependencies.

---

## Phase 3 — PostgreSQL Schema & Alembic

Design and implement the initial database schema. Create SQLAlchemy models for:

| Model | Key Fields |
|---|---|
| `Tenant` | id, name, country, created_at |
| `BusRoute` | id, tenant_id, origin, destination, distance_km |
| `Bus` | id, tenant_id, route_id, capacity, plate_number |
| `Passenger` | id, tenant_id, name, phone, language_pref, travel_habits |
| `Booking` | id, passenger_id, bus_id, seat_number, boarding_window, status, qr_token |
| `SurgeForecast` | id, route_id, forecast_date, surge_probability, predicted_volume |

Rules:
- All models inherit from a `Base` with `created_at` and `updated_at` timestamps.
- Use UUIDs as primary keys (PostgreSQL `UUID` type).
- Foreign keys must have cascade delete rules defined.

After creating models:
1. Generate the initial Alembic migration: `alembic revision --autogenerate -m "initial schema"`
2. Review the generated migration file carefully.
3. Apply it: `alembic upgrade head`

---

## Phase 4 — Data Collection & Cleaning Pipeline

Create `ml/forecasting/data/` and a cleaning pipeline at `data/pipeline/clean.py`:

1. Script must:
   - Load raw ridership CSV data
   - Remove duplicate booking records (deduplicate on `passenger_id + route + date`)
   - Impute missing ridership counts using 7-day rolling route-level average
   - Normalize all date columns to `YYYY-MM-DD` ISO format
   - Flag and log outlier records (zero-ridership days) without dropping them
   - Join ASEAN cultural holiday calendar as binary surge flag columns
   - Export cleaned data to `ml/forecasting/data/cleaned/ridership_cleaned.csv`

2. After running the pipeline, DVC-track the output:
   ```bash
   dvc add ml/forecasting/data/cleaned/ridership_cleaned.csv
   git add ml/forecasting/data/cleaned/ridership_cleaned.csv.dvc
   git commit -m "data: add cleaned ridership dataset v1"
   ```

3. Write a brief data quality report to `ml/forecasting/data/DATA_REPORT.md` including:
   - Row count before and after cleaning
   - Number of outlier records flagged
   - Date range covered
   - Missing value rates per column before imputation

---

## Phase 5 — Dev Environment Verification Checklist

Verify all of the following before marking Sprint 1 complete:

- [ ] Git repository initialized and `.gitignore` correct
- [ ] DVC initialized and `.dvc/` committed
- [ ] `backend/.venv` created and dependencies installed
- [ ] `alembic upgrade head` runs without errors
- [ ] All 6 ORM models reflected in PostgreSQL
- [ ] `data/pipeline/clean.py` runs end-to-end without errors
- [ ] Cleaned dataset DVC-tracked and committed
- [ ] `DATA_REPORT.md` written
- [ ] FastAPI server starts: `uvicorn app.main:app --reload` (even with placeholder routes)

# Agent Task: Sprint 2 — Backend API + AI Models

**Sprint dates:** May 16–31, 2026
**Goal:** Functional FastAPI backend with booking endpoints; Prophet+LSTM model achieving ≥70% surge recall; working Seat Allocator engine.

**Prerequisite:** Sprint 1 must be complete (schema migrated, cleaned dataset available).

---

## Phase 1 — FastAPI App Factory & Core Config

In `backend/app/`:

1. Create `core/config.py` using `pydantic-settings`:
   - Load all env vars from `.env`
   - Include: `DATABASE_URL`, `QR_HMAC_SECRET`, `PROPHET_MODEL_PATH`, `LSTM_MODEL_PATH`, `DEBUG`, `SECRET_KEY`, `ALLOWED_ORIGINS`

2. Create `db/session.py`:
   - Async SQLAlchemy engine using `asyncpg`
   - `AsyncSessionLocal` factory
   - `get_db` FastAPI dependency yielding a session

3. Create `main.py`:
   - Mount all v1 routers under `/api/v1`
   - Add CORS middleware using `ALLOWED_ORIGINS` from config
   - Add a `GET /api/v1/health` endpoint returning `{"status": "ok"}`
   - Add lifespan handler to dispose the DB engine on shutdown

---

## Phase 2 — Booking & Seat Assignment API

Create the following route files under `app/api/v1/`:

### `bookings.py`
- `POST /bookings` — Create a booking
  - Accept: `passenger_id`, `bus_id`, `seat_preference` (optional), `travel_group` (list of passenger IDs, optional)
  - Call Seat Allocator service to assign a seat and boarding window
  - Call QR Service to generate and sign the boarding pass token
  - Persist to DB and return booking with QR token
- `GET /bookings/{booking_id}` — Get booking details
- `GET /bookings/{booking_id}/qr` — Return QR image (PNG) as a streaming response

### `buses.py`
- `GET /buses` — List buses by route and date
- `GET /buses/{bus_id}/seats` — Get seat map with availability

### `forecasts.py`
- `GET /forecasts/{route_id}` — Get 7-day surge probability forecast for a route
  - Call the Forecasting service and return predictions with confidence intervals

---

## Phase 3 — Demand Forecasting Service

In `ml/forecasting/` and `backend/app/services/forecasting/`:

### Training (`ml/forecasting/train.py`)

Build a two-stage training pipeline:

**Stage 1 — Prophet baseline:**
- Train Facebook Prophet on the cleaned ridership time series per route
- Add ASEAN holiday regressors as custom seasonality
- Serialize model to `artifacts/prophet_model.pkl`

**Stage 2 — LSTM residual correction:**
- Compute Prophet residuals on the training set
- Train a PyTorch LSTM to learn residual patterns (especially around surge events)
- Architecture: input_size=7 (7-day lag features), hidden_size=64, num_layers=2, output_size=1
- Serialize to `artifacts/lstm_model.pt`

### Evaluation (`ml/forecasting/evaluate.py`)
- Report MAE, RMSE, and Surge Recall on a held-out test set
- Surge Recall = (correctly predicted surge days) / (actual surge days)
- Minimum acceptable Surge Recall: **70%**

### Inference (`backend/app/services/forecasting/predictor.py`)
- `ForecastingService` class with `predict(route_id, horizon_days=7) -> list[SurgePrediction]`
- Loads models on startup (not on every request)
- Returns surge probability (0–1) and predicted passenger volume per day

---

## Phase 4 — Seat Allocator Engine

In `backend/app/services/seat_allocator/allocator.py`:

Implement `SeatAllocator` class with method:
```
assign(bus_id, passenger, travel_group=None) -> SeatAssignment
```

### Assignment Logic (in priority order):

1. **Accessibility seats** — If passenger has accessibility flag, assign seat rows 1–2 first.
2. **Group seating** — Keep travel groups in the same row or adjacent rows.
3. **Affinity scoring** — Score available seats by seatmate compatibility:
   - +2 if language preference matches adjacent passenger
   - +1 if travel habits match (business vs leisure)
   - +1 if lifestyle interest match (optional profile field)
4. **Load balancing** — Prefer seats in less-occupied bus sections to distribute weight.
5. **Boarding window assignment** — Assign a 15-minute boarding window based on seat row (front rows board first).

Return a `SeatAssignment` Pydantic model: `seat_number`, `boarding_window_start`, `boarding_window_end`, `affinity_score`.

---

## Phase 5 — QR Boarding Pass Service

In `backend/app/services/qr_service/qr.py`:

1. `generate_token(booking: Booking) -> str`:
   - Build payload string: `f"{passenger_id}|{route_id}|{bus_id}|{seat}|{boarding_window}|{timestamp}"`
   - Sign with HMAC-SHA256 using `QR_HMAC_SECRET`
   - Return base64url-encoded `payload.signature`

2. `verify_token(token: str) -> bool`:
   - Split token into payload and signature
   - Recompute HMAC and compare using `hmac.compare_digest` (timing-safe)

3. `render_qr_image(token: str) -> bytes`:
   - Use `qrcode` library to render a PNG image of the token
   - Return raw bytes for streaming response

---

## Phase 6 — Sprint 2 Verification Checklist

- [ ] `GET /api/v1/health` returns 200
- [ ] `POST /api/v1/bookings` creates a booking with an assigned seat and boarding window
- [ ] `GET /api/v1/bookings/{id}/qr` returns a valid PNG QR image
- [ ] QR token passes `verify_token()` validation
- [ ] Forecasting service returns 7-day predictions for at least one route
- [ ] Surge Recall ≥ 70% on evaluation set
- [ ] Seat Allocator correctly keeps a 2-person group together in adjacent seats
- [ ] All unit tests pass: `pytest tests/ -v`
- [ ] `ruff check backend/` returns no errors

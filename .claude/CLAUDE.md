# IQueue — Claude Code Project Context

## What Is IQueue?

IQueue is an AI-powered smart boarding platform for inter-provincial bus terminals across ASEAN.
It solves congestion, seat hoarding, and boarding disputes through four integrated subsystems:

| Subsystem | Description |
|---|---|
| **Demand Forecasting** | Prophet + LSTM hybrid predicting passenger surges 7 days ahead |
| **Smart Seat Allocator** | Rule-based engine with passenger affinity scoring for seatmate pairing |
| **QR Boarding Pass** | HMAC-SHA256 signed token, offline-scannable at terminal gates |
| **Multilingual Chatbot** | mBERT / Flan-T5 supporting Filipino, Bahasa, Vietnamese, English |

**Hackathon:** AI for Good — Smart City Track
**Team:** UM Siklab — University of Mindanao, Philippines (2 developers)
**Demo Deadline:** June 25, 2026

---

## Project Structure

```
iqueue/
├── .claude/                        # Claude Code config (you are here)
├── backend/                        # FastAPI Python backend
│   ├── app/
│   │   ├── api/v1/                 # Route handlers per resource
│   │   │   ├── bookings.py
│   │   │   ├── buses.py
│   │   │   ├── forecasts.py
│   │   │   ├── seats.py
│   │   │   └── chatbot.py
│   │   ├── core/                   # Config, security, dependencies
│   │   │   ├── config.py           # Pydantic Settings from .env
│   │   │   ├── security.py         # HMAC helpers, auth utilities
│   │   │   └── deps.py             # FastAPI dependency injectors
│   │   ├── models/                 # SQLAlchemy 2.0 ORM models
│   │   ├── schemas/                # Pydantic v2 request/response schemas
│   │   ├── services/
│   │   │   ├── forecasting/        # Prophet + LSTM service
│   │   │   │   ├── predictor.py    # Inference entrypoint
│   │   │   │   └── artifacts/      # Serialized model files (DVC-tracked)
│   │   │   ├── seat_allocator/     # Seat scoring and assignment engine
│   │   │   │   └── allocator.py
│   │   │   ├── qr_service/         # QR generation and HMAC validation
│   │   │   │   └── qr.py
│   │   │   └── chatbot/            # NLP chatbot inference wrapper
│   │   │       └── bot.py
│   │   ├── db/
│   │   │   ├── session.py          # Async SQLAlchemy engine + session
│   │   │   └── base.py             # Declarative base
│   │   └── main.py                 # FastAPI app factory
│   ├── alembic/                    # Migration scripts
│   │   └── versions/
│   ├── tests/
│   │   ├── unit/
│   │   └── integration/
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   └── Dockerfile
├── frontend/                       # Next.js 16 (App Router)
│   ├── src/
│   │   ├── app/
│   │   │   ├── (passenger)/        # Passenger booking flow
│   │   │   └── (operator)/         # Operator dashboard
│   │   ├── components/
│   │   └── lib/
│   │       ├── api.ts              # Typed API client
│   │       └── utils.ts
│   ├── package.json
│   └── Dockerfile
├── ml/                             # Standalone ML training scripts
│   ├── forecasting/
│   │   ├── train.py                # Training entrypoint (Prophet + LSTM)
│   │   ├── model.py                # PyTorch LSTM definition
│   │   ├── evaluate.py             # Accuracy + surge recall metrics
│   │   └── data/                   # Raw + cleaned datasets (DVC-tracked)
│   └── chatbot/
│       ├── finetune.py             # mBERT fine-tuning script
│       └── evaluate_lang.py        # Per-language bias audit
├── data/                           # DVC-managed data root
│   ├── raw/                        # Original LTFRB + scraped data
│   └── cleaned/                    # Processed, versioned datasets
├── scripts/
│   └── generate_qr_keys.py         # One-time HMAC key generation
├── docker-compose.yml              # Production-like full stack
├── docker-compose.dev.yml          # Dev overrides (hot reload, ports)
├── .env.example                    # Template — never commit .env
├── .dvc/                           # DVC config
└── README.md
```

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Backend API | FastAPI 0.136+ (Python 3.14+) | Async, all routes under `/api/v1/` |
| Database | PostgreSQL 18 | Multi-tenant schema isolation |
| ORM | SQLAlchemy 2.0 (async) | Alembic for migrations |
| Forecasting | Facebook Prophet + PyTorch LSTM | 7-day ahead surge prediction |
| Chatbot | Hugging Face Transformers (mBERT / Flan-T5-small) | 4 ASEAN languages |
| QR Signing | Python `hmac` + `hashlib` + `qrcode` | Offline-compatible |
| Frontend | Next.js 16 (App Router) + Tailwind CSS 4 | Passenger UI + Operator dashboard |
| Data Version Control | DVC | Never commit raw data to Git |
| Containerization | Docker + Docker Compose | Dev and prod configs separate |
| Python Linting | Ruff + Black | Enforced on every save |
| JS/TS Linting | ESLint + Prettier | Enforced via `.eslintrc` |
| Testing | pytest (unit/integration), Locust (load) | Target: ≥70% surge prediction accuracy |

---

## Required Environment Variables

Copy `.env.example` to `.env` before running anything. Key variables:

```bash
# Database
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/iqueue

# QR Signing (generate with: python scripts/generate_qr_keys.py)
QR_HMAC_SECRET=<generated-secret>

# ML
PROPHET_MODEL_PATH=backend/app/services/forecasting/artifacts/prophet_model.pkl
LSTM_MODEL_PATH=backend/app/services/forecasting/artifacts/lstm_model.pt

# Chatbot (optional during prototype; use local FastAPI wrapper otherwise)
HUGGINGFACE_API_TOKEN=<your-token>

# App
DEBUG=true
SECRET_KEY=<random-secret>
ALLOWED_ORIGINS=http://localhost:3000
```

---

## Architecture Rules — Always Follow

1. **API versioning** — all route handlers live under `app/api/v1/`; never add unversioned routes
2. **Pydantic v2 everywhere** — all request bodies, response models, and config use Pydantic v2
3. **Async first** — use `async def` for all route handlers and DB calls; use `asyncpg` driver
4. **No secrets in code** — HMAC keys, DB URLs, and API tokens via `.env` only
5. **DVC for all data** — `dvc add` raw files; never `git add` CSV or model artifacts
6. **Multi-tenant isolation** — each bus operator is a tenant; use tenant-scoped DB queries
7. **Branch naming** — `feat/`, `fix/`, `chore/`, `ml/`, `data/` prefixes required
8. **Commit format** — `type(scope): description` e.g. `feat(qr): add HMAC signing service`

---

## Key Domain Concepts

| Term | Meaning |
|---|---|
| **Surge Event** | Abnormally high passenger demand period (Holy Week, Eid, Tết); flagged via ASEAN calendar features |
| **Boarding Window** | AI-assigned 15-minute gate arrival slot given to each passenger |
| **Tenant** | A bus operator or terminal authority with isolated data schema |
| **QR Boarding Pass** | HMAC-SHA256 signed payload: `passenger_id\|route\|bus_id\|seat\|window\|timestamp` |
| **Seat Affinity Score** | Computed metric matching seatmates by language, travel habits, lifestyle interests |
| **Surge Probability** | Float 0–1 output from forecasting model indicating likelihood of high-volume demand |

---

## Sprint Roadmap

| Sprint | Dates | Primary Goal | Key Output |
|---|---|---|---|
| Sprint 1 | May 1–15 | Data pipeline + DB schema + dev env | Cleaned dataset, PostgreSQL schema, DVC setup |
| Sprint 2 | May 16–31 | FastAPI backend + Prophet+LSTM + Seat Allocator | Working booking API, functional forecasting model |
| Sprint 3 | June 1–15 | Next.js frontend + chatbot + QR integration | End-to-end prototype |
| Sprint 4 | June 16–25 | Testing + bias audit + demo video | Submission-ready build |

---

## Coding Conventions

### Python (Backend + ML)
- Follow PEP 8; enforced by Ruff
- Type hints required on all function signatures
- All public functions and classes must have docstrings
- PostgreSQL table names: plural snake_case (`bookings`, `bus_routes`, `passengers`)
- Service classes follow `__init__` + method pattern; avoid module-level side effects

### TypeScript / Next.js (Frontend)
- Components: PascalCase filenames and exports
- Hooks: `use` prefix (`useBooking`, `useForecast`)
- API calls go through `lib/api.ts` only — never fetch directly in components
- Use `zod` for form validation schemas

### Tests
- Unit tests mirror source structure under `tests/unit/`
- Every service method must have at least one happy-path unit test
- Fixtures go in `tests/conftest.py`

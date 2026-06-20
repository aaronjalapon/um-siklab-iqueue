# IQueue — AI-Powered Smart Boarding Platform

[![AI for Good](https://img.shields.io/badge/AI%20for%20Good-Smart%20City%20Track-blue)](https://aiforgood.itu.int/)
[![Python 3.14+](https://img.shields.io/badge/Python-3.14+-green.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.136+-teal.svg)](https://fastapi.tiangolo.com/)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org/)
[![PostgreSQL 18](https://img.shields.io/badge/PostgreSQL-18-blue.svg)](https://www.postgresql.org/)
[![Node 24](https://img.shields.io/badge/Node-24_LTS-green.svg)](https://nodejs.org/)

**IQueue** is an AI-powered smart boarding platform for inter-provincial bus terminals across ASEAN. It solves congestion, seat hoarding, and boarding disputes through four integrated subsystems:

> **Evidence disclosure:** the current operational and forecasting datasets are synthetic, and IQueue has not completed a field pilot. The Evidence view separates deterministic simulations, legacy validation metrics, and untouched-test metrics. Run the canonical retraining pipeline before presenting the latter.

| Subsystem | Description |
|---|---|
| **📊 Demand Forecasting** | Prophet + LSTM hybrid predicting passenger surges 7 days ahead |
| **🪑 Smart Seat Allocator** | Explainable constrained optimization; affinity is explicitly opt-in |
| **📱 QR Boarding Pass** | HMAC-SHA256 signed token, offline-scannable at terminal gates |
| **💬 Multilingual Chatbot** | Fine-tuned intent classifier supporting Filipino, Bahasa, Vietnamese, English |

---

## 🏆 Hackathon

- **Event:** ASEAN AI Hackathon 2026 — Smart City Track
- **Team:** UM Siklab — University of Mindanao, Philippines
- **Demo Deadline:** June 25, 2026

---

## 🚀 Quick Start

### Prerequisites

- Python 3.14+
- Node.js 24+
- Docker & Docker Compose
- PostgreSQL 15 (or use Docker)

### 1. Clone & Configure

```bash
git clone <repo-url> && cd iqueue
cp .env.example .env
# Edit .env with your values, or generate keys:
python scripts/generate_qr_keys.py
```

### 2. Start with Docker (Recommended)

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

This starts:
- PostgreSQL 18 on port 5432
- FastAPI backend on port 8000 (with hot reload and the lightweight base image)
- Next.js frontend on port 3000

For production-like full ML inference, use the CPU-only ML override and the
checksum-validated route bundle:

```bash
python scripts/validate_forecast_bundle.py \
  --artifacts iqueue_artifacts/artifacts
docker-compose -f docker-compose.yml -f docker-compose.ml.yml up -d --build
```

Modern Docker installations can use `docker compose` in place of
`docker-compose`. The repository Dockerfiles do not require BuildKit.

### 3. Generate Demo Data

```bash
PYTHONPATH=backend .venv/bin/alembic -c backend/alembic.ini upgrade head
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/iqueue \
  .venv/bin/python scripts/seed_demo_data.py \
  --with-learning-history --reset-learning-history
```

### 4. Train Forecasting Models

```bash
python ml/forecasting/train.py --validate-only
# Run once on Kaggle/Colab GPU with scikit-learn 1.8:
python ml/forecasting/train.py --epochs 80
python ml/forecasting/evaluate.py
python scripts/validate_forecast_bundle.py \
  --artifacts iqueue_artifacts/artifacts --write-manifest
python scripts/validate_forecast_bundle.py \
  --artifacts iqueue_artifacts/artifacts
```

### 5. Open the App

- **Passenger UI:** http://localhost:3000
- **Operator Dashboard:** http://localhost:3000/operator
- **Evidence View:** http://localhost:3000/operator/evidence
- **Boarding Scanner:** http://localhost:3000/operator/scanner
- **API Docs:** http://localhost:8000/docs

### Continuous learning replay

Every shown forecast is stored as a snapshot. Accept, modify, and reject
actions are joined to end-of-day outcomes by tenant, route, and service date.
The shared ground-truth builder creates one leakage-safe route-day row, and the
promotion gate accepts a candidate only when surge F1 or recall improves while
MAE increases by no more than 5%.

```bash
curl -X POST http://localhost:8000/api/v1/demo/retraining-replay
curl http://localhost:8000/api/v1/evidence/summary
```

The replay is enabled only with `DEMO_MODE=true`, uses clearly labeled
synthetic history, and never mutates the deployed champion.

### Azure deployment

The deployment uses a unified Linux Azure App Service container with CPU-only
PyTorch. Use an Azure B2 plan or larger; the deployment script defaults to B2.

Use the Azure runbook in [docs/AZURE_DEPLOYMENT.md](docs/AZURE_DEPLOYMENT.md).

Deployment flow:

1. Run `./scripts/bootstrap-azure-hackathon.sh` once to provision the hackathon
   resource group, ACR, App Service plan, Blob storage, and PostgreSQL.
2. Save the printed `DATABASE_URL` and `AZURE_STORAGE_CONNECTION_STRING` into
   your local `.env`.
3. Run `./scripts/deploy-chatbot-azure.sh` for each manual backend release.
4. Set `NEXT_PUBLIC_API_URL` in Vercel after the backend is live.

Required Azure variables live in `.env.example`:

- `AZURE_RESOURCE_GROUP`
- `AZURE_LOCATION`
- `AZURE_ACR_NAME`
- `AZURE_APP_SERVICE_PLAN`
- `AZURE_WEBAPP_NAME`
- `AZURE_SUBSCRIPTION_ID`
- `AZURE_STORAGE_ACCOUNT`
- `AZURE_STORAGE_CONTAINER`
- `AZURE_POSTGRES_SERVER`
- `AZURE_POSTGRES_DB`
- `AZURE_POSTGRES_ADMIN`

The deployment health endpoints are:

- `/api/v1/health/live`
- `/api/v1/health/readiness`

### Frontend on Vercel

If you deploy the Next.js frontend to Vercel, configure the browser client to call the deployed backend over HTTPS:

- Set `NEXT_PUBLIC_API_URL` in Vercel to `https://<backend-host>/api/v1`
- Set backend `ALLOWED_ORIGINS` to include your Vercel production domain and any preview domains you use
- Keep all browser API calls inside `frontend/src/lib/api.ts` so there is one place to update the backend URL

Example:

```bash
NEXT_PUBLIC_API_URL=https://iqueue-backend.azurewebsites.net/api/v1
ALLOWED_ORIGINS=https://iqueue-frontend.vercel.app
```

---

## 📁 Project Structure

```
iqueue/
├── backend/                    # FastAPI Python backend
│   ├── app/
│   │   ├── api/v1/            # Route handlers (bookings, buses, forecasts, chatbot)
│   │   ├── core/              # Config, security, dependencies
│   │   ├── models/            # SQLAlchemy ORM models
│   │   ├── schemas/           # Pydantic v2 request/response schemas
│   │   └── services/          # Business logic (forecasting, seats, QR, chatbot)
│   ├── alembic/               # Database migrations
│   └── tests/                 # Unit + integration tests
├── frontend/                   # Next.js 16 (App Router)
│   └── src/
│       ├── app/               # (passenger) + (operator) route groups
│       ├── components/        # Shared UI components
│       └── lib/               # API client, types, utilities
├── ml/                         # Standalone ML training
│   ├── forecasting/           # Prophet + LSTM training & evaluation
│   └── chatbot/               # mBERT fine-tuning & bias audit
├── data/                       # DVC-managed datasets
│   ├── raw/                   # Original data
│   └── pipeline/              # Cleaning & synthetic data generation
├── scripts/                    # Utility scripts
├── docker-compose.yml          # Production-like stack
└── docker-compose.dev.yml      # Dev overrides
```

---

## 🔧 Development Commands

| Command | Description |
|---------|-------------|
| `/dev` | Start FastAPI backend (port 8000) |
| `/frontend` | Start Next.js dev server (port 3000) |
| `/docker` | Run full stack with Docker Compose |
| `/migrate` | Run Alembic database migrations |
| `/test` | Run test suite with coverage |
| `/lint` | Lint & format all code (Ruff + ESLint) |
| `/train` | Train/retrain forecasting models |
| `/qr-keys` | Generate QR signing keys |

---

## 🧪 Testing

```bash
# Backend tests
DEBUG=true .venv/bin/python -m pytest backend/tests ml/forecasting/tests -q

# Load testing
cd backend && locust -f tests/load/locustfile.py

# Frontend
cd frontend && npm run lint && npx tsc --noEmit && npm run build
```

---

## 🗺️ Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Next.js 14 │────▶│   FastAPI    │────▶│ PostgreSQL  │
│  Frontend   │     │   Backend    │     │     15      │
│  :3000      │◀────│   :8000      │◀────│   :5432     │
└─────────────┘     └──────┬───────┘     └─────────────┘
                           │
                    ┌──────┴───────┐
                    │  ML Services │
                    │  Prophet+LSTM│
                    │  mBERT/Flan  │
                    └──────────────┘
```

---

## 📄 License

MIT — Built for AI for Good Hackathon 2026

---

**Built with ❤️ by UM Siklab — University of Mindanao**

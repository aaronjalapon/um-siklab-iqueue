# IQueue — AI-Powered Smart Boarding Platform

[![AI for Good](https://img.shields.io/badge/AI%20for%20Good-Smart%20City%20Track-blue)](https://aiforgood.itu.int/)
[![Python 3.14+](https://img.shields.io/badge/Python-3.14+-green.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.136+-teal.svg)](https://fastapi.tiangolo.com/)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org/)
[![PostgreSQL 18](https://img.shields.io/badge/PostgreSQL-18-blue.svg)](https://www.postgresql.org/)
[![Node 24](https://img.shields.io/badge/Node-24_LTS-green.svg)](https://nodejs.org/)

**IQueue** is an AI-powered smart boarding platform for inter-provincial bus terminals across ASEAN. It solves congestion, seat hoarding, and boarding disputes through four integrated subsystems:

| Subsystem | Description |
|---|---|
| **📊 Demand Forecasting** | Prophet + LSTM hybrid predicting passenger surges 7 days ahead |
| **🪑 Smart Seat Allocator** | Rule-based engine with passenger affinity scoring for seatmate pairing |
| **📱 QR Boarding Pass** | HMAC-SHA256 signed token, offline-scannable at terminal gates |
| **💬 Multilingual Chatbot** | NLP chatbot supporting Filipino, Bahasa, Vietnamese, English |

---

## 🏆 Hackathon

- **Event:** ASEAN AI Hackathon 2026 — Smart City Track
- **Team:** UM Siklab — University of Mindanao, Philippines
- **Demo Deadline:** June 25, 2026

---

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+
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
docker-compose -f docker-compose.dev.yml up
```

This starts:
- PostgreSQL 15 on port 5432
- FastAPI backend on port 8000 (with hot reload)
- Next.js frontend on port 3000

### 3. Generate Demo Data

```bash
python -m data.pipeline.synthetic_data
python data/pipeline/clean.py --source synthetic
```

### 4. Train Forecasting Models

```bash
python ml/forecasting/train.py
python ml/forecasting/evaluate.py
# Target: Surge Recall ≥ 70%
```

### 5. Open the App

- **Passenger UI:** http://localhost:3000
- **Operator Dashboard:** http://localhost:3000/operator
- **API Docs:** http://localhost:8000/docs

### Azure deployment

The current deployment direction is a unified Linux Azure App Service container that runs the backend API plus the chatbot and forecasting models together.

Use `scripts/deploy-chatbot-azure.sh` as the Azure bootstrap script. The filename is legacy; the script now provisions and updates the App Service deployment.

Required Azure variables live in `.env.example`:

- `AZURE_RESOURCE_GROUP`
- `AZURE_LOCATION`
- `AZURE_ACR_NAME`
- `AZURE_APP_SERVICE_PLAN`
- `AZURE_WEBAPP_NAME`
- `AZURE_SUBSCRIPTION_ID`

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
├── frontend/                   # Next.js 14 (App Router)
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
cd backend && pytest tests/ -v --cov=app

# Load testing
cd backend && locust -f tests/load/locustfile.py

# Frontend
cd frontend && npm run lint && npx tsc --noEmit
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

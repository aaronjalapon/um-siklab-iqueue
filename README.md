# IQueue — AI-Powered Smart Boarding Platform

[![AI for Good](https://img.shields.io/badge/AI%20for%20Good-Smart%20City%20Track-blue)](https://aiforgood.itu.int/)
[![Python 3.11+](https://img.shields.io/badge/Python-3.11+-green.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111+-teal.svg)](https://fastapi.tiangolo.com/)
[![Next.js 14](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)

**IQueue** is an AI-powered smart boarding platform for inter-provincial bus terminals across ASEAN. It solves congestion, seat hoarding, and boarding disputes through four integrated subsystems:

| Subsystem | Description |
|---|---|
| **📊 Demand Forecasting** | Prophet + LSTM hybrid predicting passenger surges 7 days ahead |
| **🪑 Smart Seat Allocator** | Rule-based engine with passenger affinity scoring for seatmate pairing |
| **📱 QR Boarding Pass** | HMAC-SHA256 signed token, offline-scannable at terminal gates |
| **💬 Multilingual Chatbot** | NLP chatbot supporting Filipino, Bahasa, Vietnamese, English |

---

## 🏆 Hackathon

- **Event:** AI for Good — Smart City Track
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

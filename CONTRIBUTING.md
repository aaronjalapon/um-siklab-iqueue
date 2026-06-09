# Contributing to IQueue

Welcome to the UM Siklab IQueue project! This guide covers everything you need to know to contribute effectively.

---

## 🌿 Branch Structure

```
main  ──────────────────────────────────────►  Production-stable (protected)
  └── pre-prod  ──────────────────────────►  Staging / integration gate (protected)
  ├── feat/your-feature-name
        ├── fix/your-bug-fix
        └── integration/your-integration
```

| Branch | Source | Purpose |
|---|---|---|
| `main` | — | Production-ready code. Only receives merges from `pre-prod` after QA sign-off. |
| `pre-prod` | `main` | Staging environment. All work lands here first before going to production. |
| `feat/*` | `pre-prod` | New features and enhancements. |
| `fix/*` | `pre-prod` | Bug fixes and patches. |
| `integration/*` | `pre-prod` | Third-party or service integrations (e.g., payment gateway, SMS). |

> **Rule:** Never commit or push directly to `main` or `pre-prod`. Always work through a branch and a Pull Request.

---

## 🚀 Getting Started

### 1. Clone and set up

```bash
git clone <repo-url> && cd iqueue
cp .env.example .env
# Fill in your environment variables
```

### 2. Start the dev stack

```bash
docker-compose -f docker-compose.dev.yml up
```

Services will be available at:
- **Frontend** → http://localhost:3000
- **Backend API** → http://localhost:8000/docs

### Deploying the frontend to Vercel

When you deploy only the frontend to Vercel, keep the backend on its own public HTTPS URL.

1. Set the Vercel project root directory to `frontend/`.
2. Add `NEXT_PUBLIC_API_URL=https://<your-backend-host>/api/v1` in Vercel environment variables.
3. Set backend `ALLOWED_ORIGINS` to include your Vercel domain, for example `https://<your-project>.vercel.app`.
4. Redeploy the backend after changing `ALLOWED_ORIGINS`, then deploy the frontend.
5. Test the deployed frontend against `/api/v1/health/live` and `/api/v1/health/readiness`.

---

## 🔧 Contribution Workflow

### Step 1 — Sync with `pre-prod`

Always start from the latest `pre-prod`:

```bash
git checkout pre-prod
git pull origin pre-prod
```

### Step 2 — Create your branch

Use the naming conventions below:

```bash
# Feature
git checkout -b feat/passenger-notification

# Bug fix
git checkout -b fix/booking-overlap-error

# Integration
git checkout -b integration/gcash-payment
```

### Step 3 — Make your changes

- Keep commits small, focused, and well-described.
- Follow the commit message format below.

### Step 4 — Push your branch

```bash
git push -u origin feat/your-branch-name
```

### Step 5 — Open a Pull Request

- **Target branch:** `pre-prod` ← not `main`
- Fill in the PR description: what changed, why, and how to test it.
- Request a review from at least one teammate.
- Do **not** merge your own PR.

### Step 6 — Merging to `main` (leads only)

After QA validation on `pre-prod`, a team lead opens a PR from `pre-prod → main`.

---

## 📝 Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(scope): short description

[optional body]
```

| Type | When to use |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `chore` | Tooling, configs, deps |
| `refactor` | Code restructure (no behavior change) |
| `docs` | Documentation only |
| `test` | Adding or fixing tests |
| `style` | Formatting, linting |

**Examples:**

```
feat(booking): add QR code generation for confirmed seats
fix(chatbot): handle null response from NLP model
docs(contributing): add branch strategy guide
```

---

## 🏗️ Project Areas & Ownership

| Area | Directory | Stack |
|---|---|---|
| Passenger & Operator UI | `frontend/` | Next.js 16, TypeScript |
| REST API | `backend/app/api/` | FastAPI, Python |
| Business Logic | `backend/app/services/` | Python |
| Database Models | `backend/app/models/` | SQLAlchemy, PostgreSQL |
| ML / Forecasting | `ml/forecasting/` | Prophet, LSTM |
| Chatbot / NLP | `ml/chatbot/` | mBERT, Flan |
| Data Pipelines | `data/pipeline/` | Python, DVC |

---

## 🧪 Before Opening a PR

Run the relevant checks depending on what you changed:

```bash
# Backend — lint, type check, tests
cd backend
ruff check . && ruff format --check .
pytest tests/ -v --cov=app

# Frontend — lint, type check
cd frontend
npm run lint
npx tsc --noEmit
```

All checks must pass before requesting a review.

---

## 🛡️ Branch Protection (GitHub Settings)

The following rules are enforced on the remote:

| Branch | Rules |
|---|---|
| `main` | Require PR · Require review · No direct pushes · Require status checks |
| `pre-prod` | Require PR · Require review · No direct pushes |

---

## 🙋 Questions?

Open a GitHub Discussion or ping the team lead directly.

**Built with ❤️ by UM Siklab — University of Mindanao**

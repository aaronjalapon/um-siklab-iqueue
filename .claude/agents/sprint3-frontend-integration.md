# Agent Task: Sprint 3 — Frontend + Chatbot + Full Integration

**Sprint dates:** June 1–15, 2026
**Goal:** Working end-to-end prototype: passenger books a trip → receives QR boarding pass → can query the multilingual chatbot. Operator dashboard shows live queue and surge forecast.

**Prerequisite:** Sprint 2 must be complete (booking API functional, QR service working, forecasting returning predictions).

---

## Phase 1 — Next.js Project Setup

In `frontend/`:

1. Initialize Next.js 14 with App Router and TypeScript:
   ```bash
   npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*"
   ```

2. Install additional dependencies:
   ```bash
   npm install axios zod react-hook-form @hookform/resolvers lucide-react
   npm install qrcode.react recharts
   ```

3. Create `frontend/.env.local`:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
   ```

4. Create `src/lib/api.ts` — a typed Axios client with base URL from env, request/response interceptors for error handling, and typed helper functions for each API endpoint.

---

## Phase 2 — Passenger Booking Flow

Build the passenger-facing interface under `src/app/(passenger)/`:

### Pages to build:

**`/` — Home / Route Search**
- Route origin/destination selector (dropdowns populated from `GET /buses`)
- Travel date picker
- Passenger count input
- "Search Buses" button → navigates to `/results`

**`/results` — Bus Listing**
- List available buses for selected route + date
- Show: departure time, available seats, surge probability badge (from forecasting API)
- "Book" button per bus → navigates to `/book/[busId]`

**`/book/[busId]` — Seat Selection & Booking**
- Visual seat map grid (use data from `GET /buses/{busId}/seats`)
- Passenger details form: name, phone, language preference, travel habits
- Optional: seatmate preferences
- Submit → calls `POST /bookings`
- On success → navigates to `/confirmation/[bookingId]`

**`/confirmation/[bookingId]` — Booking Confirmation**
- Display booking details: route, bus, seat, boarding window
- Render QR code using `qrcode.react` with the QR token from the API
- Download QR as PNG button
- "Ask Chatbot" button → opens chatbot panel

---

## Phase 3 — Operator Dashboard

Build the operator interface under `src/app/(operator)/`:

**`/operator` — Main Dashboard**

Layout: sidebar navigation + main content area.

**Queue Panel:**
- Real-time list of checked-in passengers and their boarding windows
- Color-coded status: boarding (green), waiting (yellow), overdue (red)
- Update every 10 seconds via polling (`setInterval` with `axios.get`)

**Surge Forecast Panel:**
- 7-day bar chart using Recharts
- X-axis: dates, Y-axis: predicted passenger volume
- Color bars by surge probability: green (<0.4), yellow (0.4–0.7), red (>0.7)
- Data from `GET /api/v1/forecasts/{routeId}`

**Bus Capacity Panel:**
- Per-bus seat utilization progress bars
- Show: booked / total capacity, boarding window breakdown

---

## Phase 4 — Multilingual Chatbot Integration

### Backend Chatbot Service (`backend/app/services/chatbot/bot.py`)

Implement `ChatbotService` with method:
```
respond(query: str, language: str) -> ChatbotResponse
```

**Model options (choose based on available memory):**
- Primary: Hosted Hugging Face Inference API with `google/flan-t5-small`
- Fallback: Local FastAPI wrapper around a quantized model if no API token

**Intent classification targets:**
- `check_booking` — "Where is my booking?" → fetch booking by ID/phone
- `request_requeue` — "I missed my bus, can I rebook?" → initiate rebooking flow
- `get_departure_info` — "When does the 10am bus to Davao leave?" → query bus schedule
- `surge_info` — "Is Holy Week going to be crowded?" → return surge forecast
- `fallback` — Unknown query → polite fallback in the detected language

**Language detection:** Use `langdetect` library to detect input language before routing.

### Chatbot API Endpoint (`app/api/v1/chatbot.py`)
- `POST /chatbot/message`
  - Accept: `query` (string), `language` (optional, auto-detected if omitted), `booking_id` (optional context)
  - Return: `response_text`, `detected_language`, `intent`, `suggested_actions`

### Frontend Chatbot Panel (`src/components/ChatbotPanel.tsx`)
- Slide-in panel component triggered by "Ask Chatbot" button
- Chat message thread (user messages right-aligned, bot left-aligned)
- Language auto-detection display badge
- Input box with send button
- Calls `POST /api/v1/chatbot/message`

---

## Phase 5 — WebSocket Live Queue (Stretch Goal)

If time allows, upgrade the operator dashboard queue from polling to WebSocket:

1. Add a WebSocket endpoint in FastAPI: `GET /ws/queue/{tenant_id}`
2. On new booking or check-in event, broadcast updated queue state to all connected operator clients
3. In Next.js, use the native `WebSocket` API in a `useEffect` to subscribe and update state

---

## Phase 6 — Sprint 3 Verification Checklist

- [ ] Passenger can search routes, view buses with surge badges, and complete a booking
- [ ] Booking confirmation page displays a scannable QR code
- [ ] Operator dashboard shows live seat utilization and 7-day surge forecast chart
- [ ] Chatbot responds correctly in at least 2 languages (Filipino and English minimum)
- [ ] Intent classification handles all 4 defined intents
- [ ] All pages are mobile-responsive (test at 375px width)
- [ ] No TypeScript errors: `cd frontend && npx tsc --noEmit`
- [ ] ESLint passes: `npm run lint`
- [ ] End-to-end flow tested manually: search → book → QR → chatbot query

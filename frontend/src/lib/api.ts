/** Typed Axios client for the IQueue API. */

import axios, { AxiosError } from "axios";
import type {
  BookingCreate,
  BookingDetail,
  BookingResponse,
  BusListResponse,
  ChatbotRequest,
  ChatbotResponse,
  ForecastActionCreate,
  ForecastActionResponse,
  ForecastResponse,
  LearningLogSummary,
  OperationalOutcomeCreate,
  OperationalOutcomeResponse,
  SeatMapResponse,
  SessionCreateResponse,
} from "./types";

function getApiBaseUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

  if (typeof window === "undefined") {
    return configured;
  }

  try {
    const url = new URL(configured);
    const isLocalApiHost = ["localhost", "127.0.0.1", "0.0.0.0"].includes(
      url.hostname
    );
    const browserHost = window.location.hostname;
    const isBrowserOnLocalhost = ["localhost", "127.0.0.1"].includes(
      browserHost
    );

    if (isLocalApiHost && !isBrowserOnLocalhost) {
      url.hostname = browserHost;
      return url.toString();
    }
  } catch {
    return configured;
  }

  return configured;
}

const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// Response interceptor for error normalization
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ detail?: string }>) => {
    const message =
      error.response?.data?.detail || error.message || "An error occurred";
    return Promise.reject(new Error(message));
  }
);

// --- Buses ---

export async function searchBuses(
  origin: string,
  destination: string,
  travelDate: string
): Promise<BusListResponse> {
  const { data } = await api.get<BusListResponse>("/buses", {
    params: { origin, destination, travel_date: travelDate },
  });
  return data;
}

export async function getSeatMap(
  busId: string,
  travelDate: string
): Promise<SeatMapResponse> {
  const { data } = await api.get<SeatMapResponse>(`/buses/${busId}/seats`, {
    params: { travel_date: travelDate },
  });
  return data;
}

// --- Bookings ---

export async function createBooking(
  payload: BookingCreate
): Promise<BookingResponse> {
  const { data } = await api.post<BookingResponse>("/bookings", payload);
  return data;
}

export async function getBooking(
  bookingId: string
): Promise<BookingDetail> {
  const { data } = await api.get<BookingDetail>(`/bookings/${bookingId}`);
  return data;
}

export async function getBookingQR(bookingId: string): Promise<Blob> {
  const { data } = await api.get(`/bookings/${bookingId}/qr`, {
    responseType: "blob",
  });
  return data;
}

// --- Forecasts ---

export async function getForecast(
  routeId: string
): Promise<ForecastResponse> {
  const { data } = await api.get<ForecastResponse>(`/forecasts/${routeId}`);
  return data;
}

export async function recordForecastAction(
  payload: ForecastActionCreate
): Promise<ForecastActionResponse> {
  const { data } = await api.post<ForecastActionResponse>(
    "/forecast-actions",
    payload
  );
  return data;
}

export async function getLearningLogSummary(
  tenantId: string,
  routeId?: string
): Promise<LearningLogSummary> {
  const { data } = await api.get<LearningLogSummary>("/forecast-actions/summary", {
    params: { tenant_id: tenantId, route_id: routeId },
  });
  return data;
}

export async function recordOperationalOutcome(
  payload: OperationalOutcomeCreate
): Promise<OperationalOutcomeResponse> {
  const { data } = await api.post<OperationalOutcomeResponse>(
    "/operations/outcomes",
    payload
  );
  return data;
}

// --- Chatbot ---

export async function sendChatMessage(
  payload: ChatbotRequest
): Promise<ChatbotResponse> {
  const { data } = await api.post<ChatbotResponse>("/chatbot/message", payload);
  return data;
}

export async function createChatSession(
  language?: string
): Promise<SessionCreateResponse> {
  const params = language ? { language } : {};
  const { data } = await api.post<SessionCreateResponse>("/chatbot/session", null, { params });
  return data;
}

// --- Passengers ---

import type {
  PassengerCreate,
  PassengerResponse,
} from "./types";

export async function createPassenger(
  payload: PassengerCreate
): Promise<PassengerResponse> {
  const { data } = await api.post<PassengerResponse>("/passengers", payload);
  return data;
}

// --- Seats ---

import type {
  SeatMapEntry,
  SeatMapSummaryResponse,
  SeatAssignmentResult,
  SeatAssignRequest,
  SeatSwapRequest,
  SeatSwapResponse,
} from "@/types/seat";

export async function getBusSeatMap(
  busId: string
): Promise<SeatMapEntry[]> {
  const { data } = await api.get<SeatMapEntry[]>(`/seats/bus/${busId}`);
  return data;
}

export async function getBusSeatMapSummary(
  busId: string
): Promise<SeatMapSummaryResponse> {
  const { data } = await api.get<SeatMapSummaryResponse>(`/seats/bus/${busId}/summary`);
  return data;
}

export async function assignSeat(
  payload: SeatAssignRequest
): Promise<SeatAssignmentResult> {
  const { data } = await api.post<SeatAssignmentResult>("/seats/assign", payload);
  return data;
}

export async function recommendSeat(
  payload: SeatAssignRequest
): Promise<SeatAssignmentResult> {
  const { data } = await api.post<SeatAssignmentResult>(
    "/seats/recommend",
    payload
  );
  return data;
}

export async function releaseSeat(bookingId: string): Promise<void> {
  await api.delete(`/seats/release/${bookingId}`);
}

export async function swapSeats(
  payload: SeatSwapRequest
): Promise<SeatSwapResponse> {
  const { data } = await api.put<SeatSwapResponse>("/seats/swap", payload);
  return data;
}

// --- Health ---

export async function healthCheck(): Promise<{ status: string }> {
  const { data } = await api.get("/health");
  return data;
}

export default api;

/** Typed Axios client for the IQueue API. */

import axios, { AxiosError } from "axios";
import type {
  BookingCreate,
  BookingDetail,
  BookingResponse,
  BusListResponse,
  ChatbotRequest,
  ChatbotResponse,
  ForecastResponse,
  SeatMapResponse,
} from "./types";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1",
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

// --- Chatbot ---

export async function sendChatMessage(
  payload: ChatbotRequest
): Promise<ChatbotResponse> {
  const { data } = await api.post<ChatbotResponse>("/chatbot/message", payload);
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

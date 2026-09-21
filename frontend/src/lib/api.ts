/** Typed Axios client for the IQueue API. */

import axios, { AxiosError } from "axios";
import type {
  BookingCreate,
  BookingDetail,
  BookingResponse,
  BoardingVerifyResponse,
  BusListResponse,
  ChatbotRequest,
  ChatbotResponse,
  ForecastActionCreate,
  ForecastActionResponse,
  ForecastResponse,
  GroupBookingPreview,
  GroupBookingRequest,
  GroupBookingResponse,
  EvidenceSummary,
  LearningLogSummary,
  OperationalOutcomeCreate,
  OperationalOutcomeResponse,
  RetrainingReplay,
  RetrainJob,
  RetrainJobQueued,
  SeatMapResponse,
  SessionCreateResponse,
} from "./types";
import { generateOfflineBuses } from "./offline-buses";
import {
  generateOfflineSeatMap,
  computeOfflineSeatAssignment,
} from "./offline-seats";
import {
  createOfflinePassenger,
  createOfflineBooking,
  previewOfflineGroupBooking,
  createOfflineGroupBooking,
} from "./offline-booking";
import { verifyOfflineQrToken } from "./offline-crypto";
import { getSavedBoardingPassById } from "./boarding-passes";
import { getSavedGroupBoardingPass } from "./group-boarding-passes";

function getApiBaseUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_API_URL || "/api/v1";

  if (typeof window === "undefined") {
    return configured;
  }

  // In browser, always use relative path if configured as relative or local host
  // This routes through Next.js proxy on the same port, avoiding all CORS and port issues on mobile
  if (
    configured.startsWith("/") ||
    configured.includes("localhost") ||
    configured.includes("127.0.0.1") ||
    configured.includes("0.0.0.0") ||
    configured.includes("192.168.")
  ) {
    return "/api/v1";
  }

  return configured;
}

const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 15000,
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
  try {
    const { data } = await api.get<BusListResponse>("/buses", {
      params: { origin, destination, travel_date: travelDate },
    });
    return data;
  } catch {
    return generateOfflineBuses(origin, destination, travelDate);
  }
}

export async function getSeatMap(
  busId: string,
  travelDate: string
): Promise<SeatMapResponse> {
  try {
    const { data } = await api.get<SeatMapResponse>(`/buses/${busId}/seats`, {
      params: { travel_date: travelDate },
    });
    return data;
  } catch {
    const seats = generateOfflineSeatMap(busId, travelDate);
    const bookedCount = seats.filter((s) => s.status !== "available").length;
    const availableCount = seats.length - bookedCount;
    const accessTotal = seats.filter((s) => s.is_accessibility).length;
    const accessAvail = seats.filter((s) => s.is_accessibility && s.status === "available").length;
    return {
      bus_id: busId,
      capacity: seats.length,
      seats: seats.map((s) => ({
        seat_number: s.seat_label,
        is_available: s.status === "available",
        is_accessibility: s.is_accessibility,
        is_near_exit: s.is_near_exit,
        passenger_name: s.passenger_name || null,
      })),
      booked_count: bookedCount,
      available_count: availableCount,
      accessibility_seat_count: accessTotal,
      accessibility_available_count: accessAvail,
    };
  }
}

// --- Bookings ---

export async function createBooking(
  payload: BookingCreate
): Promise<BookingResponse> {
  try {
    const { data } = await api.post<BookingResponse>("/bookings", payload);
    return data;
  } catch {
    return createOfflineBooking(payload);
  }
}

export async function getBooking(
  bookingId: string
): Promise<BookingDetail> {
  try {
    const { data } = await api.get<BookingDetail>(`/bookings/${bookingId}`);
    return data;
  } catch {
    const saved = getSavedBoardingPassById(bookingId);
    if (saved) return saved;
    throw new Error("Booking not found");
  }
}

export async function getBookingQR(bookingId: string): Promise<Blob> {
  const { data } = await api.get(`/bookings/${bookingId}/qr`, {
    responseType: "blob",
  });
  return data;
}

export async function previewGroupBooking(
  payload: GroupBookingRequest
): Promise<GroupBookingPreview> {
  try {
    const { data } = await api.post<GroupBookingPreview>(
      "/bookings/groups/preview",
      payload
    );
    return data;
  } catch {
    return previewOfflineGroupBooking(payload);
  }
}

export async function createGroupBooking(
  payload: GroupBookingRequest & {
    seat_assignments: Array<{ member_index: number; seat_label: string }>;
  }
): Promise<GroupBookingResponse> {
  try {
    const { data } = await api.post<GroupBookingResponse>("/bookings/groups", payload);
    return data;
  } catch {
    return createOfflineGroupBooking(payload);
  }
}

export async function getGroupBooking(groupId: string): Promise<GroupBookingResponse> {
  try {
    const { data } = await api.get<GroupBookingResponse>(`/bookings/groups/${groupId}`);
    return data;
  } catch {
    const saved = getSavedGroupBoardingPass(groupId);
    if (saved) return saved;
    throw new Error("Combined group pass not found");
  }
}

export async function verifyBoardingPass(
  token: string
): Promise<BoardingVerifyResponse> {
  try {
    const { data } = await api.post<BoardingVerifyResponse>("/boarding/verify", {
      token,
    });
    if (data.valid || (data.reason !== "booking_not_found" && data.reason !== "group_requires_review")) {
      return data;
    }
    const offline = verifyOfflineQrToken(token);
    if (offline.valid) {
      return offline;
    }
    return data;
  } catch {
    return verifyOfflineQrToken(token);
  }
}

export async function getDemoBoardingToken(): Promise<string> {
  try {
    const { data } = await api.get<{ token: string }>("/boarding/demo-token");
    return data.token || "";
  } catch {
    return "";
  }
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

export async function getEvidenceSummary(): Promise<EvidenceSummary> {
  const { data } = await api.get<EvidenceSummary>("/evidence/summary");
  return data;
}

export async function replayRetraining(): Promise<RetrainingReplay> {
  const { data } = await api.post<RetrainingReplay>("/demo/retraining-replay");
  return data;
}

// --- Model Admin ---

export async function triggerRetrain(
  epochs: number = 80,
  minNewRows: number = 30
): Promise<RetrainJobQueued> {
  const { data } = await api.post<RetrainJobQueued>("/forecasts/model/retrain", {
    epochs,
    min_new_rows: minNewRows,
  });
  return data;
}

export async function getRetrainStatus(
  jobId?: string
): Promise<RetrainJob> {
  const { data } = await api.get<RetrainJob>("/forecasts/model/retrain/status", {
    params: jobId ? { job_id: jobId } : {},
  });
  return data;
}

export async function listRetrainJobs(
  limit: number = 10
): Promise<RetrainJob[]> {
  const { data } = await api.get<RetrainJob[]>("/forecasts/model/retrain/jobs", {
    params: { limit },
  });
  return data;
}

export async function reloadModel(): Promise<{
  message: string;
  model_version: string | null;
  bundle_status: string;
  loaded_routes: string[];
}> {
  const { data } = await api.post("/forecasts/model/reload");
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
  try {
    const { data } = await api.post<PassengerResponse>("/passengers", payload);
    return data;
  } catch {
    return createOfflinePassenger(payload);
  }
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
  busId: string,
  travelDate?: string
): Promise<SeatMapEntry[]> {
  try {
    const { data } = await api.get<SeatMapEntry[]>(`/seats/bus/${busId}`, {
      params: travelDate ? { travel_date: travelDate } : {},
    });
    return data;
  } catch {
    return generateOfflineSeatMap(busId, travelDate);
  }
}

export async function getBusSeatMapSummary(
  busId: string
): Promise<SeatMapSummaryResponse> {
  try {
    const { data } = await api.get<SeatMapSummaryResponse>(`/seats/bus/${busId}/summary`);
    return data;
  } catch {
    const seats = generateOfflineSeatMap(busId);
    const occupied = seats.filter((s) => s.status !== "available").length;
    const accessTotal = seats.filter((s) => s.is_accessibility).length;
    const accessAvail = seats.filter((s) => s.is_accessibility && s.status === "available").length;
    return {
      bus_id: busId,
      seats,
      total_seats: seats.length,
      occupied_count: occupied,
      available_count: seats.length - occupied,
      accessibility_seat_count: accessTotal,
      accessibility_available_count: accessAvail,
    };
  }
}

export async function assignSeat(
  payload: SeatAssignRequest
): Promise<SeatAssignmentResult> {
  try {
    const { data } = await api.post<SeatAssignmentResult>("/seats/assign", payload);
    return data;
  } catch {
    const seats = generateOfflineSeatMap(payload.bus_id, payload.travel_date);
    return computeOfflineSeatAssignment(seats, payload.passenger);
  }
}

export async function recommendSeat(
  payload: SeatAssignRequest
): Promise<SeatAssignmentResult> {
  try {
    const { data } = await api.post<SeatAssignmentResult>(
      "/seats/recommend",
      payload
    );
    return data;
  } catch {
    const seats = generateOfflineSeatMap(payload.bus_id, payload.travel_date);
    return computeOfflineSeatAssignment(seats, payload.passenger);
  }
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

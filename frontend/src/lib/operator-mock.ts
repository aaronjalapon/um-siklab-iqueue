/** Centralized demo fixtures for the operator interface. */

import type { SurgePrediction } from "./types";
import { getLocalDateInputValue } from "@/lib/local-date";
import { OPERATOR_ROUTES } from "@/lib/routes";

export const OPERATOR_STATS = {
  activeBuses: 43,
  todaysBookings: 1247,
};

export interface BusCapacityEntry {
  plate: string;
  capacity: number;
  booked: number;
  route?: string;
}

export const MOCK_BUS_CAPACITY: BusCapacityEntry[] = [
  { plate: "DAV-001", capacity: 50, booked: 34, route: "Davao City → Cagayan de Oro" },
  { plate: "DAV-002", capacity: 45, booked: 41, route: "Davao City → Cagayan de Oro" },
  { plate: "DAV-003", capacity: 50, booked: 28, route: "Davao City → Cotabato City" },
  { plate: "DAV-004", capacity: 40, booked: 40, route: "Davao City → Cotabato City" },
  { plate: "GEN-001", capacity: 50, booked: 45, route: "Davao City → General Santos" },
  { plate: "GEN-002", capacity: 28, booked: 20, route: "Davao City → General Santos" },
  { plate: "CDO-001", capacity: 49, booked: 29, route: "Cagayan de Oro → Iligan City" },
  { plate: "CDO-002", capacity: 28, booked: 16, route: "Cagayan de Oro → Iligan City" },
  { plate: "BUT-001", capacity: 50, booked: 22, route: "Davao City → Butuan City" },
  { plate: "BUT-002", capacity: 28, booked: 17, route: "Davao City → Butuan City" },
  { plate: "ZAM-001", capacity: 40, booked: 15, route: "Cotabato City → Zamboanga City" },
  { plate: "ZAM-002", capacity: 28, booked: 11, route: "Cotabato City → Zamboanga City" },
  { plate: "PSY-001", capacity: 49, booked: 30, route: "Pasay → Baguio" },
  { plate: "PSY-002", capacity: 28, booked: 15, route: "Pasay → Baguio" },
  { plate: "CUB-001", capacity: 49, booked: 34, route: "Cubao → San Fernando City" },
  { plate: "CUB-002", capacity: 28, booked: 11, route: "Cubao → San Fernando City" },
  { plate: "BOH-001", capacity: 49, booked: 25, route: "Panglao → Tagbilaran" },
  { plate: "BOH-002", capacity: 28, booked: 20, route: "Panglao → Tagbilaran" },
  { plate: "BOH-003", capacity: 49, booked: 49, route: "Tagbilaran → Jagna" },
  { plate: "BOH-004", capacity: 28, booked: 27, route: "Tagbilaran → Jagna" },
];

export interface MockFleetBus {
  id: string;
  tenant_id: string;
  route_id: string;
  capacity: number;
  plate_number: string;
  origin: string;
  destination: string;
  available_seats: number;
  accessibility_seat_count: number;
  accessibility_available_count: number;
  surge_probability: number | null;
  surge_3day: { date: string; surge: number }[];
}

export function mockFleetFromCapacity(): MockFleetBus[] {
  return MOCK_BUS_CAPACITY.map((bus, i) => {
    const [origin = "Davao", destination = "Manila"] =
      bus.route?.split(" → ") ?? [];
    const route = OPERATOR_ROUTES.find(
      (candidate) =>
        candidate.origin === origin && candidate.destination === destination
    );

    return {
      id: `mock-bus-${i + 1}`,
      tenant_id: "00000000-0000-0000-0000-000000000099",
      route_id: route?.id ?? "00000000-0000-0000-0000-000000000001",
      capacity: bus.capacity,
      plate_number: bus.plate,
      origin,
      destination,
      available_seats: bus.capacity - bus.booked,
      accessibility_seat_count: Math.min(bus.capacity, 8),
      accessibility_available_count: Math.max(
        0,
        Math.min(bus.capacity, 8) -
          Math.max(0, bus.booked - (bus.capacity - 8))
      ),
      surge_probability:
        bus.booked / bus.capacity > 0.9
          ? 0.82
          : bus.booked / bus.capacity > 0.7
            ? 0.55
            : 0.28,
      surge_3day: [],
    };
  });
}

export type BoardingQueueStatus =
  | "pending"
  | "confirmed"
  | "boarded"
  | "missed";

export interface BoardingQueueEntry {
  bookingId: string;
  passengerName: string;
  seatNumber: string;
  busPlate: string;
  route: string;
  boardingWindowStart: string;
  boardingWindowEnd: string;
  status: BoardingQueueStatus;
}

function windowAroundNow(
  offsetMinutes: number,
  durationMinutes = 15
): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getTime() + offsetMinutes * 60 * 1000);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function generateMockBoardingQueue(): BoardingQueueEntry[] {
  const windows = [
    windowAroundNow(-20),
    windowAroundNow(-5),
    windowAroundNow(0),
    windowAroundNow(0),
    windowAroundNow(5),
    windowAroundNow(10),
    windowAroundNow(15),
    windowAroundNow(25),
    windowAroundNow(40),
    windowAroundNow(-45),
    windowAroundNow(-60),
    windowAroundNow(55),
    windowAroundNow(70),
    windowAroundNow(90),
    windowAroundNow(-90),
    windowAroundNow(120),
    windowAroundNow(-120),
    windowAroundNow(150),
  ];

  const passengers: Omit<BoardingQueueEntry, "boardingWindowStart" | "boardingWindowEnd" | "status">[] = [
    { bookingId: "b1", passengerName: "Maria Santos", seatNumber: "12A", busPlate: "DAV-001", route: "Davao City → Cagayan de Oro" },
    { bookingId: "b2", passengerName: "Juan Dela Cruz", seatNumber: "8B", busPlate: "DAV-001", route: "Davao City → Cagayan de Oro" },
    { bookingId: "b3", passengerName: "Anh Nguyen", seatNumber: "3C", busPlate: "DAV-002", route: "Davao City → Cagayan de Oro" },
    { bookingId: "b4", passengerName: "Budi Santoso", seatNumber: "15D", busPlate: "DAV-002", route: "Davao City → Cagayan de Oro" },
    { bookingId: "b5", passengerName: "Siti Rahayu", seatNumber: "7A", busPlate: "DAV-003", route: "Davao City → Cotabato City" },
    { bookingId: "b6", passengerName: "Raj Kumar", seatNumber: "22F", busPlate: "DAV-003", route: "Davao City → Cotabato City" },
    { bookingId: "b7", passengerName: "Lin Wei", seatNumber: "5B", busPlate: "DAV-004", route: "Davao City → Cotabato City" },
    { bookingId: "b8", passengerName: "Fatimah Hassan", seatNumber: "11C", busPlate: "GEN-001", route: "Davao City → General Santos" },
    { bookingId: "b9", passengerName: "Carlos Mendoza", seatNumber: "18A", busPlate: "GEN-001", route: "Davao City → General Santos" },
    { bookingId: "b10", passengerName: "Priya Sharma", seatNumber: "9D", busPlate: "GEN-002", route: "Davao City → General Santos" },
    { bookingId: "b11", passengerName: "Tran Minh", seatNumber: "14B", busPlate: "BUT-001", route: "Davao City → Butuan City" },
    { bookingId: "b12", passengerName: "Grace Tan", seatNumber: "6C", busPlate: "BUT-001", route: "Davao City → Butuan City" },
    { bookingId: "b13", passengerName: "Ahmad Ibrahim", seatNumber: "20A", busPlate: "ZAM-001", route: "Cotabato City → Zamboanga City" },
    { bookingId: "b14", passengerName: "Elena Reyes", seatNumber: "2F", busPlate: "CDO-001", route: "Cagayan de Oro → Iligan City" },
    { bookingId: "b15", passengerName: "Somchai P.", seatNumber: "16B", busPlate: "CDO-002", route: "Cagayan de Oro → Iligan City" },
    { bookingId: "b16", passengerName: "Lisa Wong", seatNumber: "4A", busPlate: "DAV-001", route: "Davao City → Cagayan de Oro" },
    { bookingId: "b17", passengerName: "Hassan Ali", seatNumber: "10D", busPlate: "DAV-003", route: "Davao City → Cotabato City" },
    { bookingId: "b18", passengerName: "Yuki Tanaka", seatNumber: "13C", busPlate: "BUT-002", route: "Davao City → Butuan City" },
  ];

  const statuses: BoardingQueueStatus[] = [
    "boarded",
    "confirmed",
    "confirmed",
    "confirmed",
    "confirmed",
    "pending",
    "pending",
    "pending",
    "pending",
    "pending",
    "missed",
    "boarded",
    "confirmed",
    "pending",
    "pending",
    "missed",
    "boarded",
    "pending",
  ];

  return passengers.map((p, i) => ({
    ...p,
    boardingWindowStart: windows[i].start,
    boardingWindowEnd: windows[i].end,
    status: statuses[i],
  }));
}

export function generateMockForecast(routeId: string): SurgePrediction[] {
  const routeIndex = OPERATOR_ROUTES.findIndex((r) => r.id === routeId);
  const seed = routeIndex >= 0 ? routeIndex + 1 : 1;
  const sample: SurgePrediction[] = [];

  for (let i = 1; i <= 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const surgeBase = 0.25 + ((seed * i * 7) % 50) / 100;
    const surgeProbability = Math.min(0.95, surgeBase + (i % 3) * 0.12);
    const riskLevel =
      surgeProbability >= 0.85
        ? "critical"
        : surgeProbability >= 0.7
          ? "high"
          : surgeProbability >= 0.4
            ? "moderate"
            : "low";
    sample.push({
      forecast_snapshot_id: null,
      forecast_date: getLocalDateInputValue(d),
      surge_probability: surgeProbability,
      predicted_volume: Math.floor(80 + seed * 15 + i * 12),
      confidence_lower: 60,
      confidence_upper: 160,
      is_holiday: i === 3 && seed === 1,
      holiday_name: i === 3 && seed === 1 ? "Demo Holiday" : null,
      risk_level: riskLevel,
      recommended_action:
        riskLevel === "critical"
          ? "Prepare standby bus and activate crowd-control plan"
          : riskLevel === "high"
            ? "Open extra boarding lane and notify dispatcher"
            : riskLevel === "moderate"
              ? "Stage extra staff and monitor queue growth"
              : "Continue normal boarding operations",
      model_confidence: 0.72,
    });
  }

  return sample;
}

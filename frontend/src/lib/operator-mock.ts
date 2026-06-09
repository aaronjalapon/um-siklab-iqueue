/** Centralized demo fixtures for the operator interface. */

import type { SurgePrediction } from "./types";

export interface DemoRoute {
  id: string;
  origin: string;
  destination: string;
  label: string;
}

export const DEMO_ROUTES: DemoRoute[] = [
  {
    id: "26fd7e27-4920-510b-ae57-9424533347da",  // davao-cagayan (UUID v5)
    origin: "Davao City",
    destination: "Cagayan de Oro",
    label: "Davao → Cagayan de Oro",
  },
  {
    id: "eea70a1a-7420-5c5a-85f5-8f619fb68fa2",  // davao-cotabato
    origin: "Davao City",
    destination: "Cotabato City",
    label: "Davao → Cotabato",
  },
  {
    id: "f55422ef-6b76-56bb-99a1-47bf020e2112",  // davao-general-santos
    origin: "Davao City",
    destination: "General Santos",
    label: "Davao → General Santos",
  },
  {
    id: "16dc0d63-62dc-56ca-933b-d5bf6a344c12",  // cagayan-iligan
    origin: "Cagayan de Oro",
    destination: "Iligan City",
    label: "Cagayan de Oro → Iligan",
  },
  {
    id: "bcb30dde-1726-5ebe-b10f-6e00d93627ac",  // davao-butuan
    origin: "Davao City",
    destination: "Butuan City",
    label: "Davao → Butuan",
  },
  {
    id: "51f3fda4-ea0f-5d02-8151-8b277dc29165",  // cotabato-zambo
    origin: "Cotabato City",
    destination: "Zamboanga City",
    label: "Cotabato → Zamboanga",
  },
];

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
  { plate: "BUT-001", capacity: 50, booked: 22, route: "Davao City → Butuan City" },
  { plate: "ZAM-001", capacity: 40, booked: 15, route: "Cotabato City → Zamboanga City" },
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
  surge_probability: number | null;
}

export function mockFleetFromCapacity(): MockFleetBus[] {
  return MOCK_BUS_CAPACITY.map((bus, i) => ({
    id: `mock-bus-${i + 1}`,
    tenant_id: "00000000-0000-0000-0000-000000000099",
    route_id: "00000000-0000-0000-0000-000000000001",
    capacity: bus.capacity,
    plate_number: bus.plate,
    origin: bus.route?.split(" → ")[0] ?? "Davao",
    destination: bus.route?.split(" → ")[1] ?? "Manila",
    available_seats: bus.capacity - bus.booked,
    surge_probability:
      bus.booked / bus.capacity > 0.9
        ? 0.82
        : bus.booked / bus.capacity > 0.7
          ? 0.55
          : 0.28,
  }));
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
  const routeIndex = DEMO_ROUTES.findIndex((r) => r.id === routeId);
  const seed = routeIndex >= 0 ? routeIndex + 1 : 1;
  const sample: SurgePrediction[] = [];

  for (let i = 1; i <= 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const surgeBase = 0.25 + ((seed * i * 7) % 50) / 100;
    sample.push({
      forecast_date: d.toISOString().split("T")[0],
      surge_probability: Math.min(0.95, surgeBase + (i % 3) * 0.12),
      predicted_volume: Math.floor(80 + seed * 15 + i * 12),
      confidence_lower: 60,
      confidence_upper: 160,
      is_holiday: i === 3 && seed === 1,
      holiday_name: i === 3 && seed === 1 ? "Demo Holiday" : null,
    });
  }

  return sample;
}

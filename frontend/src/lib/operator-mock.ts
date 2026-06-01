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
    id: "00000000-0000-0000-0000-000000000001",
    origin: "Davao",
    destination: "Manila",
    label: "Davao → Manila",
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    origin: "Cebu",
    destination: "Manila",
    label: "Cebu → Manila",
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    origin: "Jakarta",
    destination: "Surabaya",
    label: "Jakarta → Surabaya",
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
  { plate: "PH-0001", capacity: 50, booked: 34, route: "Davao → Manila" },
  { plate: "PH-0002", capacity: 45, booked: 41, route: "Davao → Manila" },
  { plate: "PH-0003", capacity: 55, booked: 28, route: "Cebu → Manila" },
  { plate: "PH-0004", capacity: 50, booked: 50, route: "Davao → Manila" },
  { plate: "ID-0005", capacity: 60, booked: 45, route: "Jakarta → Surabaya" },
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
    { bookingId: "b1", passengerName: "Maria Santos", seatNumber: "12A", busPlate: "PH-0001", route: "Davao → Manila" },
    { bookingId: "b2", passengerName: "Juan Dela Cruz", seatNumber: "8B", busPlate: "PH-0001", route: "Davao → Manila" },
    { bookingId: "b3", passengerName: "Anh Nguyen", seatNumber: "3C", busPlate: "PH-0002", route: "Davao → Manila" },
    { bookingId: "b4", passengerName: "Budi Santoso", seatNumber: "15D", busPlate: "PH-0002", route: "Davao → Manila" },
    { bookingId: "b5", passengerName: "Siti Rahayu", seatNumber: "7A", busPlate: "PH-0003", route: "Cebu → Manila" },
    { bookingId: "b6", passengerName: "Raj Kumar", seatNumber: "22F", busPlate: "PH-0003", route: "Cebu → Manila" },
    { bookingId: "b7", passengerName: "Lin Wei", seatNumber: "5B", busPlate: "PH-0004", route: "Davao → Manila" },
    { bookingId: "b8", passengerName: "Fatimah Hassan", seatNumber: "11C", busPlate: "PH-0004", route: "Davao → Manila" },
    { bookingId: "b9", passengerName: "Carlos Mendoza", seatNumber: "18A", busPlate: "ID-0005", route: "Jakarta → Surabaya" },
    { bookingId: "b10", passengerName: "Priya Sharma", seatNumber: "9D", busPlate: "ID-0005", route: "Jakarta → Surabaya" },
    { bookingId: "b11", passengerName: "Tran Minh", seatNumber: "14B", busPlate: "PH-0001", route: "Davao → Manila" },
    { bookingId: "b12", passengerName: "Grace Tan", seatNumber: "6C", busPlate: "PH-0002", route: "Davao → Manila" },
    { bookingId: "b13", passengerName: "Ahmad Ibrahim", seatNumber: "20A", busPlate: "PH-0003", route: "Cebu → Manila" },
    { bookingId: "b14", passengerName: "Elena Reyes", seatNumber: "2F", busPlate: "PH-0004", route: "Davao → Manila" },
    { bookingId: "b15", passengerName: "Somchai P.", seatNumber: "16B", busPlate: "ID-0005", route: "Jakarta → Surabaya" },
    { bookingId: "b16", passengerName: "Lisa Wong", seatNumber: "4A", busPlate: "PH-0001", route: "Davao → Manila" },
    { bookingId: "b17", passengerName: "Hassan Ali", seatNumber: "10D", busPlate: "PH-0002", route: "Davao → Manila" },
    { bookingId: "b18", passengerName: "Yuki Tanaka", seatNumber: "13C", busPlate: "PH-0003", route: "Cebu → Manila" },
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

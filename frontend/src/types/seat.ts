/** TypeScript types mirroring the IQueue seat assignment Pydantic schemas. */

export type SeatType = "window" | "aisle" | "middle";
export type SeatStatus = "available" | "occupied" | "reserved" | "blocked";
export type SeatSide = "left" | "right";

export interface SeatMapEntry {
  seat_id: string;
  seat_label: string; // e.g. "3B"
  row_number: number;
  col_number: number;
  seat_type: SeatType;
  side: SeatSide;
  is_near_exit: boolean;
  is_accessibility: boolean;
  status: SeatStatus;
  passenger_name?: string;
  group_id?: string;
  language_preference?: string;
  travel_habit?: string;
  lifestyle_interest?: string;
  needs_accessibility?: boolean;
  preferred_seat_type?: string;
  affinity_score?: number;
  boarding_window?: string;
}

export interface SeatMapSummaryResponse {
  bus_id: string;
  seats: SeatMapEntry[];
  total_seats: number;
  occupied_count: number;
  available_count: number;
}

export interface PassengerContext {
  booking_id: string;
  passenger_name: string;
  group_id?: string;
  language_preference?: string;
  travel_habit?: string;
  lifestyle_interest?: string;
  needs_accessibility: boolean;
  preferred_seat_type?: SeatType;
  preferred_side?: SeatSide;
}

export interface SeatAssignmentResult {
  seat_id: string;
  seat_label: string;
  seat_type: SeatType;
  side: SeatSide;
  row_number: number;
  affinity_score: number;
  boarding_window?: string;
}

export interface SeatAssignRequest {
  bus_id: string;
  passenger: PassengerContext;
}

export interface SeatSwapRequest {
  booking_id_a: string;
  booking_id_b: string;
}

export interface SeatSwapResponse {
  status: string;
  seat_a: string;
  seat_b: string;
}

/** UI state per seat cell in the grid. */
export type SeatCellState =
  | "available"
  | "occupied"
  | "selected" // passenger's current selection
  | "auto_assigned" // AI-recommended seat (pre-highlighted)
  | "group_reserved" // held for group member
  | "accessibility" // accessibility-priority seat
  | "blocked";

/** TypeScript interfaces mirroring the IQueue Pydantic schemas. */

export interface Bus {
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

export interface BusListResponse {
  buses: Bus[];
  total: number;
  route_origin: string;
  route_destination: string;
}

export interface SeatInfo {
  seat_number: string;
  is_available: boolean;
  passenger_name: string | null;
}

export interface SeatMapResponse {
  bus_id: string;
  capacity: number;
  seats: SeatInfo[];
  booked_count: number;
  available_count: number;
}

export interface BookingCreate {
  passenger_id: string;
  bus_id: string;
  departure_date: string;
  seat_preference?: string;
  travel_group?: string[];
}

export interface BookingResponse {
  id: string;
  passenger_id: string;
  bus_id: string;
  seat_number: string;
  boarding_window_start: string;
  boarding_window_end: string;
  status: string;
  qr_token: string | null;
  departure_date: string;
  created_at: string;
}

export interface BookingDetail extends BookingResponse {
  passenger_name: string | null;
  route_origin: string | null;
  route_destination: string | null;
}

export interface SurgePrediction {
  forecast_date: string;
  surge_probability: number;
  predicted_volume: number;
  confidence_lower: number | null;
  confidence_upper: number | null;
  is_holiday: boolean;
  holiday_name: string | null;
}

export interface ForecastResponse {
  route_id: string;
  route_origin: string;
  route_destination: string;
  generated_at: string;
  predictions: SurgePrediction[];
}

export interface ChatbotRequest {
  query: string;
  language?: string;
  booking_id?: string;
}

export interface ChatbotResponse {
  response_text: string;
  detected_language: string;
  intent: string;
  suggested_actions: string[];
  confidence: number;
}

/** Passenger form data used in seat booking. */
export interface PassengerFormData {
  name: string;
  phone: string;
  language_pref: string;
  travel_habits: string;
  accessibility_needs: boolean;
}

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
  accessibility_seat_count: number;
  accessibility_available_count: number;
  surge_probability: number | null;
  surge_3day: { date: string; surge: number }[];
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
  is_accessibility: boolean;
  is_near_exit: boolean;
  passenger_name: string | null;
}

export interface SeatMapResponse {
  bus_id: string;
  capacity: number;
  seats: SeatInfo[];
  booked_count: number;
  available_count: number;
  accessibility_seat_count: number;
  accessibility_available_count: number;
}

export interface BookingCreate {
  passenger_id: string;
  bus_id: string;
  departure_date: string;
  seat_preference?: string;
  selected_seat?: string;
  travel_group?: string[];
  passenger_name?: string;
  group_id?: string;
  language_preference?: string;
  travel_habit?: string;
  lifestyle_interest?: string;
  needs_accessibility?: boolean;
  preferred_side?: string;
  affinity_opt_in?: boolean;
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
  forecast_snapshot_id: string | null;
  forecast_date: string;
  surge_probability: number;
  predicted_volume: number;
  confidence_lower: number | null;
  confidence_upper: number | null;
  is_holiday: boolean;
  holiday_name: string | null;
  risk_level: "low" | "moderate" | "high" | "critical";
  recommended_action: string;
  model_confidence: number | null;
}

export interface ForecastResponse {
  route_id: string;
  route_origin: string;
  route_destination: string;
  generated_at: string;
  model_source: "ml_bundle" | "heuristic";
  model_version: string | null;
  metrics_summary: Record<string, unknown> | null;
  predictions: SurgePrediction[];
}

export interface ForecastActionCreate {
  tenant_id: string;
  forecast_snapshot_id: string;
  action_taken: "accepted" | "modified" | "rejected";
  override_type?: string;
  override_reason?: string;
  notes?: string;
  operator_id?: string;
  final_action?: string;
}

export interface ForecastActionResponse {
  id: string;
  tenant_id: string;
  route_id: string;
  forecast_snapshot_id: string;
  action_taken: string;
  override_type: string | null;
  override_reason: string | null;
  notes: string | null;
  operator_id: string | null;
  final_action: string | null;
  decided_at: string;
}

export interface LearningLogSummary {
  tenant_id: string;
  route_id: string | null;
  forecast_snapshots: number;
  operator_actions: number;
  operational_outcomes: number;
  ground_truth_ready_rows: number;
  latest_outcome_date: string | null;
}

export interface OperationalOutcomeCreate {
  tenant_id: string;
  route_id: string;
  service_date: string;
  actual_passenger_count: number;
  peak_queue_length?: number | null;
  average_wait_time_minutes?: number | null;
  wait_time_p95_minutes?: number | null;
  extra_buses_dispatched?: number;
  lanes_opened?: number;
  missed_boardings?: number;
  overcrowding_incident?: boolean;
  recorded_by?: string;
  notes?: string;
}

export interface OperationalOutcomeResponse extends OperationalOutcomeCreate {
  id: string;
  created_at: string;
}

export interface BoardingVerifyResponse {
  valid: boolean;
  reason: string;
  signature_valid: boolean;
  boarding_status: string;
  booking_id: string | null;
  passenger_id: string | null;
  route_id: string | null;
  bus_id: string | null;
  seat: string | null;
  boarding_window: string | null;
}

export interface EvidenceSummary {
  generated_at: string;
  data_disclosure: {
    data_type: "synthetic";
    field_pilot_completed: boolean;
    statement: string;
  };
  active_bundle: {
    version: string | null;
    status: "complete" | "partial" | "unavailable";
    loaded_routes: string[];
    classifier_loaded: boolean;
    metadata: Record<string, unknown>;
  };
  model_comparison: Array<Record<string, string | number | null>>;
  subsystems: Record<string, Record<string, unknown>>;
}

export interface RetrainingReplay {
  simulated: true;
  mutated_champion: false;
  replayed_at: string;
  stages: Array<Record<string, string | number>>;
  champion_metrics: Record<string, number>;
  candidate_metrics: Record<string, number>;
  decision: "promote" | "retain_champion";
  reasons: string[];
  disclosure: string;
}

export type RetrainJobStatus =
  | "queued"
  | "checking_data"
  | "training"
  | "evaluating"
  | "promoting"
  | "promoted"
  | "rejected"
  | "skipped"
  | "failed";

export interface RetrainMetrics {
  avg_mae: number;
  avg_surge_f1: number;
  avg_surge_recall: number;
  routes_evaluated: number;
}

export interface RetrainDecision {
  decided_at: string;
  passed: boolean;
  reasons: string[];
  ground_truth_rows: number;
  champion_metrics: RetrainMetrics;
  candidate_metrics: RetrainMetrics;
}

export interface RetrainJob {
  job_id: string;
  status: RetrainJobStatus;
  started_at: string | null;
  finished_at: string | null;
  ground_truth_rows: number | null;
  decision: RetrainDecision | null;
  archived_champion: string | null;
  message: string | null;
  error: string | null;
  epochs: number | null;
}

export interface RetrainJobQueued {
  job_id: string;
  status: "queued";
  message: string;
}

export interface ChatbotRequest {
  query: string;
  language?: string;
  booking_id?: string;
  session_id?: string;
  phone?: string;
}

export type ChatbotActionKind =
  | "send_message"
  | "prefill_route_search"
  | "open_booking"
  | "open_qr"
  | "handoff";

export interface ChatbotAction {
  id: string;
  label: string;
  kind: ChatbotActionKind;
  payload: Record<string, string | number | boolean | null | undefined>;
}

export interface ChatbotResponse {
  response_text: string;
  detected_language: string;
  language_confidence: number | null;
  intent: string;
  suggested_actions: string[];
  actions: ChatbotAction[];
  confidence: number;
  session_id: string | null;
  degradation_level: number;
}

export interface SessionCreateResponse {
  session_id: string;
  greeting: string;
  language: string;
}

/** Passenger form data used in seat booking. */
export interface PassengerFormData {
  name: string;
  phone: string;
  language_pref: string;
  travel_habits: string;
  lifestyle_interests: string;
  affinity_opt_in: boolean;
  accessibility_needs: boolean;
  preferred_seat_type: string; // "window" | "aisle" | ""
  preferred_side: string; // "left" | "right" | ""
}

/** Request body for creating/finding a passenger. */
export interface PassengerCreate {
  tenant_id: string;
  name: string;
  phone: string;
  language_pref: string;
  travel_habits?: string;
  lifestyle_interests?: string;
  accessibility_needs: boolean;
}

/** Response from the passenger API. */
export interface PassengerResponse {
  id: string;
  tenant_id: string;
  name: string;
  phone: string;
  language_pref: string;
  travel_habits: string | null;
  lifestyle_interests: string | null;
  accessibility_needs: boolean;
}

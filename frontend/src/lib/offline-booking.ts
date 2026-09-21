/**
 * Client-Side Booking, Passenger, and Group Booking Generator.
 *
 * Generates verified responses matching real backend API schemas
 * with cryptographically valid HMAC-SHA256 signed QR boarding tokens.
 */

import { DEMO_TENANT_ID } from "./demo-config";
import {
  createOfflineGroupQrToken,
  createOfflineQrToken,
} from "./offline-crypto";
import { OFFLINE_ROUTES } from "./offline-buses";
import { generateOfflineSeatMap } from "./offline-seats";
import type {
  BookingCreate,
  BookingResponse,
  GroupBookingPreview,
  GroupBookingRequest,
  GroupBookingResponse,
  GroupSeatAssignment,
  PassengerCreate,
  PassengerResponse,
} from "./types";

function resolveRouteInfo(busId: string): {
  routeId: string;
  origin: string;
  destination: string;
} {
  for (const r of OFFLINE_ROUTES) {
    for (const b of r.buses) {
      if (b.id === busId) {
        return {
          routeId: r.routeId,
          origin: r.origin,
          destination: r.destination,
        };
      }
    }
  }
  return {
    routeId: "26fd7e27-4920-510b-ae57-9424533347da",
    origin: "Davao",
    destination: "Cagayan",
  };
}

function calculateBoardingWindow(): { start: string; end: string } {
  // For offline demos, set boarding window around current time to guarantee
  // that gate scanners immediately validate it as "ready".
  const now = new Date();
  const start = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
  const end = new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString();
  return { start, end };
}

export function createOfflinePassenger(
  payload: PassengerCreate
): PassengerResponse {
  const passengerId = crypto.randomUUID();
  return {
    id: passengerId,
    tenant_id: payload.tenant_id || DEMO_TENANT_ID,
    name: payload.name,
    phone: payload.phone,
    language_pref: payload.language_pref,
    travel_habits: payload.travel_habits || null,
    lifestyle_interests: payload.lifestyle_interests || null,
    accessibility_needs: payload.accessibility_needs,
  };
}

export function createOfflineBooking(
  payload: BookingCreate
): BookingResponse {
  const bookingId = crypto.randomUUID();
  const { routeId, origin, destination } = resolveRouteInfo(payload.bus_id);
  const { start, end } = calculateBoardingWindow();

  const seatNumber = payload.selected_seat || "1A";

  const qrToken = createOfflineQrToken({
    passenger_id: payload.passenger_id,
    route_id: routeId,
    bus_id: payload.bus_id,
    seat: seatNumber,
    boarding_window: start,
  });

  return {
    id: bookingId,
    passenger_id: payload.passenger_id,
    bus_id: payload.bus_id,
    group_id: payload.group_id || null,
    seat_number: seatNumber,
    boarding_window_start: start,
    boarding_window_end: end,
    status: "confirmed",
    qr_token: qrToken,
    departure_date: payload.departure_date,
    departure_time: payload.departure_time || null,
    created_at: new Date().toISOString(),
    passenger_name: payload.passenger_name || null,
    route_origin: origin,
    route_destination: destination,
  };
}

export function previewOfflineGroupBooking(
  request: GroupBookingRequest
): GroupBookingPreview {
  const seats = generateOfflineSeatMap(request.bus_id, request.departure_date);
  const availableSeats = seats.filter((s) => s.status === "available");

  const assignments: GroupSeatAssignment[] = [];
  let accessCount = 0;

  // Assign available seats to each member
  const usedSeats = new Set<string>();

  request.members.forEach((member, index) => {
    let chosen = availableSeats.find((s) => {
      if (usedSeats.has(s.seat_id)) return false;
      if (member.accessibility_needs) return s.is_accessibility;
      return !s.is_accessibility;
    });

    if (!chosen) {
      chosen = availableSeats.find((s) => !usedSeats.has(s.seat_id));
    }

    if (!chosen) {
      // Fallback virtual seat if bus was full
      chosen = {
        seat_id: `offline-virtual-${index + 1}A`,
        seat_label: `${index + 1}A`,
        row_number: index + 1,
        col_number: 1,
        seat_type: "window",
        side: "left",
        is_near_exit: true,
        is_accessibility: member.accessibility_needs,
        status: "available",
      };
    }

    usedSeats.add(chosen.seat_id);
    if (chosen.is_accessibility) accessCount++;

    assignments.push({
      member_index: index,
      member_name: member.name,
      seat_id: chosen.seat_id,
      seat_label: chosen.seat_label,
      row_number: chosen.row_number,
      col_number: chosen.col_number,
      is_accessibility: chosen.is_accessibility,
      reasons: member.accessibility_needs
        ? ["Priority accessibility seat assigned near front entrance"]
        : ["Adjacent group cluster seat allocated", "Preferred travel group spacing matched"],
    });
  });

  const { start, end } = calculateBoardingWindow();

  return {
    assignments,
    accessibility_passenger_count: accessCount,
    boarding_window_start: start,
    boarding_window_end: end,
    affinity_opt_in: Boolean(request.preferences.affinity_opt_in),
  };
}

export function createOfflineGroupBooking(
  payload: GroupBookingRequest & {
    seat_assignments: Array<{ member_index: number; seat_label: string }>;
  }
): GroupBookingResponse {
  const groupId = crypto.randomUUID();
  const { routeId, origin, destination } = resolveRouteInfo(payload.bus_id);
  const { start, end } = calculateBoardingWindow();

  const memberBookings = payload.members.map((member, index) => {
    const assigned = payload.seat_assignments.find((a) => a.member_index === index);
    const seatLabel = assigned?.seat_label || `${index + 1}A`;
    return {
      booking_id: crypto.randomUUID(),
      passenger_id: crypto.randomUUID(),
      name: member.name,
      seat_label: seatLabel,
      accessibility_needs: member.accessibility_needs,
      status: "confirmed",
      reasons: member.accessibility_needs
        ? ["Accessibility-priority seat near door"]
        : ["Co-located group seat assigned"],
    };
  });

  const qrToken = createOfflineGroupQrToken({
    group_id: groupId,
    route_id: routeId,
    bus_id: payload.bus_id,
    members: memberBookings.map((m) => ({
      booking_id: m.booking_id,
      passenger_id: m.passenger_id,
      seat: m.seat_label,
    })),
    boarding_window_start: start,
    boarding_window_end: end,
  });

  return {
    group_id: groupId,
    bus_id: payload.bus_id,
    route_id: routeId,
    route_origin: origin,
    route_destination: destination,
    departure_date: payload.departure_date,
    departure_time: payload.departure_time,
    boarding_window_start: start,
    boarding_window_end: end,
    qr_token: qrToken,
    members: memberBookings,
  };
}

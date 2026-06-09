"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  SeatMapEntry,
  SeatAssignmentResult,
  PassengerContext,
} from "@/types/seat";
import { getBusSeatMap, assignSeat as apiAssignSeat } from "@/lib/api";

export function useSeatMap(busId: string) {
  const [seats, setSeats] = useState<SeatMapEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSeats = useCallback(() => {
    if (!busId) return;
    setLoading(true);
    setError(null);
    getBusSeatMap(busId)
      .then((data) => {
        setSeats(data);
        setLoading(false);
      })
      .catch((e: Error) => {
        setError(e.message);
        setLoading(false);
      });
  }, [busId]);

  useEffect(() => {
    fetchSeats();
  }, [fetchSeats]);

  const assignSeat = useCallback(
    async (passenger: PassengerContext): Promise<SeatAssignmentResult> => {
      const result = await apiAssignSeat({
        bus_id: busId,
        passenger,
      });
      // Refresh seat map after assignment
      await fetchSeats();
      return result;
    },
    [busId, fetchSeats]
  );

  const refreshSeats = useCallback(() => {
    fetchSeats();
  }, [fetchSeats]);

  return { seats, loading, error, assignSeat, refreshSeats };
}

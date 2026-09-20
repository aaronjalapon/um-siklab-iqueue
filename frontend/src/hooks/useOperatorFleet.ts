"use client";

import { useCallback, useEffect, useState } from "react";
import { searchBuses } from "@/lib/api";
import { getLocalDateInputValue } from "@/lib/local-date";
import { mockFleetFromCapacity } from "@/lib/operator-mock";
import type { Bus } from "@/lib/types";

export type FleetLoadState = "loading" | "success" | "empty" | "error" | "demo";

export interface UseOperatorFleetOptions {
  origin: string;
  destination: string;
  travelDate: string;
}

export interface UseOperatorFleetResult {
  buses: Bus[];
  loadState: FleetLoadState;
  refetch: () => void;
  loadDemo: () => void;
}

export function useOperatorFleet({
  origin,
  destination,
  travelDate,
}: UseOperatorFleetOptions): UseOperatorFleetResult {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loadState, setLoadState] = useState<FleetLoadState>("loading");
  const [fetchKey, setFetchKey] = useState(0);

  const refetch = useCallback(() => {
    setFetchKey((k) => k + 1);
  }, []);

  const demoBuses = useCallback(
    () =>
      (mockFleetFromCapacity() as Bus[]).filter(
        (bus) => bus.origin === origin && bus.destination === destination
      ),
    [destination, origin]
  );

  const loadDemo = useCallback(() => {
    setBuses(demoBuses());
    setLoadState("demo");
  }, [demoBuses]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadState("loading");
      try {
        const data = await searchBuses(origin, destination, travelDate);
        if (cancelled) return;
        if (data.buses.length > 0) {
          setBuses(data.buses);
          setLoadState("success");
        } else {
          setBuses(demoBuses());
          setLoadState("demo");
        }
      } catch {
        if (cancelled) return;
        setBuses(demoBuses());
        setLoadState("demo");
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [origin, destination, travelDate, fetchKey, demoBuses]);

  return { buses, loadState, refetch, loadDemo };
}

export function todayIsoDate(): string {
  return getLocalDateInputValue();
}

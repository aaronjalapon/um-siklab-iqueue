"use client";

import { useCallback, useEffect, useState } from "react";
import { searchBuses } from "@/lib/api";
import { DEMO_ROUTES, mockFleetFromCapacity } from "@/lib/operator-mock";
import type { Bus } from "@/lib/types";

export type FleetLoadState = "loading" | "success" | "demo";

export interface UseOperatorFleetOptions {
  origin: string;
  destination: string;
  travelDate: string;
}

export interface UseOperatorFleetResult {
  buses: Bus[];
  loadState: FleetLoadState;
  refetch: () => void;
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

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await searchBuses(origin, destination, travelDate);
        if (cancelled) return;
        if (data.buses.length > 0) {
          setBuses(data.buses);
          setLoadState("success");
        } else {
          setBuses(mockFleetFromCapacity() as Bus[]);
          setLoadState("demo");
        }
      } catch {
        if (cancelled) return;
        setBuses(mockFleetFromCapacity() as Bus[]);
        setLoadState("demo");
      }
    }

    queueMicrotask(() => {
      if (!cancelled) setLoadState("loading");
    });
    void load();

    return () => {
      cancelled = true;
    };
  }, [origin, destination, travelDate, fetchKey]);

  return { buses, loadState, refetch };
}

export function todayIsoDate(): string {
  return new Date().toISOString().split("T")[0];
}

export { DEMO_ROUTES };

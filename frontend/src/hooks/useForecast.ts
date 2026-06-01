"use client";

import { useCallback, useEffect, useState } from "react";
import { getForecast } from "@/lib/api";
import { generateMockForecast } from "@/lib/operator-mock";
import type { ForecastResponse, SurgePrediction } from "@/lib/types";

export type ForecastLoadState = "loading" | "success" | "demo";

export interface UseForecastResult {
  predictions: SurgePrediction[];
  routeOrigin: string | null;
  routeDestination: string | null;
  loadState: ForecastLoadState;
  refetch: () => void;
}

export function useForecast(routeId: string): UseForecastResult {
  const [predictions, setPredictions] = useState<SurgePrediction[]>([]);
  const [routeOrigin, setRouteOrigin] = useState<string | null>(null);
  const [routeDestination, setRouteDestination] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<ForecastLoadState>("loading");
  const [fetchKey, setFetchKey] = useState(0);

  const refetch = useCallback(() => {
    setFetchKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data: ForecastResponse = await getForecast(routeId);
        if (cancelled) return;
        setPredictions(data.predictions);
        setRouteOrigin(data.route_origin);
        setRouteDestination(data.route_destination);
        setLoadState("success");
      } catch {
        if (cancelled) return;
        setPredictions(generateMockForecast(routeId));
        setRouteOrigin(null);
        setRouteDestination(null);
        setLoadState("demo");
      }
    }

    // Reset loading when route or refetch changes (async fetch below)
    queueMicrotask(() => {
      if (!cancelled) setLoadState("loading");
    });
    void load();

    return () => {
      cancelled = true;
    };
  }, [routeId, fetchKey]);

  return {
    predictions,
    routeOrigin,
    routeDestination,
    loadState,
    refetch,
  };
}

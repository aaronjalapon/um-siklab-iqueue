"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { geoMercator, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Feature, GeoJsonProperties, Geometry } from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  CircleDot,
  Layers3,
  MapPin,
  Network,
  Route,
  ShieldCheck,
} from "lucide-react";
import {
  ASEAN_HUBS,
  ASEAN_ROUTES,
  PHILIPPINE_HUBS,
  PHILIPPINE_ROUTES,
  type NetworkFilter,
  type NetworkHub,
  type NetworkMode,
  type NetworkRoute,
} from "./network-data";

const WIDTH = 900;
const HEIGHT = 560;
const ASEAN_ISO_CODES = new Set(["096", "104", "116", "360", "418", "458", "608", "702", "704", "764"]);

type CountryFeature = Feature<Geometry, GeoJsonProperties> & { id?: string | number };
type CountryTopology = Topology<{ countries: GeometryCollection }>;

function featureId(value: CountryFeature["id"]): string {
  return String(value ?? "").padStart(3, "0");
}

function connectedRoutes(hubId: string, routes: NetworkRoute[]): number {
  return routes.filter((route) => route.from === hubId || route.to === hubId).length;
}

const PHILIPPINE_FILTERS = [
  { value: "all", label: "All Regions" },
  { value: "luzon", label: "Luzon" },
  { value: "visayas", label: "Visayas" },
  { value: "mindanao", label: "Mindanao" },
] as const;

const ASEAN_FILTERS = [
  { value: "all", label: "All Hubs" },
  { value: "philippines", label: "Philippine Corridors" },
  { value: "cross-border", label: "Cross-border ASEAN" },
] as const;

export default function CoveredCitiesSection() {
  const [mode, setMode] = useState<NetworkMode>("philippines");
  const [filter, setFilter] = useState<NetworkFilter>("all");
  const [activeId, setActiveId] = useState("davao-city");
  const [countries, setCountries] = useState<CountryFeature[]>([]);
  const [mapError, setMapError] = useState(false);

  const directoryListRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function loadMap() {
      try {
        const response = await fetch("/maps/countries-50m.json", { signal: controller.signal });
        if (!response.ok) throw new Error("Map asset unavailable");
        const topology = (await response.json()) as CountryTopology;
        const result = feature(topology, topology.objects.countries);
        const nextCountries = result.type === "FeatureCollection" ? result.features : [result];
        setCountries(nextCountries as CountryFeature[]);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setMapError(true);
      }
    }

    void loadMap();
    return () => controller.abort();
  }, []);

  const hubs = mode === "philippines" ? PHILIPPINE_HUBS : ASEAN_HUBS;
  const routes = mode === "philippines" ? PHILIPPINE_ROUTES : ASEAN_ROUTES;

  const visibleHubs = useMemo(() => {
    if (mode === "philippines") {
      if (filter === "all") return PHILIPPINE_HUBS;
      return PHILIPPINE_HUBS.filter((hub) => hub.region === filter);
    }
    if (filter === "all") return ASEAN_HUBS;
    return ASEAN_HUBS.filter((hub) =>
      filter === "philippines" ? hub.region === "philippines" : hub.region === "asean"
    );
  }, [filter, mode]);

  const visibleHubIds = useMemo(() => new Set(visibleHubs.map((hub) => hub.id)), [visibleHubs]);
  const visibleRoutes = useMemo(() => {
    return routes.filter((route) => visibleHubIds.has(route.from) && visibleHubIds.has(route.to));
  }, [routes, visibleHubIds]);

  const activeHub = visibleHubs.find((hub) => hub.id === activeId) ?? visibleHubs[0] ?? hubs[0];
  const highlightedRoutes = new Set(
    visibleRoutes.filter((route) => route.from === activeHub.id || route.to === activeHub.id).map((route) => route.id)
  );

  // Re-check scroll state when hubs change or filter updates
  useEffect(() => {
    const el = directoryListRef.current;
    if (!el) return;
    el.scrollTop = 0;
    setCanScrollUp(false);
    setCanScrollDown(el.scrollHeight > el.clientHeight + 10);
  }, [visibleHubs]);

  const handleDirectoryScroll = () => {
    const el = directoryListRef.current;
    if (!el) return;
    setCanScrollUp(el.scrollTop > 10);
    setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 10);
  };

  const scrollDirectory = (direction: "up" | "down") => {
    const el = directoryListRef.current;
    if (!el) return;
    const delta = direction === "up" ? -180 : 180;
    el.scrollBy({ top: delta, behavior: "smooth" });
  };

  // Philippine map is centered to display Luzon, Visayas, and Mindanao with ample border clearance
  const projection = useMemo(
    () =>
      mode === "philippines"
        ? geoMercator().center([122.0, 11.4]).scale(1750).translate([WIDTH / 2, HEIGHT / 2])
        : geoMercator().center([113.8, 3.5]).scale(720).translate([WIDTH / 2, HEIGHT / 2]),
    [mode]
  );
  const path = useMemo(() => geoPath(projection), [projection]);
  const hubById = useMemo(() => new Map(hubs.map((hub) => [hub.id, hub])), [hubs]);

  function changeMode(nextMode: NetworkMode) {
    setMode(nextMode);
    setFilter("all");
    setActiveId(nextMode === "philippines" ? "davao-city" : "manila");
  }

  function changeFilter(nextFilter: NetworkFilter) {
    setFilter(nextFilter);
    if (mode === "philippines") {
      if (nextFilter === "luzon") setActiveId("manila");
      else if (nextFilter === "visayas") setActiveId("cebu");
      else if (nextFilter === "mindanao") setActiveId("davao-city");
      else setActiveId("davao-city");
    } else {
      if (nextFilter === "philippines") setActiveId("manila");
      else if (nextFilter === "cross-border") setActiveId("kuala-lumpur");
      else setActiveId("manila");
    }
  }

  function selectHub(hub: NetworkHub) {
    setActiveId(hub.id);
  }

  const currentFilters = mode === "philippines" ? PHILIPPINE_FILTERS : ASEAN_FILTERS;

  return (
    <section
      id="network"
      className="network-section relative flex min-h-screen min-h-dvh w-full flex-col justify-center px-4 pt-[4.5rem] pb-6 text-ui-foreground sm:px-6 sm:pb-8 lg:px-8 lg:pb-8 overflow-y-auto lg:overflow-hidden"
    >
      <div className="mx-auto my-auto flex w-full max-w-7xl flex-col justify-center">
        {/* Section Header */}
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-ui-primary/30 bg-ui-primary/10 px-3 py-1 text-xs sm:text-sm font-bold text-ui-primary">
            <Network className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden /> Demonstration network
          </div>
          <h2 className="mt-1.5 sm:mt-3 font-heading text-lg sm:text-2xl lg:text-3xl xl:text-4xl font-semibold tracking-tight">
            Connecting the Philippines today. Exploring ASEAN tomorrow.
          </h2>
          <p className="mx-auto mt-1 max-w-2xl text-xs sm:text-sm lg:text-base text-ui-muted-foreground leading-relaxed line-clamp-1 sm:line-clamp-2">
            Switch between Philippine inter-island express corridors and an illustrative ASEAN regional concept. All capacity and route data shown here is synthetic.
          </p>
        </div>

        {/* Mode Selector (Philippine Concept vs ASEAN Concept) */}
        <div className="clay-inset mx-auto mt-2.5 sm:mt-3.5 flex w-full max-w-md gap-1 rounded-xl border border-ui-border bg-ui-muted p-1" aria-label="Network concept view">
          {([
            ["philippines", `Philippine Concept (${PHILIPPINE_HUBS.length})`],
            ["asean", `ASEAN Concept (${ASEAN_HUBS.length})`],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => changeMode(value)}
              className={`min-h-9 sm:min-h-10 flex-1 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-bold transition-[background-color,color,box-shadow,transform] ${
                mode === value
                  ? "clay-action bg-blue-600 text-white hover:bg-blue-500"
                  : "clay-interactive text-ui-muted-foreground hover:bg-ui-surface hover:text-ui-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Region Filters Row — Fixed height container so layout never shifts or jumps */}
        <div className="terminal-scroll mx-auto mt-2 flex h-9 sm:h-10 max-w-2xl items-center justify-center gap-1.5 overflow-x-auto pb-1" aria-label="Region filters">
          {currentFilters.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => changeFilter(value as NetworkFilter)}
              className={`clay-control clay-interactive min-h-8 sm:min-h-9 shrink-0 rounded-lg border px-3 py-1 text-xs font-semibold ${
                filter === value
                  ? "border-ui-primary bg-ui-primary/10 text-ui-primary"
                  : "border-ui-border bg-ui-surface text-ui-muted-foreground hover:text-ui-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Map and Directory Grid — Stacked vertically on mobile, side-by-side on desktop */}
        <div className="mt-2 sm:mt-3 grid gap-3.5 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.85fr)] lg:gap-4 items-start">
          {/* Map Column */}
          <div className="network-map relative h-[16rem] xs:h-[18rem] sm:h-[22rem] lg:h-[calc(100dvh-17.5rem)] lg:min-h-[20rem] lg:max-h-[28rem] overflow-hidden rounded-2xl sm:rounded-3xl border border-map-border bg-map-water shadow-[0_28px_80px_-48px_rgba(15,83,175,0.55)]">
            {/* Top-Left Badges */}
            <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-1.5 sm:left-4 sm:top-4">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-map-border bg-map-panel/90 px-2.5 py-1 text-[0.65rem] sm:text-xs font-bold text-map-text backdrop-blur-md">
                <Route className="h-3 w-3 text-map-selected" aria-hidden /> Vector network
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-map-border bg-map-panel/90 px-2.5 py-1 text-[0.65rem] sm:text-xs font-bold text-map-muted backdrop-blur-md">
                <ShieldCheck className="h-3 w-3" aria-hidden /> Synthetic data
              </span>
            </div>

            {/* Selected Terminal Card — Positioned in Top-Right open ocean area so Mindanao is never blocked! */}
            {!mapError && (
              <div
                className="clay-surface-raised absolute top-3 right-3 sm:top-4 sm:right-4 z-10 max-w-[13.5rem] sm:max-w-xs rounded-xl sm:rounded-2xl border border-map-border bg-map-panel/95 p-2.5 sm:p-3.5 text-map-text backdrop-blur-md shadow-md"
                aria-live="polite"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[0.62rem] sm:text-xs font-bold uppercase tracking-[0.14em] text-map-selected">Selected terminal</p>
                  <span className="rounded-full border border-map-border px-1.5 py-0.5 sm:px-2 sm:py-0.5 text-[0.6rem] sm:text-[0.68rem] font-bold text-map-muted">
                    {mode === "philippines" ? "Philippines" : "ASEAN"}
                  </span>
                </div>
                <p className="mt-1 font-heading text-sm sm:text-base font-semibold text-map-text truncate">{activeHub.name}</p>
                <p className="mt-0.5 text-[0.68rem] sm:text-xs text-map-muted line-clamp-1">{activeHub.terminal}</p>
              </div>
            )}

            {mapError ? (
              <div className="flex min-h-[23rem] items-center justify-center px-8 text-center sm:min-h-[32rem]" role="status">
                <div className="max-w-md rounded-2xl border border-map-border bg-map-panel p-6 text-map-text">
                  <MapPin className="mx-auto h-8 w-8 text-map-selected" aria-hidden />
                  <p className="mt-3 font-heading text-lg font-semibold">Map unavailable</p>
                  <p className="mt-2 text-sm leading-6 text-map-muted">Use the terminal directory to explore every demonstration hub.</p>
                </div>
              </div>
            ) : (
              <svg
                viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                role="group"
                aria-labelledby="network-map-title network-map-description"
                className="absolute inset-0 h-full w-full"
                data-testid="network-map"
              >
                <title id="network-map-title">
                  {mode === "philippines" ? "Philippine concept network" : "ASEAN concept network"}
                </title>
                <desc id="network-map-description">
                  {mode === "philippines"
                    ? "Thirteen major hubs across Luzon, Visayas, and Mindanao connected by inter-island express bus corridors."
                    : "Eight illustrative hubs showing Philippine and cross-border ASEAN express bus corridors."}
                </desc>
                <g aria-hidden="true" className="route-reveal">
                  {countries.map((country, index) => {
                    const id = featureId(country.id);
                    const activeCountry = mode === "philippines" ? id === "608" : ASEAN_ISO_CODES.has(id);
                    return (
                      <path
                        key={`${id}-${index}`}
                        d={path(country) ?? undefined}
                        className={activeCountry ? "map-country map-country-active" : "map-country"}
                      />
                    );
                  })}
                  {visibleRoutes.map((route) => {
                    const from = hubById.get(route.from);
                    const to = hubById.get(route.to);
                    if (!from || !to) return null;
                    const start = projection(from.coordinates);
                    const end = projection(to.coordinates);
                    if (!start || !end) return null;
                    return (
                      <line
                        key={route.id}
                        x1={start[0]}
                        y1={start[1]}
                        x2={end[0]}
                        y2={end[1]}
                        className={`map-route ${highlightedRoutes.has(route.id) ? "map-route-active" : ""}`}
                      />
                    );
                  })}
                </g>
                {visibleHubs.map((hub) => {
                  const point = projection(hub.coordinates);
                  if (!point) return null;
                  const selected = hub.id === activeHub.id;
                  return (
                    <g
                      key={hub.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`Select ${hub.name}`}
                      aria-pressed={selected}
                      onClick={() => selectHub(hub)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          selectHub(hub);
                        }
                      }}
                      transform={`translate(${point[0]} ${point[1]})`}
                      className="map-marker cursor-pointer"
                    >
                      {selected && <circle r="20" className="map-marker-pulse" aria-hidden="true" />}
                      <circle
                        r={selected ? 8 : 5.5}
                        className={selected ? "map-marker-dot map-marker-dot-selected" : "map-marker-dot"}
                      />
                      <text y={selected ? -15 : -11} textAnchor="middle" className="map-marker-label">
                        {hub.name}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}

            {/* Bottom-Left Legend */}
            {!mapError && (
              <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 flex gap-2.5 sm:gap-3 rounded-full border border-map-border bg-map-panel/90 px-3 py-1.5 text-[0.65rem] sm:text-xs font-semibold text-map-muted backdrop-blur-md">
                <span className="flex items-center gap-1.5">
                  <CircleDot className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-map-hub" aria-hidden /> Hub
                </span>
                <span className="flex items-center gap-1.5">
                  <CircleDot className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-map-selected" aria-hidden /> Selected
                </span>
              </div>
            )}
          </div>

          {/* Terminal Directory Column — Positioned Below Map on Mobile and Stacked */}
          <aside
            aria-label="Terminal directory"
            className="min-w-0 flex flex-col w-full h-auto lg:h-[calc(100dvh-17.5rem)] lg:min-h-[20rem] lg:max-h-[28rem]"
          >
            {/* Directory Header */}
            <div className="mb-1.5 flex items-center justify-between gap-2 px-1 shrink-0">
              <div className="flex items-center gap-1.5">
                <Layers3 className="h-4 w-4 text-ui-primary" aria-hidden />
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-[0.14em] text-ui-muted-foreground">
                  Terminal directory
                </h3>
              </div>
              <span className="rounded-full border border-ui-border bg-ui-surface px-2 py-0.5 text-[0.65rem] sm:text-xs font-bold text-ui-primary">
                {visibleHubs.length} hubs
              </span>
            </div>

            {/* Wide Arrow Up Button */}
            <button
              type="button"
              aria-label="Scroll terminal directory up"
              onClick={() => scrollDirectory("up")}
              disabled={!canScrollUp}
              className="group mb-1.5 flex h-7 sm:h-8 w-full items-center justify-center rounded-xl border border-ui-border/80 dark:border-white/10 bg-ui-surface/90 dark:bg-slate-800/90 text-ui-muted-foreground hover:bg-ui-muted hover:text-ui-primary dark:hover:bg-white/10 dark:hover:text-white transition-all shadow-xs active:scale-[0.99] disabled:opacity-25 disabled:pointer-events-none shrink-0 cursor-pointer"
            >
              <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5 transition-transform group-hover:-translate-y-0.5" aria-hidden="true" />
            </button>

            {/* Terminal Cards List — Vertically Stacked on Both Mobile and Desktop */}
            <div
              ref={directoryListRef}
              onScroll={handleDirectoryScroll}
              className="terminal-scroll flex-1 flex flex-col gap-2.5 overflow-y-auto pr-1 max-h-[19rem] xs:max-h-[21rem] sm:max-h-[24rem] lg:max-h-none"
            >
              {visibleHubs.map((hub) => {
                const selected = hub.id === activeHub.id;
                const connectionCount = connectedRoutes(hub.id, routes);
                return (
                  <article
                    key={hub.id}
                    className={`clay-surface clay-interactive w-full shrink-0 rounded-2xl border bg-ui-surface ${
                      selected ? "border-ui-primary ring-2 ring-ui-primary/20" : "border-ui-border hover:border-ui-primary/55"
                    }`}
                  >
                    <button
                      type="button"
                      aria-expanded={selected}
                      onClick={() => selectHub(hub)}
                      className="w-full rounded-2xl p-3.5 sm:p-4 text-left cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <MapPin
                            className={`mt-0.5 h-5 w-5 shrink-0 ${
                              selected ? "text-ui-primary" : "text-ui-muted-foreground"
                            }`}
                            aria-hidden
                          />
                          <div className="min-w-0">
                            <p className="font-heading text-base sm:text-lg font-semibold text-ui-foreground">{hub.name}</p>
                            <p className="mt-0.5 truncate text-xs sm:text-sm text-ui-muted-foreground">
                              {hub.country} · {hub.terminal}
                            </p>
                          </div>
                        </div>
                        <span className="shrink-0 rounded-full border border-ui-warning/35 bg-ui-warning-surface px-2 py-0.5 sm:py-1 text-xs font-bold text-ui-warning">
                          {connectionCount} {connectionCount === 1 ? "link" : "links"}
                        </span>
                      </div>
                    </button>

                    {selected && (
                      <div className="mx-3.5 sm:mx-4 border-t border-ui-border pb-3.5 sm:pb-4 pt-3 sm:pt-4">
                        <p className="text-xs sm:text-sm leading-relaxed text-ui-muted-foreground">{hub.description}</p>
                        <div className="mt-3 sm:mt-4 flex items-center justify-between gap-3">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ui-primary">
                            <CircleDot className="h-3.5 w-3.5" aria-hidden />{" "}
                            {mode === "philippines" ? "Philippine Concept" : "ASEAN Concept"}
                          </span>
                          {hub.bookableOrigin && (
                            <Link
                              href={`/buy?origin=${encodeURIComponent(hub.bookableOrigin)}`}
                              className="clay-action inline-flex min-h-10 sm:min-h-11 items-center gap-2 rounded-xl bg-ui-primary px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-white hover:bg-ui-primary-hover dark:text-ui-navy"
                            >
                              Find routes <ArrowRight className="h-4 w-4" aria-hidden />
                            </Link>
                          )}
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>

            {/* Wide Arrow Down Button */}
            <button
              type="button"
              aria-label="Scroll terminal directory down"
              onClick={() => scrollDirectory("down")}
              disabled={!canScrollDown}
              className="group mt-1.5 flex h-7 sm:h-8 w-full items-center justify-center rounded-xl border border-ui-border/80 dark:border-white/10 bg-ui-surface/90 dark:bg-slate-800/90 text-ui-muted-foreground hover:bg-ui-muted hover:text-ui-primary dark:hover:bg-white/10 dark:hover:text-white transition-all shadow-xs active:scale-[0.99] disabled:opacity-25 disabled:pointer-events-none shrink-0 cursor-pointer"
            >
              <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 transition-transform group-hover:translate-y-0.5" aria-hidden="true" />
            </button>
          </aside>
        </div>
      </div>
    </section>
  );
}

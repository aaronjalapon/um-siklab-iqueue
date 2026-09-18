"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { geoMercator, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Feature, GeoJsonProperties, Geometry } from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";
import { ArrowRight, CircleDot, Layers3, MapPin, Network, Route, ShieldCheck } from "lucide-react";
import {
  ASEAN_HUBS,
  ASEAN_ROUTES,
  PILOT_HUBS,
  PILOT_ROUTES,
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

export default function CoveredCitiesSection() {
  const [mode, setMode] = useState<NetworkMode>("pilot");
  const [filter, setFilter] = useState<NetworkFilter>("all");
  const [activeId, setActiveId] = useState("davao-city");
  const [countries, setCountries] = useState<CountryFeature[]>([]);
  const [mapError, setMapError] = useState(false);

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

  const hubs = mode === "pilot" ? PILOT_HUBS : ASEAN_HUBS;
  const routes = mode === "pilot" ? PILOT_ROUTES : ASEAN_ROUTES;

  const visibleHubs = useMemo(() => {
    if (mode === "pilot" || filter === "all") return hubs;
    return hubs.filter((hub) => filter === "philippines" ? hub.region === "philippines" : hub.region === "asean");
  }, [filter, hubs, mode]);

  const visibleHubIds = useMemo(() => new Set(visibleHubs.map((hub) => hub.id)), [visibleHubs]);
  const visibleRoutes = useMemo(() => {
    if (mode === "pilot" || filter === "all") return routes;
    return routes.filter((route) => route.category === filter && visibleHubIds.has(route.from) && visibleHubIds.has(route.to));
  }, [filter, mode, routes, visibleHubIds]);

  const activeHub = hubs.find((hub) => hub.id === activeId) ?? hubs[0];
  const highlightedRoutes = new Set(
    routes.filter((route) => route.from === activeHub.id || route.to === activeHub.id).map((route) => route.id)
  );

  const projection = useMemo(
    () => mode === "pilot"
      ? geoMercator().center([124.25, 7.55]).scale(3000).translate([WIDTH / 2, HEIGHT / 2])
      : geoMercator().center([113.8, 3.5]).scale(720).translate([WIDTH / 2, HEIGHT / 2]),
    [mode]
  );
  const path = useMemo(() => geoPath(projection), [projection]);
  const hubById = useMemo(() => new Map(hubs.map((hub) => [hub.id, hub])), [hubs]);

  function changeMode(nextMode: NetworkMode) {
    setMode(nextMode);
    setFilter("all");
    setActiveId(nextMode === "pilot" ? "davao-city" : "davao");
  }

  function changeFilter(nextFilter: NetworkFilter) {
    setFilter(nextFilter);
    if (nextFilter === "all" || nextFilter === "philippines") setActiveId("davao");
    if (nextFilter === "cross-border") setActiveId("kuala-lumpur");
  }

  function selectHub(hub: NetworkHub) {
    setActiveId(hub.id);
  }

  return (
    <section id="network" className="network-section px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-[112rem]">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-ui-primary/30 bg-ui-primary/10 px-3.5 py-1.5 text-sm font-bold text-ui-primary">
            <Network className="h-4 w-4" aria-hidden /> Demonstration network
          </div>
          <h2 className="mt-5 font-heading text-3xl font-semibold tracking-tight sm:text-5xl">
            Connecting Mindanao today. Exploring ASEAN tomorrow.
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-ui-muted-foreground sm:text-lg">
            Switch between the routes supported by this prototype and an illustrative regional concept. All capacity and network data shown here is synthetic.
          </p>
        </div>

        <div className="clay-inset mx-auto mt-9 flex w-full max-w-4xl gap-1 rounded-2xl border border-ui-border bg-ui-muted p-1.5" aria-label="Network view">
          {([["pilot", "Mindanao Pilot (7)"], ["asean-concept", "ASEAN Concept (7)"]] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => changeMode(value)}
              className={`min-h-11 flex-1 rounded-xl px-3 py-2 text-sm font-bold transition-[background-color,color,box-shadow,transform] sm:text-base ${mode === value ? "clay-action bg-blue-600 text-white hover:bg-blue-500" : "clay-interactive text-ui-muted-foreground hover:bg-ui-surface hover:text-ui-foreground"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "asean-concept" && (
          <div className="terminal-scroll mx-auto mt-3 flex max-w-3xl gap-2 overflow-x-auto pb-2" aria-label="ASEAN network filter">
            {([["all", "All hubs"], ["philippines", "Philippine corridors"], ["cross-border", "Cross-border ASEAN"]] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={() => changeFilter(value)}
                className={`clay-control clay-interactive min-h-11 shrink-0 rounded-xl border px-4 py-2 text-sm font-semibold ${filter === value ? "border-ui-primary bg-ui-primary/10 text-ui-primary" : "border-ui-border bg-ui-surface text-ui-muted-foreground hover:text-ui-foreground"}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]">
          <div className="network-map relative min-h-[23rem] overflow-hidden rounded-3xl border border-map-border bg-map-water shadow-[0_28px_80px_-48px_rgba(15,83,175,0.55)] sm:min-h-[32rem] lg:min-h-[41rem]">
            <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2 sm:left-5 sm:top-5">
              <span className="inline-flex items-center gap-2 rounded-full border border-map-border bg-map-panel/90 px-3 py-1.5 text-xs font-bold text-map-text backdrop-blur-md">
                <Route className="h-3.5 w-3.5 text-map-selected" aria-hidden /> Vector network
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-map-border bg-map-panel/90 px-3 py-1.5 text-xs font-bold text-map-muted backdrop-blur-md">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Synthetic data
              </span>
            </div>

            {mapError ? (
              <div className="flex min-h-[23rem] items-center justify-center px-8 text-center sm:min-h-[32rem]" role="status">
                <div className="max-w-md rounded-2xl border border-map-border bg-map-panel p-6 text-map-text">
                  <MapPin className="mx-auto h-8 w-8 text-map-selected" aria-hidden />
                  <p className="mt-3 font-heading text-lg font-semibold">Map unavailable</p>
                  <p className="mt-2 text-sm leading-6 text-map-muted">Use the terminal directory to explore every demonstration hub.</p>
                </div>
              </div>
            ) : (
              <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="group" aria-labelledby="network-map-title network-map-description" className="absolute inset-0 h-full w-full" data-testid="network-map">
                <title id="network-map-title">{mode === "pilot" ? "Mindanao pilot network" : "ASEAN concept network"}</title>
                <desc id="network-map-description">
                  {mode === "pilot" ? "Seven demonstration terminals connected by six modeled Mindanao corridors." : "Seven illustrative hubs showing Philippine and cross-border ASEAN corridors."}
                </desc>
                <g aria-hidden="true" className="route-reveal">
                  {countries.map((country, index) => {
                    const id = featureId(country.id);
                    const activeCountry = mode === "pilot" ? id === "608" : ASEAN_ISO_CODES.has(id);
                    return <path key={`${id}-${index}`} d={path(country) ?? undefined} className={activeCountry ? "map-country map-country-active" : "map-country"} />;
                  })}
                  {visibleRoutes.map((route) => {
                    const from = hubById.get(route.from);
                    const to = hubById.get(route.to);
                    if (!from || !to) return null;
                    const start = projection(from.coordinates);
                    const end = projection(to.coordinates);
                    if (!start || !end) return null;
                    return <line key={route.id} x1={start[0]} y1={start[1]} x2={end[0]} y2={end[1]} className={`map-route ${highlightedRoutes.has(route.id) ? "map-route-active" : ""}`} />;
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
                      className="map-marker"
                    >
                      {selected && <circle r="22" className="map-marker-pulse" aria-hidden="true" />}
                      <circle r={selected ? 10 : 7} className={selected ? "map-marker-dot map-marker-dot-selected" : "map-marker-dot"} />
                      <text y={selected ? -18 : -14} textAnchor="middle" className="map-marker-label">{hub.name}</text>
                    </g>
                  );
                })}
              </svg>
            )}

            {!mapError && (
              <div className="absolute bottom-4 left-4 flex gap-3 rounded-full border border-map-border bg-map-panel/90 px-3 py-2 text-xs font-semibold text-map-muted backdrop-blur-md sm:bottom-5 sm:left-5">
                <span className="flex items-center gap-1.5"><CircleDot className="h-3.5 w-3.5 text-map-hub" aria-hidden /> Hub</span>
                <span className="flex items-center gap-1.5"><CircleDot className="h-3.5 w-3.5 text-map-selected" aria-hidden /> Selected</span>
              </div>
            )}

            {!mapError && (
              <div className="clay-surface-raised absolute bottom-5 right-5 hidden max-w-sm rounded-2xl border border-map-border bg-map-panel/95 p-4 text-map-text backdrop-blur-md md:block" aria-live="polite">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-map-selected">Selected terminal</p>
                  <span className="rounded-full border border-map-border px-2 py-1 text-[0.68rem] font-bold text-map-muted">{mode === "pilot" ? "Pilot" : "Concept"}</span>
                </div>
                <p className="mt-2 font-heading text-xl font-semibold">{activeHub.name}</p>
                <p className="mt-1 text-sm text-map-muted">{activeHub.terminal}</p>
              </div>
            )}
          </div>

          <aside aria-label="Terminal directory" className="min-w-0">
            <div className="mb-3 flex items-center justify-between gap-3 px-1">
              <div className="flex items-center gap-2">
                <Layers3 className="h-5 w-5 text-ui-primary" aria-hidden />
                <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-ui-muted-foreground">Terminal directory</h3>
              </div>
              <span className="rounded-full border border-ui-border bg-ui-surface px-2.5 py-1 text-xs font-bold text-ui-primary">{visibleHubs.length} hubs</span>
            </div>

            <div className="terminal-scroll flex gap-3 overflow-x-auto pb-3 lg:max-h-[41rem] lg:flex-col lg:overflow-y-auto lg:pr-2">
              {visibleHubs.map((hub) => {
                const selected = hub.id === activeHub.id;
                const connectionCount = connectedRoutes(hub.id, routes);
                return (
                  <article
                    key={hub.id}
                    className={`clay-surface clay-interactive min-h-28 w-[86%] shrink-0 rounded-2xl border bg-ui-surface sm:w-[56%] lg:w-full ${selected ? "border-ui-primary ring-2 ring-ui-primary/20" : "border-ui-border hover:border-ui-primary/55"}`}
                  >
                    <button type="button" aria-expanded={selected} onClick={() => selectHub(hub)} className="w-full rounded-2xl p-4 text-left">
                      <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <MapPin className={`mt-0.5 h-5 w-5 shrink-0 ${selected ? "text-ui-primary" : "text-ui-muted-foreground"}`} aria-hidden />
                        <div className="min-w-0">
                          <p className="font-heading text-lg font-semibold text-ui-foreground">{hub.name}</p>
                          <p className="mt-0.5 truncate text-sm text-ui-muted-foreground">{hub.country} · {hub.terminal}</p>
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full border border-ui-warning/35 bg-ui-warning-surface px-2 py-1 text-xs font-bold text-ui-warning">{connectionCount} {connectionCount === 1 ? "link" : "links"}</span>
                      </div>
                    </button>

                    {selected && (
                      <div className="mx-4 border-t border-ui-border pb-4 pt-4">
                        <p className="text-sm leading-6 text-ui-muted-foreground">{hub.description}</p>
                        <div className="mt-4 flex items-center justify-between gap-3">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ui-primary">
                            <CircleDot className="h-3.5 w-3.5" aria-hidden /> {mode === "pilot" ? "Synthetic pilot" : "Illustrative concept"}
                          </span>
                          {hub.bookableOrigin && (
                            <Link href={`/buy?origin=${encodeURIComponent(hub.bookableOrigin)}`} className="clay-action inline-flex min-h-11 items-center gap-2 rounded-xl bg-ui-primary px-3 py-2 text-sm font-bold text-white hover:bg-ui-primary-hover dark:text-ui-navy">
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
          </aside>
        </div>
      </div>
    </section>
  );
}

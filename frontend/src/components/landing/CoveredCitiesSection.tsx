"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  MapPin,
  Navigation,
  Activity,
  ArrowUpRight,
  ShieldCheck,
  TrendingUp,
  Radio,
  Layers,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Graticule,
  Sphere,
  Marker,
  Line,
} from "react-simple-maps";
import { BRAND } from "@/lib/brand";

interface City {
  id: string;
  name: string;
  country: string;
  region: "philippines" | "asean";
  terminal: string;
  coordinates: [number, number];
  routes: number;
  dailyPassengers: string;
  surgeStatus: "Optimal Flow" | "Moderate Surge" | "Peak Morning Surge";
  surgeColor: string;
  description: string;
}

interface RouteLine {
  id: string;
  from: string;
  to: string;
  fromCoords: [number, number];
  toCoords: [number, number];
  type: "domestic" | "cross-border";
}

const CITIES: City[] = [
  {
    id: "manila",
    name: "Manila",
    country: "Philippines",
    region: "philippines",
    terminal: "Parañaque Integrated Terminal Exchange (PITX)",
    coordinates: [120.9842, 14.5995],
    routes: 28,
    dailyPassengers: "42,000+",
    surgeStatus: "Moderate Surge",
    surgeColor: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    description: "Multimodal Luzon gateway connecting Southern Luzon, Visayas, and Mindanao trunk lines.",
  },
  {
    id: "cebu",
    name: "Cebu",
    country: "Philippines",
    region: "philippines",
    terminal: "Cebu South Bus Terminal (CSBT)",
    coordinates: [123.8854, 10.3157],
    routes: 16,
    dailyPassengers: "18,500+",
    surgeStatus: "Optimal Flow",
    surgeColor: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    description: "Central Visayas inter-island RORO & regional coach hub with smart digital queuing.",
  },
  {
    id: "davao",
    name: "Davao",
    country: "Philippines",
    region: "philippines",
    terminal: "Ecoland Overland Transport Terminal",
    coordinates: [125.6128, 7.0707],
    routes: 14,
    dailyPassengers: "15,200+",
    surgeStatus: "Optimal Flow",
    surgeColor: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    description: "Mindanao's central transport hub featuring AI-managed gate dispatch and QR boarding.",
  },
  {
    id: "kuala-lumpur",
    name: "Kuala Lumpur",
    country: "Malaysia",
    region: "asean",
    terminal: "Terminal Bersepadu Selatan (TBS)",
    coordinates: [101.6869, 3.1390],
    routes: 22,
    dailyPassengers: "36,000+",
    surgeStatus: "Moderate Surge",
    surgeColor: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    description: "High-density transit terminal connecting Peninsular Malaysia to Singapore and Thailand.",
  },
  {
    id: "singapore",
    name: "Singapore",
    country: "Singapore",
    region: "asean",
    terminal: "Woodlands Cross-Border Hub",
    coordinates: [103.8198, 1.3521],
    routes: 12,
    dailyPassengers: "28,000+",
    surgeStatus: "Peak Morning Surge",
    surgeColor: "text-rose-400 bg-rose-400/10 border-rose-400/20",
    description: "Rapid biometric-integrated bus transit corridor linking the Causeway to Johor.",
  },
  {
    id: "ho-chi-minh",
    name: "Ho Chi Minh",
    country: "Vietnam",
    region: "asean",
    terminal: "Mien Dong New Bus Station",
    coordinates: [106.6297, 10.8231],
    routes: 19,
    dailyPassengers: "31,000+",
    surgeStatus: "Optimal Flow",
    surgeColor: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    description: "Modern Southeast Asian mega-terminal serving Southern and Central Vietnam corridors.",
  },
  {
    id: "jakarta",
    name: "Jakarta",
    country: "Indonesia",
    region: "asean",
    terminal: "Kampung Rambutan Smart Terminal",
    coordinates: [106.8456, -6.2088],
    routes: 25,
    dailyPassengers: "49,000+",
    surgeStatus: "Peak Morning Surge",
    surgeColor: "text-rose-400 bg-rose-400/10 border-rose-400/20",
    description: "Greater Jakarta transit hub coordinating Trans-Java and Sumatra inter-provincial fleets.",
  },
];

const NETWORK_ROUTES: RouteLine[] = [
  // Philippine Domestic Trunk Corridors
  {
    id: "route-mnl-ceb",
    from: "manila",
    to: "cebu",
    fromCoords: [120.9842, 14.5995],
    toCoords: [123.8854, 10.3157],
    type: "domestic",
  },
  {
    id: "route-ceb-dvo",
    from: "cebu",
    to: "davao",
    fromCoords: [123.8854, 10.3157],
    toCoords: [125.6128, 7.0707],
    type: "domestic",
  },
  {
    id: "route-mnl-dvo",
    from: "manila",
    to: "davao",
    fromCoords: [120.9842, 14.5995],
    toCoords: [125.6128, 7.0707],
    type: "domestic",
  },
  // Cross-ASEAN Transit Corridors
  {
    id: "route-kl-sin",
    from: "kuala-lumpur",
    to: "singapore",
    fromCoords: [101.6869, 3.1390],
    toCoords: [103.8198, 1.3521],
    type: "cross-border",
  },
  {
    id: "route-kl-jkt",
    from: "kuala-lumpur",
    to: "jakarta",
    fromCoords: [101.6869, 3.1390],
    toCoords: [106.8456, -6.2088],
    type: "cross-border",
  },
  {
    id: "route-hcm-kl",
    from: "ho-chi-minh",
    to: "kuala-lumpur",
    fromCoords: [106.6297, 10.8231],
    toCoords: [101.6869, 3.1390],
    type: "cross-border",
  },
  {
    id: "route-sin-jkt",
    from: "singapore",
    to: "jakarta",
    fromCoords: [103.8198, 1.3521],
    toCoords: [106.8456, -6.2088],
    type: "cross-border",
  },
  {
    id: "route-hcm-sin",
    from: "ho-chi-minh",
    to: "singapore",
    fromCoords: [106.6297, 10.8231],
    toCoords: [103.8198, 1.3521],
    type: "cross-border",
  },
  // Trans-Regional Gateway Corridor (Connects PH Network to Mainland ASEAN in Full View)
  {
    id: "route-mnl-hcm",
    from: "manila",
    to: "ho-chi-minh",
    fromCoords: [120.9842, 14.5995],
    toCoords: [106.6297, 10.8231],
    type: "cross-border",
  },
];

// ISO 3166-1 numeric codes for ASEAN member states in Natural Earth TopoJSON
const ASEAN_ISO_CODES = new Set([
  "608", // Philippines
  "458", // Malaysia
  "360", // Indonesia
  "704", // Vietnam
  "764", // Thailand
  "702", // Singapore
  "096", // Brunei
  "116", // Cambodia
  "418", // Laos
  "104", // Myanmar
]);

const ASEAN_PROJECTION_CONFIG = {
  center: [113.8, 2.8] as [number, number],
  scale: 710,
};

export default function CoveredCitiesSection() {
  const [activeCity, setActiveCity] = useState<City | null>(CITIES[2]); // Davao default
  const [regionFilter, setRegionFilter] = useState<"all" | "philippines" | "asean">("all");
  const [isMapReady, setIsMapReady] = useState(false);
  const [mounted, setMounted] = useState(false);
  const directoryRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  useEffect(() => {
    setMounted(true);
    const frame = requestAnimationFrame(() => setIsMapReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const filteredCities = useMemo(() => {
    if (regionFilter === "all") return CITIES;
    return CITIES.filter((c) => c.region === regionFilter);
  }, [regionFilter]);

  const filteredCityIds = useMemo(
    () => new Set(filteredCities.map((c) => c.id)),
    [filteredCities]
  );

  const handleRegionChange = (newFilter: "all" | "philippines" | "asean") => {
    setRegionFilter(newFilter);
    if (directoryRef.current) {
      directoryRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
    if (newFilter !== "all") {
      const validCities = CITIES.filter((c) => c.region === newFilter);
      if (activeCity && !validCities.some((c) => c.id === activeCity.id)) {
        setActiveCity(validCities[0] ?? null);
      }
    }
  };

  const activeConnectedRoutes = useMemo(() => {
    if (!activeCity) return new Set<string>();
    return new Set(
      NETWORK_ROUTES.filter(
        (r) => r.from === activeCity.id || r.to === activeCity.id
      ).map((r) => r.id)
    );
  }, [activeCity]);

  const checkScroll = useCallback(() => {
    const el = directoryRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    setCanScrollUp(scrollTop > 4);
    setCanScrollDown(scrollTop + clientHeight < scrollHeight - 4);
  }, []);

  useEffect(() => {
    const el = directoryRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      ro.disconnect();
    };
  }, [checkScroll, filteredCities, activeCity]);

  const scrollDirectory = (direction: "up" | "down") => {
    const el = directoryRef.current;
    if (!el) return;
    const delta = direction === "up" ? -180 : 180;
    el.scrollBy({ top: delta, behavior: "smooth" });
  };

  return (
    <section
      id="cities"
      className="relative flex min-h-[100svh] w-full max-w-full flex-col justify-center overflow-hidden bg-slate-950 px-3.5 pt-16 pb-8 sm:px-6 sm:py-16 lg:px-8 md:pt-24 md:pb-8"
    >
      {/* Background illumination grid */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.12),rgba(255,255,255,0))]" />

      <div className="relative mx-auto w-full min-w-0 max-w-7xl">
        {/* Section Header: Clean typography aligned with all landing sections */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-20px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-2.5 sm:mb-4"
        >
          <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[10px] xs:text-xs font-bold uppercase tracking-wider text-cyan-400 mb-2 backdrop-blur-sm">
            <Radio className="h-3 w-3 sm:h-3.5 sm:w-3.5 animate-pulse" />
            Live Terminal Telemetry
          </div>
          <h2 className="text-2xl xs:text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.2] sm:leading-tight">
            Connecting{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue via-cyan-400 to-teal-300">
              ASEAN Smart Terminals
            </span>
          </h2>
          <p className="mt-1.5 text-slate-400 text-xs xs:text-sm sm:text-base max-w-xl mx-auto leading-relaxed font-normal">
            {BRAND.name} powers real-time passenger queuing, capacity forecasting, and dynamic boarding passes across major transport hubs.
          </p>

          {/* Region filter tabs: Clean inline-flex on desktop with full width, single-row on mobile */}
          <div className="mt-2.5 sm:mt-3.5 flex w-full max-w-md overflow-x-auto no-scrollbar items-center justify-start gap-1 sm:inline-flex sm:w-auto sm:max-w-none sm:overflow-visible sm:justify-center sm:gap-1.5 rounded-xl sm:rounded-2xl border border-white/10 bg-slate-900/80 p-1 sm:p-1.5 backdrop-blur-md mx-auto">
            {[
              { key: "all", label: "All Hubs (7)", fullLabel: "All Network Hubs (7)" },
              { key: "philippines", label: "PH Corridors (3)", fullLabel: "Philippine Corridors (3)" },
              { key: "asean", label: "Cross-Border (4)", fullLabel: "Cross-Border ASEAN (4)" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleRegionChange(tab.key as typeof regionFilter)}
                className={`min-h-[36px] sm:min-h-[44px] rounded-lg sm:rounded-xl px-2.5 py-1.5 sm:px-4 sm:py-2 text-[11px] xs:text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 transition-all flex items-center justify-center ${
                  regionFilter === tab.key
                    ? "bg-brand-blue text-white shadow-md shadow-brand-blue/30"
                    : "text-slate-300 hover:text-white hover:bg-white/5"
                }`}
              >
                <span className="sm:hidden">{tab.label}</span>
                <span className="hidden sm:inline">{tab.fullLabel}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Main Map & Telemetry Grid */}
        <div className="grid w-full min-w-0 max-w-full grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-6 lg:gap-8 items-start">
          {/* Map Column */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="w-full min-w-0 max-w-full lg:col-span-2 relative h-[250px] xs:h-[270px] sm:h-[360px] lg:h-[450px] overflow-hidden rounded-2xl sm:rounded-3xl border border-cyan-500/20 bg-[#050e1a] shadow-[0_20px_70px_-15px_rgba(2,132,199,0.25)]"
          >
            {/* Command-Center Ambient Glows */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_35%,rgba(14,165,233,0.18),transparent_50%),radial-gradient(circle_at_20%_80%,rgba(13,148,136,0.12),transparent_40%)]" />

            {/* Status Overlays: Compact and non-intrusive on mobile */}
            <div className="absolute left-2.5 top-2.5 sm:left-4 sm:top-4 z-10 flex flex-wrap items-center gap-1.5 sm:gap-2 pointer-events-none">
              <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-950/80 px-2.5 py-1 text-[10px] sm:text-xs font-semibold text-cyan-200 backdrop-blur-md shadow-lg">
                <Navigation className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-brand-orange" aria-hidden />
                <span>Vector Network</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] sm:text-[11px] font-bold text-emerald-400 backdrop-blur-md">
                <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Sync
              </div>
            </div>

            {/* The High-Resolution Natural Earth Vector Map */}
            {isMapReady ? (
              <ComposableMap
                projection="geoMercator"
                projectionConfig={ASEAN_PROJECTION_CONFIG}
                width={800}
                height={450}
                style={{ width: "100%", height: "100%", maxWidth: "100%" }}
                className="relative z-[1] h-full w-full max-w-full"
              >
                <defs>
                  {/* Glowing SVG filter for terminal beacons */}
                  <filter id="terminal-glow" x="-100%" y="-100%" width="300%" height="300%">
                    <feGaussianBlur stdDeviation="3.5" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter id="route-glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Oceanic base and subtle graticule */}
                <Sphere fill="#040b15" stroke="#0284c7" strokeWidth={0.3} strokeOpacity={0.15} />
                <Graticule stroke="#0284c7" strokeWidth={0.35} strokeOpacity={0.08} />

                {/* Real Natural Earth 50m TopoJSON Country Geometries */}
                <Geographies geography="/maps/countries-50m.json">
                  {({ geographies }: { geographies: Array<{ rsmKey: string; id?: string | number; [key: string]: unknown }> }) =>
                    geographies.map((geo) => {
                      const geoId = String(geo.id ?? "");
                      const isAsean = ASEAN_ISO_CODES.has(geoId);
                      const isPhilippines = geoId === "608";
                      const isSelectedCountry =
                        activeCity &&
                        ((activeCity.country === "Philippines" && isPhilippines) ||
                          (activeCity.country === "Malaysia" && geoId === "458") ||
                          (activeCity.country === "Indonesia" && geoId === "360") ||
                          (activeCity.country === "Vietnam" && geoId === "704") ||
                          (activeCity.country === "Singapore" && geoId === "702"));

                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill={
                            isSelectedCountry
                              ? "#16445c"
                              : isPhilippines
                              ? "#103247"
                              : isAsean
                              ? "#0b2538"
                              : "#06121f"
                          }
                          stroke={
                            isSelectedCountry
                              ? "#38bdf8"
                              : isPhilippines
                              ? "#0284c7"
                              : isAsean
                              ? "#0369a1"
                              : "#1e293b"
                          }
                          strokeWidth={
                            isSelectedCountry
                              ? 1.0
                              : isPhilippines
                              ? 0.75
                              : isAsean
                              ? 0.55
                              : 0.3
                          }
                          style={{
                            default: { outline: "none", transition: "all 0.3s ease" },
                            hover: {
                              fill: isAsean ? "#1a4e6b" : "#0f2338",
                              stroke: isAsean ? "#67e8f9" : "#334155",
                              strokeWidth: 0.9,
                              outline: "none",
                              cursor: isAsean ? "pointer" : "default",
                            },
                            pressed: { outline: "none" },
                          }}
                        />
                      );
                    })
                  }
                </Geographies>

                {/* Animated Telemetry Route Lines (Great Circle Geodesic Arcs) */}
                {NETWORK_ROUTES.map((route) => {
                  const isConnectedToActive = activeConnectedRoutes.has(route.id);
                  const isRouteVisible =
                    regionFilter === "all"
                      ? true
                      : filteredCityIds.has(route.from) && filteredCityIds.has(route.to);

                  if (!isRouteVisible) return null;

                  return (
                    <g key={route.id}>
                      {/* Base Static Guide Path */}
                      <Line
                        from={route.fromCoords}
                        to={route.toCoords}
                        stroke={
                          isConnectedToActive
                            ? "rgba(56, 189, 248, 0.45)"
                            : "rgba(14, 165, 233, 0.15)"
                        }
                        strokeWidth={isConnectedToActive ? 2 : 1.2}
                      />
                      {/* Traveling Laser Pulse Telemetry Overlay */}
                      <Line
                        from={route.fromCoords}
                        to={route.toCoords}
                        stroke={isConnectedToActive ? "#38bdf8" : "#0284c7"}
                        strokeWidth={isConnectedToActive ? 2.6 : 1.6}
                        strokeDasharray="6 26"
                        className="animate-route-flow"
                        filter="url(#route-glow)"
                      />
                    </g>
                  );
                })}

                {/* Terminal Markers & Radar Beacons */}
                {filteredCities.map((city) => {
                  const isSelected = activeCity?.id === city.id;

                  return (
                    <Marker
                      key={city.id}
                      coordinates={city.coordinates}
                      onClick={() =>
                        setActiveCity((prev) => (prev?.id === city.id ? null : city))
                      }
                      className="cursor-pointer group"
                    >
                      {/* Multi-Ring Radar Wave on Active City */}
                      {isSelected && (
                        <>
                          <circle
                            r={26}
                            fill="none"
                            stroke="#38bdf8"
                            strokeWidth={1.5}
                            className="animate-radar-ring"
                          />
                          <circle
                            r={18}
                            fill="rgba(56, 189, 248, 0.25)"
                            className="animate-pulse"
                          />
                        </>
                      )}

                      {/* Ambient hover glow ring */}
                      <circle
                        r={isSelected ? 10 : 8}
                        fill={isSelected ? "rgba(56, 189, 248, 0.4)" : "rgba(249, 115, 22, 0.2)"}
                        className="transition-all duration-300 group-hover:scale-125"
                      />

                      {/* Solid Terminal Core Pin */}
                      <circle
                        r={isSelected ? 6 : 4.5}
                        fill={isSelected ? "#38bdf8" : "#f97316"}
                        stroke="#ffffff"
                        strokeWidth={isSelected ? 2 : 1.4}
                        filter="url(#terminal-glow)"
                        className="transition-transform group-hover:scale-110"
                      />

                      {/* City Name Label with Deep Contrast Halo */}
                      <text
                        textAnchor="middle"
                        y={isSelected ? -20 : -14}
                        style={{
                          fontSize: isSelected ? "11px" : "9px",
                          fill: isSelected ? "#ffffff" : "#bae6fd",
                          fontWeight: isSelected ? 800 : 700,
                          pointerEvents: "none",
                          paintOrder: "stroke",
                          stroke: "#030a14",
                          strokeWidth: 3.5,
                          strokeLinecap: "round",
                          strokeLinejoin: "round",
                        }}
                      >
                        {city.name}
                      </text>
                    </Marker>
                  );
                })}
              </ComposableMap>
            ) : (
              <div className="relative z-[1] h-full w-full flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
              </div>
            )}

            {/* Bottom Left Legend: Compact on mobile */}
            <div className="absolute bottom-2 left-2 sm:bottom-3.5 sm:left-3.5 z-10 flex items-center gap-2 sm:gap-2.5 rounded-lg sm:rounded-xl border border-white/10 bg-slate-950/85 px-2 py-1 sm:px-3 sm:py-1.5 text-[9px] sm:text-[11px] text-slate-300 backdrop-blur-md shadow-xl pointer-events-none">
              <span className="flex items-center gap-1 font-medium">
                <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-brand-orange shadow-[0_0_8px_#f97316]" />
                Hub
              </span>
              <span className="flex items-center gap-1 font-medium">
                <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#38bdf8]" />
                Selected
              </span>
              <span className="hidden xs:flex items-center gap-1 font-medium border-l border-white/10 pl-1.5 text-slate-400">
                <span className="inline-block h-0.5 w-2.5 sm:w-3.5 bg-cyan-400" />
                Live Route
              </span>
            </div>

            {/* Bottom Right Selected Terminal Quick Summary Card */}
            {activeCity && (
              <div className="absolute bottom-3.5 right-3.5 z-10 hidden w-72 max-w-[19rem] rounded-2xl border border-cyan-400/30 bg-slate-950/90 p-3.5 backdrop-blur-xl shadow-2xl md:block">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                    <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 truncate">
                      Active Telemetry
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center justify-center shrink-0 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${activeCity.surgeColor}`}
                  >
                    {activeCity.surgeStatus}
                  </span>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <p className="text-lg font-black text-white">{activeCity.name}</p>
                  <span className="text-[11px] font-semibold text-slate-400">{activeCity.country}</span>
                </div>
                <p className="text-xs text-slate-300 font-medium line-clamp-1 mt-0.5">
                  {activeCity.terminal}
                </p>
                <div className="mt-2.5 flex items-center justify-between border-t border-white/10 pt-2 text-xs">
                  <span className="text-slate-400 font-medium">Daily Flow</span>
                  <span className="font-bold text-cyan-300">{activeCity.dailyPassengers}</span>
                </div>
              </div>
            )}
          </motion.div>

          {/* Right Column: Terminal Directory & Telemetry Inspector */}
          <div className="flex flex-col w-full min-w-0 max-w-full lg:h-[450px]">
            <div className="flex w-full min-w-0 shrink-0 items-center justify-between px-0.5 sm:px-1 mb-2">
              <div className="flex items-center gap-1.5 xs:gap-2 min-w-0">
                <span className="text-[11px] xs:text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 sm:gap-1.5 truncate">
                  <Layers className="h-3.5 w-3.5 text-brand-blue shrink-0" />
                  <span className="truncate">Terminal Directory</span>
                </span>
                <span className="text-[10px] font-semibold text-cyan-400/90 bg-cyan-950/60 border border-cyan-500/20 px-1.5 py-0.5 rounded-full shrink-0">
                  {filteredCities.length} Hubs
                </span>
              </div>

              {/* Up / Down Navigation Controls: Touch-friendly */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  suppressHydrationWarning
                  onClick={() => scrollDirectory("up")}
                  disabled={mounted ? !canScrollUp : true}
                  title="Scroll terminals up"
                  aria-label="Scroll terminals up"
                  className="flex h-7 w-7 min-w-[28px] min-h-[28px] sm:h-9 sm:w-9 sm:min-w-[36px] sm:min-h-[36px] items-center justify-center rounded-lg sm:rounded-xl border border-white/10 bg-slate-900/90 text-slate-200 transition-all hover:border-cyan-400/40 hover:bg-slate-800 hover:text-white active:scale-95 disabled:pointer-events-none disabled:opacity-25"
                >
                  <ChevronUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
                <button
                  type="button"
                  suppressHydrationWarning
                  onClick={() => scrollDirectory("down")}
                  disabled={mounted ? !canScrollDown : false}
                  title="Scroll terminals down"
                  aria-label="Scroll terminals down"
                  className="flex h-7 w-7 min-w-[28px] min-h-[28px] sm:h-9 sm:w-9 sm:min-w-[36px] sm:min-h-[36px] items-center justify-center rounded-lg sm:rounded-xl border border-white/10 bg-slate-900/90 text-slate-200 transition-all hover:border-cyan-400/40 hover:bg-slate-800 hover:text-white active:scale-95 disabled:pointer-events-none disabled:opacity-25"
                >
                  <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
              </div>
            </div>

            <div
              ref={directoryRef}
              className="terminal-scroll w-full min-w-0 max-w-full flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-1 sm:pr-1.5 space-y-2 sm:space-y-2.5 scroll-smooth max-h-[320px] sm:max-h-[410px] lg:max-h-none"
            >
              {filteredCities.map((city, i) => {
                const isSelected = activeCity?.id === city.id;

                return (
                  <motion.button
                    key={city.id}
                    type="button"
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: i * 0.05 }}
                    onClick={() =>
                      setActiveCity((prev) => (prev?.id === city.id ? null : city))
                    }
                    className={`w-full min-w-0 max-w-full text-left p-2.5 xs:p-3 sm:p-5 rounded-xl sm:rounded-2xl border transition-all duration-200 ${
                      isSelected
                        ? "bg-slate-900 border-cyan-400/50 shadow-xl shadow-cyan-950/50 ring-1 ring-cyan-400/30"
                        : "bg-slate-900/60 border-white/10 hover:bg-slate-900/90 hover:border-white/20"
                    }`}
                  >
                    <div className="flex w-full min-w-0 justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <MapPin
                            className={`h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 ${
                              isSelected ? "text-cyan-400" : "text-slate-400"
                            }`}
                          />
                          <p className="text-white font-bold text-sm xs:text-base sm:text-lg tracking-tight truncate">
                            {city.name}
                          </p>
                        </div>
                        <p className="text-slate-300 text-[11px] xs:text-xs sm:text-sm mt-0.5 truncate pl-5 xs:pl-6 font-normal">
                          {city.country} · <span className="text-slate-200">{city.terminal}</span>
                        </p>
                      </div>
                      <span className="shrink-0 whitespace-nowrap rounded-full border border-brand-orange/30 bg-brand-orange/15 px-2 py-0.5 sm:px-3 sm:py-1 text-[10px] xs:text-xs font-bold text-brand-orange">
                        {city.routes} routes
                      </span>
                    </div>

                    {/* Expanded Telemetry Details for Selected Hub */}
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden mt-2.5 pt-2.5 sm:mt-3 sm:pt-3 border-t border-white/10 w-full min-w-0"
                        >
                          <p className="text-slate-200 text-[11px] xs:text-xs sm:text-sm leading-relaxed mb-2.5 sm:mb-3.5 font-normal">
                            {city.description}
                          </p>

                          <div className="grid grid-cols-2 gap-1.5 sm:gap-2 text-xs mb-2.5 sm:mb-3.5 w-full min-w-0">
                            <div className="rounded-lg sm:rounded-xl bg-slate-950/60 border border-white/5 p-2 sm:p-2.5 min-w-0">
                              <span className="text-slate-400 text-[9px] xs:text-[10px] sm:text-[11px] block font-semibold uppercase truncate">
                                Demand Status
                              </span>
                              <span className="font-bold text-cyan-300 flex items-center gap-1 mt-0.5 text-[10px] xs:text-xs sm:text-sm truncate">
                                <Activity className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                                <span className="truncate">{city.surgeStatus}</span>
                              </span>
                            </div>
                            <div className="rounded-lg sm:rounded-xl bg-slate-950/60 border border-white/5 p-2 sm:p-2.5 min-w-0">
                              <span className="text-slate-400 text-[9px] xs:text-[10px] sm:text-[11px] block font-semibold uppercase truncate">
                                Daily Volume
                              </span>
                              <span className="font-bold text-white flex items-center gap-1 mt-0.5 text-[10px] xs:text-xs sm:text-sm truncate">
                                <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald-400 shrink-0" />
                                <span className="truncate">{city.dailyPassengers}</span>
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 w-full min-w-0">
                            <span className="text-[11px] xs:text-xs text-slate-300 flex items-center gap-1.5 font-medium">
                              <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-400 shrink-0" />
                              Smart Queue Active
                            </span>
                            <Link
                              href={`/buy?from=${city.id}`}
                              className="min-h-[34px] xs:min-h-[38px] sm:min-h-[44px] inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-cyan-300 hover:text-white transition-all group/link px-2.5 py-1 xs:px-3 xs:py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-cyan-950/60 border border-cyan-500/30 hover:bg-cyan-900/50 shrink-0"
                            >
                              Book departures
                              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
                            </Link>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

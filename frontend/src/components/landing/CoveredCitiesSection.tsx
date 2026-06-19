"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Navigation, type LucideIcon } from "lucide-react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Graticule,
  Marker,
  Sphere,
} from "react-simple-maps";

interface City {
  id: string;
  name: string;
  country: string;
  icon: LucideIcon;
  coordinates: [number, number];
  routes: number;
  description: string;
}

const CITIES: City[] = [
  {
    id: "manila",
    name: "Manila",
    country: "Philippines",
    icon: MapPin,
    coordinates: [120.9842, 14.5995],
    routes: 24,
    description: "LTFRB North & South terminals",
  },
  {
    id: "cebu",
    name: "Cebu",
    country: "Philippines",
    icon: MapPin,
    coordinates: [123.8854, 10.3157],
    routes: 12,
    description: "South Bus Terminal",
  },
  {
    id: "davao",
    name: "Davao",
    country: "Philippines",
    icon: MapPin,
    coordinates: [125.6128, 7.0707],
    routes: 9,
    description: "Ecoland Bus Terminal",
  },
  {
    id: "kuala-lumpur",
    name: "Kuala Lumpur",
    country: "Malaysia",
    icon: MapPin,
    coordinates: [101.6869, 3.1390],
    routes: 18,
    description: "TBS & Puduraya Terminals",
  },
  {
    id: "ho-chi-minh",
    name: "Ho Chi Minh",
    country: "Vietnam",
    icon: MapPin,
    coordinates: [106.6297, 10.8231],
    routes: 15,
    description: "Mien Dong Bus Station",
  },
  {
    id: "jakarta",
    name: "Jakarta",
    country: "Indonesia",
    icon: MapPin,
    coordinates: [106.8456, -6.2088],
    routes: 21,
    description: "Kampung Rambutan Terminal",
  },
];

const ASEAN_GEOJSON = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "Mainland ASEAN" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [92.3, 21.5],
            [96.2, 28.2],
            [103.5, 25.1],
            [108.2, 21.7],
            [110.1, 16.2],
            [107.4, 10.7],
            [104.8, 8.5],
            [103.4, 2.1],
            [101.0, 5.9],
            [98.8, 8.2],
            [96.5, 13.8],
            [93.7, 16.2],
            [92.3, 21.5],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { name: "Malay Peninsula" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [99.8, 6.6],
            [103.9, 4.8],
            [104.1, 1.2],
            [102.5, -0.8],
            [100.7, 1.1],
            [99.8, 6.6],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { name: "Philippines" },
      geometry: {
        type: "MultiPolygon",
        coordinates: [
          [
            [
              [119.2, 18.6],
              [122.3, 16.6],
              [121.9, 13.4],
              [119.0, 13.2],
              [117.9, 16.0],
              [119.2, 18.6],
            ],
          ],
          [
            [
              [121.8, 11.3],
              [125.0, 11.0],
              [124.5, 9.2],
              [121.9, 9.0],
              [121.8, 11.3],
            ],
          ],
          [
            [
              [123.4, 8.4],
              [126.8, 7.4],
              [126.0, 5.4],
              [122.7, 6.1],
              [123.4, 8.4],
            ],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { name: "Borneo" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [108.3, 4.6],
            [114.4, 7.3],
            [119.2, 2.5],
            [116.6, -4.1],
            [109.4, -3.0],
            [108.3, 4.6],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { name: "Sumatra" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [95.1, 5.7],
            [101.7, 2.8],
            [104.6, -3.5],
            [102.1, -6.0],
            [97.4, -3.2],
            [94.6, 1.5],
            [95.1, 5.7],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { name: "Java" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [105.1, -6.0],
            [114.7, -7.4],
            [113.7, -8.9],
            [106.0, -8.1],
            [105.1, -6.0],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { name: "Sulawesi" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [119.2, 1.9],
            [123.8, 0.8],
            [124.6, -3.1],
            [121.0, -5.2],
            [119.5, -1.8],
            [119.2, 1.9],
          ],
        ],
      },
    },
  ],
};

const COUNTRY_LABELS = [
  { name: "Philippines", coordinates: [122.6, 12.7] },
  { name: "Vietnam", coordinates: [108.2, 15.7] },
  { name: "Malaysia", coordinates: [102.3, 3.1] },
  { name: "Indonesia", coordinates: [111.1, -4.6] },
  { name: "Thailand", coordinates: [100.8, 14.6] },
];

const ASEAN_PROJECTION_CONFIG = {
  center: [113, 4],
  scale: 760,
};

export default function CoveredCitiesSection() {
  const [activeCity, setActiveCity] = useState<City | null>(CITIES[2]);
  const [isMapReady, setIsMapReady] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsMapReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <section id="cities" className="py-24 lg:py-32 bg-slate-950 relative">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="inline-block text-brand-blue text-xs font-bold uppercase tracking-[0.2em] mb-3">
            Coverage
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight">
            Connecting{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-cyan-400">
              ASEAN Cities
            </span>
          </h2>
          <p className="mt-4 text-slate-400 text-lg max-w-xl mx-auto">
            IQueue is expanding across Southeast Asia — from Manila to Jakarta, Kuala Lumpur to Ho Chi Minh City.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8 items-start">
          {/* Map */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="lg:col-span-2 relative overflow-hidden rounded-2xl border border-cyan-300/15 bg-[#07111f] shadow-2xl shadow-cyan-950/40"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(26,115,232,0.22),transparent_30%),linear-gradient(135deg,rgba(8,47,73,0.7),rgba(15,23,42,0.1)_48%,rgba(20,83,45,0.18))]" />
            <div className="absolute left-5 top-5 z-10 flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/55 px-3 py-2 text-xs font-semibold text-cyan-100 backdrop-blur">
              <Navigation className="h-3.5 w-3.5 text-brand-orange" aria-hidden />
              ASEAN terminal network
            </div>

            {isMapReady ? (
              <ComposableMap
                projection="geoMercator"
                projectionConfig={ASEAN_PROJECTION_CONFIG}
                className="relative z-[1] h-[360px] w-full sm:h-[430px] md:h-[520px]"
              >
                <defs>
                  <filter id="city-pin-glow" x="-60%" y="-60%" width="220%" height="220%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <Sphere fill="#0b1b2f" stroke="#38bdf8" strokeWidth={0.35} strokeOpacity={0.25} />
                <Graticule stroke="#67e8f9" strokeWidth={0.35} strokeOpacity={0.12} />

                <Geographies geography={ASEAN_GEOJSON}>
                  {({ geographies }: { geographies: unknown[] }) =>
                    (geographies as Array<{ rsmKey: string; properties: { name: string } }>).map((geo) => (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill="#194a55"
                        stroke="#8ee7ef"
                        strokeWidth={0.75}
                        style={{
                          default: { outline: "none" },
                          hover: {
                            fill: "#236b72",
                            outline: "none",
                          },
                          pressed: { outline: "none" },
                        }}
                      />
                    ))
                  }
                </Geographies>

                {COUNTRY_LABELS.map((label) => (
                  <Marker key={label.name} coordinates={label.coordinates as [number, number]}>
                    <text
                      textAnchor="middle"
                      style={{
                        fontSize: "7px",
                        fill: "#7dd3fc",
                        fontWeight: 700,
                        opacity: 0.5,
                        pointerEvents: "none",
                        textTransform: "uppercase",
                      }}
                    >
                      {label.name}
                    </text>
                  </Marker>
                ))}

                {CITIES.map((city) => (
                  <Marker
                    key={city.id}
                    coordinates={city.coordinates}
                    onClick={() =>
                      setActiveCity((prev) =>
                        prev?.id === city.id ? null : city
                      )
                    }
                  >
                    <circle
                      r={activeCity?.id === city.id ? 18 : 12}
                      fill={
                        activeCity?.id === city.id
                          ? "rgba(56,189,248,0.3)"
                          : "rgba(249,115,22,0.16)"
                      }
                      className={activeCity?.id === city.id ? "animate-pulse" : ""}
                    />
                    <circle
                      r={activeCity?.id === city.id ? 7 : 5}
                      fill={
                        activeCity?.id === city.id ? "#38bdf8" : "#F97316"
                      }
                      stroke="white"
                      strokeWidth={1.4}
                      filter="url(#city-pin-glow)"
                      className="cursor-pointer"
                    />
                    <text
                      textAnchor="middle"
                      y={activeCity?.id === city.id ? -24 : -17}
                      style={{
                        fontSize: activeCity?.id === city.id ? "10px" : "8px",
                        fill: activeCity?.id === city.id ? "#ffffff" : "#bae6fd",
                        fontWeight: 700,
                        fontFamily: "inherit",
                        pointerEvents: "none",
                        paintOrder: "stroke",
                        stroke: "#07111f",
                        strokeWidth: 3,
                        strokeLinecap: "round",
                        strokeLinejoin: "round",
                      }}
                    >
                      {city.name}
                    </text>
                  </Marker>
                ))}
              </ComposableMap>
            ) : (
              <div className="relative z-[1] h-[360px] w-full sm:h-[430px] md:h-[520px]" />
            )}

            {/* Map legend */}
            <div className="absolute bottom-4 left-4 z-10 flex flex-wrap items-center gap-4 rounded-full border border-white/10 bg-slate-950/55 px-3 py-2 text-xs text-slate-300 backdrop-blur">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-brand-orange" />
                City terminal
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-cyan-400" />
                Selected
              </span>
            </div>

            {activeCity && (
              <div className="absolute bottom-4 right-4 z-10 hidden max-w-[15rem] rounded-xl border border-cyan-300/20 bg-slate-950/70 p-4 backdrop-blur md:block">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-200">
                  Selected hub
                </p>
                <p className="mt-1 text-lg font-extrabold text-white">
                  {activeCity.name}
                </p>
                <p className="text-sm text-slate-300">{activeCity.description}</p>
              </div>
            )}
          </motion.div>

          {/* City list / detail panel */}
          <div className="flex flex-col gap-3">
            {CITIES.map((city, i) => {
              const Icon = city.icon;
              return (
                <motion.button
                  key={city.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.07 }}
                  onClick={() =>
                    setActiveCity((prev) =>
                      prev?.id === city.id ? null : city
                    )
                  }
                  className={`text-left p-4 rounded-xl border transition-all ${
                    activeCity?.id === city.id
                      ? "bg-brand-blue/15 border-brand-blue/40 shadow-lg shadow-brand-blue/10"
                      : "bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="flex items-center gap-1.5 text-white font-bold text-sm">
                        <Icon className="h-3.5 w-3.5 text-brand-blue" aria-hidden />
                        {city.name}
                      </p>
                      <p className="text-slate-400 text-xs mt-0.5">{city.country}</p>
                    </div>
                    <span className="bg-brand-orange/15 border border-brand-orange/25 text-brand-orange text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {city.routes} routes
                    </span>
                  </div>

                  <AnimatePresence>
                    {activeCity?.id === city.id && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-slate-400 text-xs mt-2 overflow-hidden"
                      >
                        {city.description}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

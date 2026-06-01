"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFlag } from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from "react-simple-maps";

const GEO_URL =
  "https://raw.githubusercontent.com/deldersveld/topojson/master/world-countries.json";

interface City {
  id: string;
  name: string;
  country: string;
  icon: IconDefinition;
  coordinates: [number, number];
  routes: number;
  description: string;
}

const CITIES: City[] = [
  {
    id: "manila",
    name: "Manila",
    country: "Philippines",
    icon: faFlag,
    coordinates: [120.9842, 14.5995],
    routes: 24,
    description: "LTFRB North & South terminals",
  },
  {
    id: "cebu",
    name: "Cebu",
    country: "Philippines",
    icon: faFlag,
    coordinates: [123.8854, 10.3157],
    routes: 12,
    description: "South Bus Terminal",
  },
  {
    id: "davao",
    name: "Davao",
    country: "Philippines",
    icon: faFlag,
    coordinates: [125.6128, 7.0707],
    routes: 9,
    description: "Ecoland Bus Terminal",
  },
  {
    id: "kuala-lumpur",
    name: "Kuala Lumpur",
    country: "Malaysia",
    icon: faFlag,
    coordinates: [101.6869, 3.1390],
    routes: 18,
    description: "TBS & Puduraya Terminals",
  },
  {
    id: "ho-chi-minh",
    name: "Ho Chi Minh",
    country: "Vietnam",
    icon: faFlag,
    coordinates: [106.6297, 10.8231],
    routes: 15,
    description: "Mien Dong Bus Station",
  },
  {
    id: "jakarta",
    name: "Jakarta",
    country: "Indonesia",
    icon: faFlag,
    coordinates: [106.8456, -6.2088],
    routes: 21,
    description: "Kampung Rambutan Terminal",
  },
];

// ASEAN bounding box
const ASEAN_PROJECTION_CONFIG = {
  rotate: [-115, -5, 0],
  scale: 600,
};

export default function CoveredCitiesSection() {
  const [activeCity, setActiveCity] = useState<City | null>(null);

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
            className="lg:col-span-2 relative rounded-2xl overflow-hidden border border-white/10 bg-slate-900/60 backdrop-blur-xl"
          >
            <ComposableMap
              projection="geoMercator"
              projectionConfig={ASEAN_PROJECTION_CONFIG}
              className="w-full h-[380px] md:h-[460px]"
            >
              <Geographies geography={GEO_URL}>
                {({ geographies }: { geographies: unknown[] }) =>
                  (geographies as Array<{ rsmKey: string; properties: { name: string } }>).map((geo) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill="#1e293b"
                      stroke="#334155"
                      strokeWidth={0.5}
                      style={{
                        default: { outline: "none" },
                        hover: { fill: "#1e3a5f", outline: "none" },
                        pressed: { outline: "none" },
                      }}
                    />
                  ))
                }
              </Geographies>

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
                  {/* Outer pulsing ring */}
                  <circle
                    r={14}
                    fill={
                      activeCity?.id === city.id
                        ? "rgba(26,115,232,0.25)"
                        : "rgba(249,115,22,0.15)"
                    }
                    className="animate-ping"
                    style={{ animationDuration: "2s" }}
                  />
                  {/* Inner dot */}
                  <circle
                    r={6}
                    fill={
                      activeCity?.id === city.id ? "#1A73E8" : "#F97316"
                    }
                    stroke="white"
                    strokeWidth={1.5}
                    className="cursor-pointer hover:r-8 transition-all"
                  />
                  {/* City label */}
                  <text
                    textAnchor="middle"
                    y={-14}
                    style={{
                      fontSize: "9px",
                      fill: "#cbd5e1",
                      fontWeight: 600,
                      fontFamily: "inherit",
                      pointerEvents: "none",
                    }}
                  >
                    {city.name}
                  </text>
                </Marker>
              ))}
            </ComposableMap>

            {/* Map legend */}
            <div className="absolute bottom-4 left-4 flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-orange inline-block" />
                Active City
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-blue inline-block" />
                Selected
              </span>
            </div>
          </motion.div>

          {/* City list / detail panel */}
          <div className="flex flex-col gap-3">
            {CITIES.map((city, i) => (
              <motion.button
                key={city.id}
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
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
                    <p className="text-white font-bold text-sm">
                      <FontAwesomeIcon icon={city.icon} className="text-brand-blue mr-1" /> {city.name}
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
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

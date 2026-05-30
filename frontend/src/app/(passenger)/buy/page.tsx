"use client";

import { useState } from "react";
import { ArrowLeft, ChevronDown, Filter, MapPin } from "lucide-react";
import { searchBuses } from "@/lib/api";
import type { Bus } from "@/lib/types";
import Link from "next/link";

export default function BuyPage() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Mock search for UI demonstration
  const handleSearch = () => {
    setHasSearched(true);
    setBuses([
      {
        id: "1",
        tenant_id: "tenant-1",
        route_id: "route-1",
        plate_number: "BUS-01",
        capacity: 40,
        available_seats: 12,
        origin: "Monument National",
        destination: "Stasiun Gambir",
        surge_probability: 0.2,
      },
      {
        id: "2",
        tenant_id: "tenant-1",
        route_id: "route-1",
        plate_number: "BUS-02",
        capacity: 40,
        available_seats: 0,
        origin: "Monument National",
        destination: "Stasiun Gambir",
        surge_probability: 0.8,
      }
    ]);
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen pb-24 animate-in fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 px-4 md:px-8 pt-6 pb-6 md:pb-8 rounded-b-3xl md:rounded-b-[40px] shadow-sm border-b border-slate-100 dark:border-slate-800 sticky top-0 z-20">
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <Link href="/" className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-900 dark:text-white" />
          </Link>
          <h1 className="font-bold text-lg md:text-2xl text-slate-900 dark:text-white">Where do you want to go?</h1>
          <div className="w-9" /> {/* Spacer */}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
          <div className="relative flex items-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 md:p-4 hover:border-brand-blue/50 transition-colors">
            <div className="w-4 h-4 rounded-full border-2 border-green-500 mr-3 shrink-0" />
            <input type="text" placeholder="Your current location" defaultValue="Jakarta" className="bg-transparent border-none outline-none w-full text-sm md:text-base font-medium text-slate-900 dark:text-white" />
          </div>
          <div className="relative flex items-center bg-slate-50 dark:bg-slate-800 border border-brand-blue rounded-xl p-3 md:p-4 shadow-[0_0_0_4px_rgba(26,115,232,0.1)] transition-all">
            <div className="w-4 h-4 rounded-full border-2 border-brand-orange mr-3 shrink-0" />
            <input type="text" placeholder="Search for a destination..." className="bg-transparent border-none outline-none w-full text-sm md:text-base font-medium text-slate-900 dark:text-white" />
          </div>
        </div>

        <div className="max-w-3xl mx-auto flex justify-end">
          <button 
            onClick={handleSearch}
            className="w-full md:w-auto md:min-w-[200px] mt-6 bg-brand-blue text-white font-bold py-3.5 md:py-4 px-8 rounded-xl shadow-md shadow-brand-blue/20 hover:bg-blue-700 active:scale-[0.98] transition-all"
          >
            Search Ticket
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="p-4 md:p-8 space-y-4 md:space-y-6 max-w-5xl mx-auto">
        {hasSearched && (
          <div className="flex justify-between items-center mb-4 md:mb-6">
            <span className="text-sm md:text-base font-bold text-slate-900 dark:text-white">2 Tickets Found</span>
            <button className="flex items-center gap-2 text-sm md:text-base font-semibold text-brand-blue hover:text-blue-800 transition-colors px-3 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20">
              <Filter className="w-4 h-4 md:w-5 md:h-5" /> Filter
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {buses.map((bus) => (
            <div key={bus.id} className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md border border-slate-100 dark:border-slate-700 transition-shadow">
              <div className="flex justify-between items-start mb-6">
                <span className="px-2 py-1 bg-brand-orange text-white text-[10px] md:text-xs font-bold rounded">Fastest</span>
                <span className="font-bold text-brand-orange text-sm md:text-base">IDR 10.000</span>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center shrink-0">
                  <div className="w-3 h-3 md:w-4 md:h-4 rounded-full border-2 border-green-500" />
                  <div className="w-0.5 h-8 md:h-10 bg-slate-200 dark:bg-slate-700" />
                  <div className="w-3 h-3 md:w-4 md:h-4 rounded-full border-2 border-brand-orange" />
                </div>
                <div className="flex-1 space-y-5 md:space-y-7">
                  <div>
                    <p className="text-xs md:text-sm text-slate-500">Depart</p>
                    <p className="font-bold text-sm md:text-base text-slate-900 dark:text-white">{bus.origin}</p>
                  </div>
                  <div>
                    <p className="text-xs md:text-sm text-slate-500">Arrival in 14:00 PM</p>
                    <p className="font-bold text-sm md:text-base text-slate-900 dark:text-white">{bus.destination}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-brand-blue">
                    <MapPin className="w-4 h-4 md:w-5 md:h-5" />
                  </div>
                  <span className="text-sm md:text-base font-semibold text-slate-900 dark:text-white">{bus.plate_number}</span>
                </div>
                <button disabled={bus.available_seats === 0} className="px-5 py-2.5 bg-brand-blue hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm md:text-base font-bold rounded-lg shadow-sm transition-colors">
                  {bus.available_seats > 0 ? "Book" : "Full"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

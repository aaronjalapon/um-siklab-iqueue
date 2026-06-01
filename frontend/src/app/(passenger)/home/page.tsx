"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, MapPin, Search } from "lucide-react";
import TicketModal from "@/components/TicketModal";

export default function HomePage() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="p-6 md:p-10 space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start pt-4">
        <div>
          <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base">Good Morning,</p>
          <h1 className="text-xl md:text-3xl font-bold text-slate-900 dark:text-white">Olivia Rhye</h1>
        </div>
        <button className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/70 dark:bg-slate-800/60 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/20 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 relative hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
          <Bell className="w-5 h-5 md:w-6 md:h-6" />
          <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
      </div>

      {/* Desktop Top Section Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column on Desktop */}
        <div className="space-y-8 lg:col-span-8">
          {/* Search Input Fake Button */}
          <div 
            onClick={() => router.push("/buy")}
            className="w-full bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-xl p-4 md:p-5 flex items-center gap-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] cursor-pointer hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:border-brand-blue/50 active:scale-[0.98] transition-all"
          >
            <Search className="w-5 h-5 md:w-6 md:h-6 text-slate-400" />
            <span className="text-slate-400 font-medium md:text-lg">Where are you going today?</span>
          </div>

          {/* Shortcuts */}
          <div className="flex md:grid md:grid-cols-2 gap-4 overflow-x-auto pb-2 -mx-6 px-6 md:mx-0 md:px-0">
            {[
              { label: "Manila Terminal", icon: MapPin },
              { label: "Davao City", icon: MapPin },
            ].map((shortcut, i) => (
              <button key={i} className="flex-shrink-0 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-xl p-3 md:p-4 flex flex-col gap-2 min-w-[140px] md:min-w-0 text-left active:scale-95 hover:border-brand-blue/30 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
                <p className="text-[10px] md:text-xs text-slate-400 font-semibold uppercase tracking-wider">Buy ticket to</p>
                <div className="flex items-center gap-2">
                  <shortcut.icon className="w-4 h-4 text-slate-900 dark:text-white" />
                  <span className="font-semibold text-sm md:text-base text-slate-900 dark:text-white truncate">{shortcut.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Column on Desktop: Active Ticket */}
        <div className="space-y-4 lg:col-span-4 transition-all duration-700 ease-in-out hover:-translate-y-1">
          <h2 className="font-bold text-lg md:text-xl text-slate-900 dark:text-white">Your Active Ticket</h2>
          <div className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl p-5 md:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.1)] transition-shadow">
            <p className="font-bold text-slate-900 dark:text-white mb-4">Mon, 19 February 2026</p>
            
            <div className="flex gap-2 mb-6">
              <span className="px-3 py-1 bg-brand-orange text-white text-xs md:text-sm font-bold rounded-md">Fastest</span>
              <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs md:text-sm font-bold rounded-md">Mix</span>
            </div>

            <div className="flex items-center justify-between relative mb-6">
              {/* Dots and line */}
              <div className="absolute left-3 top-1/2 -translate-y-1/2 w-[calc(100%-24px)] h-0.5 bg-slate-200 dark:bg-slate-700 border-t border-dashed border-slate-300 dark:border-slate-600"></div>
              
              <div className="flex flex-col items-center gap-1 z-10 bg-white dark:bg-slate-800 px-2 md:px-4">
                <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-green-100 flex items-center justify-center border border-green-200">
                  <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-green-500"></div>
                </div>
                <span className="text-xs md:text-sm font-medium text-slate-500">Manila</span>
              </div>

              <div className="z-10 bg-white dark:bg-slate-800 px-2 text-[10px] md:text-xs font-medium text-slate-400">
                Est. 12h 30m
              </div>

              <div className="flex flex-col items-center gap-1 z-10 bg-white dark:bg-slate-800 px-2 md:px-4">
                <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-orange-100 flex items-center justify-center border border-orange-200">
                  <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-brand-orange"></div>
                </div>
                <span className="text-xs md:text-sm font-medium text-slate-500">Davao</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-sm md:text-base font-medium text-slate-600 dark:text-slate-300 mb-6">
              <span className="flex items-center gap-1"><MapPin className="w-4 h-4 md:w-5 md:h-5"/> Bus 01</span>
              <span>Arrival in <strong className="text-slate-900 dark:text-white">15:30</strong></span>
            </div>

            <button 
              onClick={() => setIsModalOpen(true)}
              className="w-full bg-brand-blue text-white font-bold py-3.5 md:py-4 rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all shadow-md shadow-brand-blue/20"
            >
              See Barcode
            </button>
          </div>
        </div>
      </div>

      {isModalOpen && <TicketModal onClose={() => setIsModalOpen(false)} />}
    </div>
  );
}

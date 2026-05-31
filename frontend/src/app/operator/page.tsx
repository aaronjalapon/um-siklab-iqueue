"use client";

import { useEffect, useState } from "react";
import { getForecast } from "@/lib/api";
import { surgeColorClass, surgeLabel } from "@/lib/utils";
import type { SurgePrediction } from "@/lib/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Bus, TrendingUp, Users } from "lucide-react";

export default function OperatorDashboard() {
  const [forecast, setForecast] = useState<SurgePrediction[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);

  // For demo — fetch forecast for a sample route
  useEffect(() => {
    getForecast("00000000-0000-0000-0000-000000000001")
      .then((data) => setForecast(data.predictions))
      .catch(() => {
        // Use sample data if API not available
        const sample: SurgePrediction[] = [];
        for (let i = 1; i <= 7; i++) {
          const d = new Date();
          d.setDate(d.getDate() + i);
          sample.push({
            forecast_date: d.toISOString().split("T")[0],
            surge_probability: Math.random() * 0.8,
            predicted_volume: Math.floor(80 + Math.random() * 120),
            confidence_lower: 60,
            confidence_upper: 160,
            is_holiday: false,
            holiday_name: null,
          });
        }
        setForecast(sample);
      });
  }, []);

  const chartData = forecast.map((p) => ({
    date: new Date(p.forecast_date).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }),
    volume: p.predicted_volume,
    surge: p.surge_probability,
    color:
      p.surge_probability < 0.4
        ? "#22c55e"
        : p.surge_probability < 0.7
          ? "#eab308"
          : "#ef4444",
  }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold">Operator Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[
          {
            icon: Bus,
            label: "Active Buses",
            value: "43",
            color: "text-blue-600",
          },
          {
            icon: Users,
            label: "Today's Bookings",
            value: "1,247",
            color: "text-green-600",
          },
          {
            icon: TrendingUp,
            label: "Avg Surge Probability",
            value: `${((forecast.reduce((a, p) => a + p.surge_probability, 0) / (forecast.length || 1)) * 100).toFixed(0)}%`,
            color: "text-yellow-600",
          },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className={`bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white/20 transition-all rounded-xl p-5 flex items-center gap-4 ${i === 2 ? "lg:col-span-2 xl:col-span-1" : ""}`}
            >
              <Icon className={`w-8 h-8 ${stat.color} animate-pulse duration-[3000ms]`} />
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid wrapper for chart and capacity */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Surge Forecast Chart */}
        <div className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/20 rounded-xl p-6 xl:col-span-3">
          <h2 className="text-lg font-semibold mb-4 flex justify-between items-center">
            <span>7-Day Surge Forecast</span>
            <div className="bg-white/50 backdrop-blur-md rounded-md p-1 border border-white/20 text-xs text-gray-600 shadow-sm flex gap-1">
              <button className="px-2 py-1 rounded bg-white shadow-sm font-medium text-slate-800">7 Days</button>
              <button className="px-2 py-1 rounded hover:bg-white/50 transition opacity-60">30 Days</button>
            </div>
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <defs>
                  <linearGradient id="colorSurge" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0.4}/>
                  </linearGradient>
                  <linearGradient id="colorYellow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#eab308" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#eab308" stopOpacity={0.4}/>
                  </linearGradient>
                  <linearGradient id="colorRed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.4}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" vertical={false} />
                <XAxis dataKey="date" fontSize={12} stroke="#94a3b8" />
                <YAxis fontSize={12} stroke="#94a3b8" />
                <Tooltip
                  formatter={(value, name) => [
                    name === "volume"
                      ? `${value} passengers`
                      : `${(Number(value) * 100).toFixed(0)}%`,
                    name === "volume" ? "Predicted Volume" : "Surge Probability",
                  ]}
                  contentStyle={{ backgroundColor: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(8px)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.3)' }}
                />
                <Bar dataKey="volume" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => {
                    const fillId = entry.color === '#22c55e' ? 'url(#colorGreen)' : entry.color === '#eab308' ? 'url(#colorYellow)' : 'url(#colorRed)';
                    return <rect key={index} fill={fillId} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Legend */}
          <div className="flex justify-center gap-4 mt-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-green-500 rounded" /> Low Surge (&lt;40%)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-yellow-500 rounded" /> Moderate (40-70%)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-red-500 rounded" /> High (&gt;70%)
            </span>
          </div>
        </div>

        {/* Bus Capacity Panel */}
        <div className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/20 rounded-xl p-6 xl:col-span-1 flex flex-col">
          <h2 className="text-lg font-semibold mb-6">Bus Capacity</h2>
          <div className="space-y-5 flex-1">
            {[
              { plate: "PH-0001", capacity: 50, booked: 34 },
              { plate: "PH-0002", capacity: 45, booked: 41 },
              { plate: "PH-0003", capacity: 55, booked: 28 },
              { plate: "PH-0004", capacity: 50, booked: 50 },
              { plate: "ID-0005", capacity: 60, booked: 45 },
            ].map((bus) => {
              const pct = (bus.booked / bus.capacity) * 100;
              return (
                <div key={bus.plate} className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-700">
                  <div className="flex justify-between items-end">
                    <span className="text-sm font-mono font-semibold text-slate-700">{bus.plate}</span>
                    <span className="text-xs font-medium text-slate-500">
                      {bus.booked}/{bus.capacity} <span className={pct > 90 ? "text-red-500" : pct > 70 ? "text-yellow-500" : "text-green-500"}>({pct.toFixed(0)}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-200/50 rounded-full h-2 overflow-hidden shadow-inner">
                    <div
                      className={`h-full rounded-full transition-all duration-[1500ms] ease-out ${
                        pct > 90
                          ? "bg-gradient-to-r from-red-400 to-red-600"
                          : pct > 70
                            ? "bg-gradient-to-r from-yellow-400 to-yellow-500"
                            : "bg-gradient-to-r from-green-400 to-green-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

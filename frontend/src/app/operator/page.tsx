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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Operator Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white rounded-xl shadow-sm border p-5 flex items-center gap-4"
            >
              <Icon className={`w-8 h-8 ${stat.color}`} />
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Surge Forecast Chart */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold mb-4">
          7-Day Surge Forecast
        </h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip
                formatter={(value, name) => [
                  name === "volume"
                    ? `${value} passengers`
                    : `${(Number(value) * 100).toFixed(0)}%`,
                  name === "volume" ? "Predicted Volume" : "Surge Probability",
                ]}
              />
              <Bar dataKey="volume" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <rect key={index} fill={entry.color} />
                ))}
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
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold mb-4">Bus Capacity</h2>
        <div className="space-y-3">
          {[
            { plate: "PH-0001", capacity: 50, booked: 34 },
            { plate: "PH-0002", capacity: 45, booked: 41 },
            { plate: "PH-0003", capacity: 55, booked: 28 },
            { plate: "PH-0004", capacity: 50, booked: 50 },
            { plate: "ID-0005", capacity: 60, booked: 45 },
          ].map((bus) => {
            const pct = (bus.booked / bus.capacity) * 100;
            return (
              <div key={bus.plate} className="flex items-center gap-3">
                <span className="text-sm font-mono w-20">{bus.plate}</span>
                <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      pct > 90
                        ? "bg-red-500"
                        : pct > 70
                          ? "bg-yellow-500"
                          : "bg-green-500"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-sm text-gray-500 w-24 text-right">
                  {bus.booked}/{bus.capacity} ({pct.toFixed(0)}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

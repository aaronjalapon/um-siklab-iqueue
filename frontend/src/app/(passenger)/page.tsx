"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

// Common ASEAN bus city origins/destinations for demo
const CITIES = [
  "Manila",
  "Davao",
  "Cebu",
  "Cagayan de Oro",
  "Bacolod",
  "Jakarta",
  "Bandung",
  "Surabaya",
  "Yogyakarta",
  "Ho Chi Minh City",
  "Hanoi",
  "Da Nang",
  "Hai Phong",
  "Kuala Lumpur",
  "Penang",
  "Johor Bahru",
];

export default function HomePage() {
  const router = useRouter();
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [travelDate, setTravelDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split("T")[0]
  );
  const [passengers, setPassengers] = useState(1);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin || !destination || !travelDate) return;
    router.push(
      `/results?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&date=${travelDate}&passengers=${passengers}`
    );
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh]">
      {/* Hero */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">
          Smart Bus Boarding
        </h1>
        <p className="text-lg text-gray-600 max-w-md mx-auto">
          AI-powered seat assignment, QR boarding passes, and real-time surge
          predictions for ASEAN bus terminals.
        </p>
      </div>

      {/* Search Form */}
      <form
        onSubmit={handleSearch}
        className="w-full max-w-lg bg-white rounded-xl shadow-lg p-6 space-y-4"
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From
            </label>
            <select
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select origin...</option>
              {CITIES.map((city) => (
                <option key={`from-${city}`} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To
            </label>
            <select
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select destination...</option>
              {CITIES.filter((c) => c !== origin).map((city) => (
                <option key={`to-${city}`} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              value={travelDate}
              onChange={(e) => setTravelDate(e.target.value)}
              required
              min={new Date().toISOString().split("T")[0]}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Passengers
            </label>
            <input
              type="number"
              value={passengers}
              onChange={(e) =>
                setPassengers(Math.max(1, Math.min(10, Number(e.target.value))))
              }
              min={1}
              max={10}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-700 text-white font-semibold py-3 rounded-lg hover:bg-blue-800 transition flex items-center justify-center gap-2"
        >
          <Search className="w-4 h-4" />
          Search Buses
        </button>
      </form>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-12 max-w-3xl w-full text-center">
        {[
          { icon: "📊", label: "Surge Forecasts" },
          { icon: "🪑", label: "Smart Seat Pairs" },
          { icon: "📱", label: "QR Boarding Pass" },
          { icon: "💬", label: "AI Chatbot" },
        ].map((f) => (
          <div
            key={f.label}
            className="bg-white rounded-lg p-4 shadow-sm border"
          >
            <div className="text-2xl mb-2">{f.icon}</div>
            <div className="text-sm font-medium text-gray-700">{f.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

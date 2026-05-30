"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

const CITIES = [
  "Manila", "Davao", "Cebu", "Cagayan de Oro", "Bacolod",
  "Jakarta", "Bandung", "Surabaya", "Yogyakarta",
  "Ho Chi Minh City", "Hanoi", "Da Nang", "Hai Phong",
  "Kuala Lumpur", "Penang", "Johor Bahru",
];

export default function HomePage() {
  const router = useRouter();
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [travelDate, setTravelDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split("T")[0]
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin || !destination || !travelDate) return;
    router.push(
      `/results?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&date=${travelDate}`
    );
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh]">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">Smart Bus Boarding</h1>
        <p className="text-lg text-gray-600 max-w-md mx-auto">
          AI-powered seat assignment, QR boarding passes, and real-time surge predictions for ASEAN bus terminals.
        </p>
      </div>

      <form onSubmit={handleSearch} className="w-full max-w-lg bg-white rounded-xl shadow-lg p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
            <select value={origin} onChange={(e) => setOrigin(e.target.value)} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
              <option value="">Select origin...</option>
              {CITIES.map((city) => (<option key={`from-${city}`} value={city}>{city}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
            <select value={destination} onChange={(e) => setDestination(e.target.value)} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
              <option value="">Select destination...</option>
              {CITIES.filter((c) => c !== origin).map((city) => (<option key={`to-${city}`} value={city}>{city}</option>))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input type="date" value={travelDate} onChange={(e) => setTravelDate(e.target.value)} required
            min={new Date().toISOString().split("T")[0]}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
        </div>
        <button type="submit"
          className="w-full bg-blue-700 text-white font-semibold py-3 rounded-lg hover:bg-blue-800 transition flex items-center justify-center gap-2">
          <Search className="w-4 h-4" /> Search Buses
        </button>
      </form>
    </div>
  );
}

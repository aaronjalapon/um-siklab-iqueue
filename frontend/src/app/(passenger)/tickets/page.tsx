"use client";

import { Ticket, Search } from "lucide-react";
import Link from "next/link";

export default function TicketsPage() {
  return (
    <div className="p-6 h-full flex flex-col items-center justify-center animate-in fade-in duration-500">
      <div className="w-24 h-24 bg-blue-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-inner border border-blue-100 dark:border-slate-700">
        <Ticket className="w-10 h-10 text-brand-blue" />
      </div>
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Active Tickets</h2>
      <p className="text-center text-slate-500 dark:text-slate-400 mb-8 max-w-[260px]">
        You don't have any upcoming trips. Book a ticket to see it here!
      </p>
      
      <Link 
        href="/buy"
        className="flex items-center gap-2 bg-brand-blue text-white px-8 py-3.5 rounded-xl font-bold shadow-md shadow-brand-blue/20 hover:bg-blue-700 transition-colors active:scale-95"
      >
        <Search className="w-5 h-5" /> Find a Bus
      </Link>
    </div>
  );
}

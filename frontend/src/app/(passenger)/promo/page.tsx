"use client";

import { Gift } from "lucide-react";

export default function PromoPage() {
  return (
    <div className="p-6 h-full flex flex-col items-center justify-center animate-in fade-in duration-500">
      <div className="w-32 h-32 relative mb-8">
        <div className="absolute inset-0 bg-orange-100 dark:bg-orange-900/30 rounded-3xl rotate-12 scale-110"></div>
        <div className="absolute inset-0 bg-white dark:bg-slate-800 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-700 flex items-center justify-center">
          <Gift className="w-12 h-12 text-brand-orange" />
        </div>
      </div>
      
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 text-center">No Promos Yet</h2>
      <p className="text-center text-slate-500 dark:text-slate-400 max-w-[280px]">
        You've used all your promos! Keep booking tickets to earn more discounts and rewards.
      </p>
    </div>
  );
}

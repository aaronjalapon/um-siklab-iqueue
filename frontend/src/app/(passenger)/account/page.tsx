"use client";

import { ChevronRight, CreditCard, HelpCircle, LogOut, Settings, User } from "lucide-react";

export default function AccountPage() {
  const menuItems = [
    { icon: User, label: "Personal Information", color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-500/10" },
    { icon: CreditCard, label: "Payment Methods", color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-500/10" },
    { icon: Settings, label: "Settings", color: "text-slate-500", bg: "bg-slate-100 dark:bg-slate-800" },
    { icon: HelpCircle, label: "Help Center", color: "text-green-500", bg: "bg-green-50 dark:bg-green-500/10" },
  ];

  return (
    <div className="animate-in fade-in duration-500">
      {/* Header Profile */}
      <div className="bg-brand-blue px-6 pt-12 pb-8 rounded-b-[40px] shadow-md relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-xl -translate-x-1/2 translate-y-1/2"></div>
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-16 h-16 rounded-full bg-white border-2 border-white/20 overflow-hidden flex items-center justify-center">
            {/* Fallback avatar */}
            <User className="w-8 h-8 text-slate-300" />
          </div>
          <div className="text-white">
            <h1 className="text-xl font-bold">Olivia Rhye</h1>
            <p className="text-blue-100 text-sm">olivia@example.com</p>
          </div>
        </div>
      </div>

      <div className="p-6 mt-4 space-y-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
          {menuItems.map((item, index) => (
            <button 
              key={index}
              className={`w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${
                index !== menuItems.length - 1 ? "border-b border-slate-100 dark:border-slate-700" : ""
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full ${item.bg} flex items-center justify-center`}>
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{item.label}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>
          ))}
        </div>

        <button className="w-full flex items-center justify-center gap-2 py-4 text-red-500 font-bold bg-red-50 dark:bg-red-500/10 rounded-2xl hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors">
          <LogOut className="w-5 h-5" /> Log Out
        </button>
      </div>
    </div>
  );
}

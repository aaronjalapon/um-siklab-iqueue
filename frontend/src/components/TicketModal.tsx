"use client";

import { X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export default function TicketModal({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 animate-in fade-in duration-300"
        onClick={onClose}
      />
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl z-50 p-6 pt-4 shadow-2xl animate-in slide-in-from-bottom-full duration-300">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full" />
        </div>
        
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Your E-ticket</h3>
          <button onClick={onClose} className="p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col items-center justify-center py-6">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6">
            <QRCodeSVG value="BUS01150224" size={200} />
          </div>
          
          <p className="text-slate-500 text-sm font-medium mb-1">Booking Code</p>
          <p className="text-2xl font-bold tracking-wider text-slate-900 dark:text-white mb-6">BUS01150224</p>
          
          <p className="text-center text-slate-500 text-sm px-4">
            Scan the barcode or enter the booking code when getting on the bus.
          </p>
        </div>
      </div>
    </>
  );
}

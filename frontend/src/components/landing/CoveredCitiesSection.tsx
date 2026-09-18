import Link from "next/link";
import { ArrowRight, CircleDot, MapPinned } from "lucide-react";
import { uiStyles } from "@/lib/design-system";

const routes = ["Davao City", "Cagayan de Oro", "Cotabato City", "General Santos", "Butuan City", "Iligan City", "Zamboanga City"];

export default function CoveredCitiesSection() {
  return (
    <section id="network" className="bg-ui-canvas px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-ui-primary">Pilot network</p>
          <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">Routes centered on Mindanao terminals.</h2>
          <p className="mt-5 max-w-xl text-lg leading-8 text-ui-muted-foreground">The portfolio uses synthetic route and capacity data across seven demonstration terminals. Availability is illustrative, not a live transport feed.</p>
          <ul className="mt-7 grid grid-cols-2 gap-x-5 gap-y-3 text-sm font-semibold">
            {routes.map((route) => <li key={route} className="flex items-center gap-2"><CircleDot className="h-4 w-4 text-ui-primary" aria-hidden />{route}</li>)}
          </ul>
          <Link href="/buy" className={`${uiStyles.primaryButton} mt-8`}>Explore routes <ArrowRight className="h-4 w-4" aria-hidden /></Link>
        </div>
        <div className="overflow-hidden rounded-xl border border-ui-border bg-ui-navy p-5 text-white sm:p-8">
          <div className="mb-5 flex items-center justify-between"><div><p className="text-sm font-semibold text-blue-200">Network diagram</p><p className="font-heading text-xl font-semibold">TripSync pilot terminals</p></div><MapPinned className="h-7 w-7 text-blue-300" aria-hidden /></div>
          <svg viewBox="0 0 680 380" role="img" aria-labelledby="network-map-title network-map-desc" className="w-full">
            <title id="network-map-title">TripSync pilot route network</title><desc id="network-map-desc">A static schematic connecting Davao City with six Mindanao demonstration terminals.</desc>
            <g className="route-reveal" stroke="#6484a4" strokeWidth="3" fill="none"><path d="M330 190 L105 85 M330 190 L145 295 M330 190 L350 55 M330 190 L520 80 M330 190 L555 220 M330 190 L470 330" /></g>
            {[[330,190,"Davao City"],[105,85,"Cagayan de Oro"],[145,295,"Cotabato City"],[350,55,"Iligan City"],[520,80,"Butuan City"],[555,220,"General Santos"],[470,330,"Zamboanga City"]].map(([x,y,label]) => <g key={String(label)}><circle cx={Number(x)} cy={Number(y)} r="10" fill={label === "Davao City" ? "#6ea8fe" : "#ffffff"} stroke="#0b1f33" strokeWidth="4"/><text x={Number(x)} y={Number(y) + 28} textAnchor="middle" fill="#ffffff" fontSize="15" fontWeight="600">{label}</text></g>)}
          </svg>
          <p className="mt-4 border-t border-white/15 pt-4 text-sm text-slate-300">Static portfolio diagram · not real-time vehicle tracking</p>
        </div>
      </div>
    </section>
  );
}

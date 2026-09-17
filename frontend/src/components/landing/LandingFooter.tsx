import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";

export default function LandingFooter() {
  return (
    <footer className="border-t border-white/15 bg-ui-navy px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-7 sm:flex-row sm:items-end sm:justify-between">
        <div><BrandLogo textClassName="font-heading text-xl font-semibold text-white" /><p className="mt-3 max-w-md text-sm leading-6 text-slate-300">A portfolio prototype for clearer, more accessible inter-provincial boarding.</p></div>
        <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-slate-300"><Link href="/buy" className="hover:text-white">Passenger demo</Link><Link href="/operator" className="hover:text-white">Operator demo</Link><a href="#hero" className="hover:text-white">Back to top</a></div>
      </div>
      <div className="mx-auto mt-8 max-w-7xl border-t border-white/15 pt-5 text-xs text-slate-400">Synthetic-data prototype. No payments or live transport inventory.</div>
    </footer>
  );
}

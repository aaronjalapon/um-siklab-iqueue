import Link from "next/link";
import { CircleCheck, FlaskConical } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";

const groups = [
  {
    title: "Experience",
    links: [
      { label: "Passenger demo", href: "/buy" },
      { label: "Operator demo", href: "/operator" },
      { label: "Features", href: "#features" },
    ],
  },
  {
    title: "Explore",
    links: [
      { label: "How It Works", href: "#how-it-works" },
      { label: "Network", href: "#network" },
      { label: "Back to top", href: "#hero" },
    ],
  },
];

export default function LandingFooter() {
  return (
    <footer className="border-t border-ui-border/70 dark:border-white/10 bg-ui-surface dark:bg-[#07111f] px-4 py-12 text-ui-foreground dark:text-white sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1.4fr_0.6fr_0.6fr]">
        <div>
          <BrandLogo textClassName="font-heading text-xl font-semibold text-ui-foreground dark:text-white" />
          <p className="mt-4 max-w-md text-sm leading-6 text-ui-muted-foreground dark:text-slate-300">A portfolio prototype for clearer, more accessible inter-provincial boarding across Mindanao—with an illustrative view of what a broader ASEAN network could become.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 dark:border-emerald-400/25 dark:bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300"><CircleCheck className="h-3.5 w-3.5" aria-hidden /> Accessible demo flows</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/25 bg-blue-500/10 dark:border-blue-300/25 dark:bg-blue-400/10 px-3 py-1.5 text-xs font-bold text-blue-700 dark:text-blue-200"><FlaskConical className="h-3.5 w-3.5" aria-hidden /> Synthetic dataset</span>
          </div>
        </div>

        {groups.map((group) => (
          <div key={group.title}>
            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-ui-muted-foreground dark:text-slate-400">{group.title}</h2>
            <ul className="mt-4 space-y-3 text-sm font-semibold text-ui-foreground dark:text-slate-200">
              {group.links.map((link) => (
                <li key={link.label}><Link href={link.href} className="inline-flex min-h-11 items-center hover:text-ui-primary dark:hover:text-white hover:underline transition-colors">{link.label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-10 flex max-w-7xl flex-col gap-2 border-t border-ui-border/70 dark:border-white/10 pt-5 text-xs leading-5 text-ui-muted-foreground dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} TripSync. Demonstration experience.</p>
        <p>Synthetic data · No payments · No live transport inventory</p>
      </div>
    </footer>
  );
}

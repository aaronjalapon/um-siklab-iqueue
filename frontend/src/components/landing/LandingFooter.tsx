"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Bus, Code2, X as XIcon } from "lucide-react";

const footerLinks = [
  {
    heading: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "How It Works", href: "#how-it-works" },
      { label: "Covered Cities", href: "#cities" },
    ],
  },
  {
    heading: "Portals",
    links: [
      { label: "Book a Ticket", href: "/buy" },
      { label: "My Tickets", href: "/tickets" },
      { label: "Operator Dashboard", href: "/operator" },
    ],
  },
  {
    heading: "Project",
    links: [
      { label: "UM Siklab Team", href: "#" },
      { label: "Hackathon Submission", href: "#" },
      { label: "Privacy Policy", href: "#" },
    ],
  },
];

export default function LandingFooter() {
  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith("#")) {
      e.preventDefault();
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <footer className="bg-slate-950 border-t border-white/10 pt-16 pb-8 relative">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-blue/40 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-14">
          {/* Brand col */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 mb-4 group">
              <div className="w-9 h-9 bg-brand-blue rounded-xl flex items-center justify-center shadow-lg shadow-brand-blue/30 group-hover:scale-105 transition-transform">
                <Bus className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">IQueue</span>
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed max-w-[200px]">
              AI-powered smart boarding for inter-provincial bus terminals across ASEAN.
            </p>
            <div className="flex gap-3 mt-5">
              <a
                href="#"
                className="w-9 h-9 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:border-white/30 transition-all"
              >
                <Code2 className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="w-9 h-9 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:border-white/30 transition-all"
              >
                <XIcon className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Link columns */}
          {footerLinks.map((col) => (
            <div key={col.heading}>
              <p className="text-white text-xs font-bold uppercase tracking-widest mb-4">{col.heading}</p>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      onClick={(e) => handleAnchorClick(e, link.href)}
                      className="text-slate-400 text-sm hover:text-white transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="border-t border-white/10 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4"
        >
          <p className="text-slate-500 text-xs text-center sm:text-left">
            © 2026 UM Siklab — University of Mindanao, Philippines. Built for{" "}
            <span className="text-brand-blue font-semibold">AI for Good — Smart City Track</span>.
          </p>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 bg-brand-blue/10 border border-brand-blue/20 text-brand-blue text-xs font-bold px-3 py-1 rounded-full">
              🏆 Hackathon 2026
            </span>
            <span className="inline-flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold px-3 py-1 rounded-full">
              Demo: Jun 25, 2026
            </span>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}

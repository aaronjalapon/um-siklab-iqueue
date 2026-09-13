"use client";

import { motion } from "framer-motion";
import {
  Armchair,
  ChartLine,
  MessageCircle,
  QrCode,
  type LucideIcon,
} from "lucide-react";
import { BRAND } from "@/lib/brand";

type Feature = {
  icon: LucideIcon;
  iconClass: string;
  title: string;
  subtitle: string;
  description: string;
  accent: string;
  border: string;
  badge: string;
  badgeText: string;
};

const features: Feature[] = [
  {
    icon: ChartLine,
    iconClass: "text-blue-300",
    title: "Demand Forecasting",
    subtitle: "Prophet + LSTM Hybrid",
    description:
      "Predicts passenger surges up to 7 days ahead using ASEAN holiday calendars, historical ridership, and real-time signals. Operators get early warnings before Holy Week, Eid, and Tết rushes.",
    accent: "from-blue-500/20 to-cyan-500/10",
    border: "border-blue-500/20",
    badge: "bg-blue-500/15 text-blue-400 border-blue-500/25",
    badgeText: "7-Day Forecast",
  },
  {
    icon: Armchair,
    iconClass: "text-purple-300",
    title: "Smart Seat Allocator",
    subtitle: "Affinity-Based Pairing",
    description:
      "Goes beyond simple assignment — matches seatmates by language, travel habits, and lifestyle. Families stay together. Solo travelers get peace. Every seat is optimized.",
    accent: "from-purple-500/20 to-pink-500/10",
    border: "border-purple-500/20",
    badge: "bg-purple-500/15 text-purple-400 border-purple-500/25",
    badgeText: "AI-Matched",
  },
  {
    icon: QrCode,
    iconClass: "text-orange-300",
    title: "QR Boarding Pass",
    subtitle: "HMAC-SHA256 Signed",
    description:
      "Cryptographically signed QR codes work offline at terminal gates. No internet? No problem. Each pass encodes passenger ID, route, seat, and your 15-minute boarding window.",
    accent: "from-orange-500/20 to-red-500/10",
    border: "border-orange-500/20",
    badge: "bg-orange-500/15 text-orange-400 border-orange-500/25",
    badgeText: "Offline-Ready",
  },
  {
    icon: MessageCircle,
    iconClass: "text-green-300",
    title: "Multilingual Chatbot",
    subtitle: "mBERT / Flan-T5",
    description:
      "Supports Filipino, Bahasa Indonesia, Vietnamese, and English natively. Ask about departure times, seat upgrades, or surge alerts — in your language, naturally.",
    accent: "from-green-500/20 to-teal-500/10",
    border: "border-green-500/20",
    badge: "bg-green-500/15 text-green-400 border-green-500/25",
    badgeText: "4 Languages",
  },
];

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT } },
};

export default function FeaturesSection() {
  return (
    <section
      id="features"
      className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden bg-slate-950 px-4 py-16 sm:px-6 lg:px-8"
    >
      <div className="mx-auto w-full max-w-7xl">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10 lg:mb-12"
        >
          <span className="inline-block text-brand-blue text-xs font-bold uppercase tracking-[0.2em] mb-2">
            Platform Features
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight">
            Four Systems.{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-orange to-yellow-400">
              One Platform.
            </span>
          </h2>
          <p className="mt-3 text-slate-400 text-base sm:text-lg max-w-2xl mx-auto">
            {BRAND.name} integrates AI forecasting, intelligent seating, verified boarding, and multilingual support into a single cohesive experience.
          </p>
        </motion.div>

        {/* Feature cards grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                variants={cardVariants}
                whileHover={{ y: -6, scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className={`relative rounded-2xl border ${feature.border} bg-gradient-to-br ${feature.accent} backdrop-blur-xl p-6 flex flex-col gap-4 overflow-hidden group cursor-default shadow-lg shadow-black/20`}
              >
                {/* Subtle glow on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-white/5 transition-opacity duration-300 rounded-2xl" />

                <div className="h-12 w-12 rounded-xl bg-slate-900/60 border border-white/10 flex items-center justify-center">
                  <Icon className={`h-7 w-7 ${feature.iconClass}`} aria-hidden />
                </div>

                <div>
                  <span className={`inline-block text-xs font-bold uppercase tracking-wider border px-2.5 py-1 rounded-full mb-2.5 ${feature.badge}`}>
                    {feature.badgeText}
                  </span>
                  <h3 className="text-white font-bold text-xl sm:text-2xl leading-tight">{feature.title}</h3>
                  <p className="text-slate-300 text-xs sm:text-sm font-semibold mt-1">{feature.subtitle}</p>
                </div>

                <p className="text-slate-300 text-sm sm:text-base leading-relaxed flex-1">{feature.description}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

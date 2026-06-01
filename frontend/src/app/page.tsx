import type { Metadata } from "next";
import LandingNavbar from "@/components/landing/LandingNavbar";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import CoveredCitiesSection from "@/components/landing/CoveredCitiesSection";
import ChatbotTeaser from "@/components/landing/ChatbotTeaser";
import LandingFooter from "@/components/landing/LandingFooter";

export const metadata: Metadata = {
  title: "IQueue — Board Smarter Across ASEAN",
  description:
    "AI-powered smart boarding platform for inter-provincial bus terminals. Demand forecasting, QR boarding passes, smart seat allocation, and multilingual chatbot — all in one place.",
  openGraph: {
    title: "IQueue — Board Smarter Across ASEAN",
    description:
      "AI-powered smart boarding platform for inter-provincial bus terminals across ASEAN.",
    type: "website",
  },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden">
      <LandingNavbar />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <CoveredCitiesSection />
      <LandingFooter />
      {/* Chatbot teaser is fixed-position, rendered outside flow */}
      <ChatbotTeaser />
    </div>
  );
}

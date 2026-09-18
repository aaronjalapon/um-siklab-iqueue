import type { Metadata } from "next";
import LandingNavbar from "@/components/landing/LandingNavbar";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import CoveredCitiesSection from "@/components/landing/CoveredCitiesSection";
import LandingFooter from "@/components/landing/LandingFooter";
import ChatbotPanel from "@/components/ChatbotPanel";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: { absolute: `${BRAND.name} — ${BRAND.tagline}` },
  description:
    "Accessible inter-provincial booking prototype with demand forecasting, seat allocation, verified QR passes, and multilingual assistance.",
  openGraph: {
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: BRAND.description,
    type: "website",
  },
};

export default function LandingPage() {
  return (
    <div className="landing-clay min-h-dvh overflow-x-hidden bg-ui-canvas text-ui-foreground">
      <LandingNavbar />
      <main id="main-content">
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <CoveredCitiesSection />
      </main>
      <LandingFooter />
      <ChatbotPanel />
    </div>
  );
}

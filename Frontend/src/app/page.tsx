import { Navbar } from "@/components/marketing/Navbar";
import { HeroSection } from "@/components/marketing/HeroSection";
import { BrandStatement } from "@/components/marketing/BrandStatement";
import { ServicesSection } from "@/components/marketing/ServicesSection";
import { DashboardShowcase } from "@/components/marketing/DashboardShowcase";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { EcosystemSection } from "@/components/marketing/EcosystemSection";
import { AISection } from "@/components/marketing/AISection";
import { GlobalSection } from "@/components/marketing/GlobalSection";
import { CTASection } from "@/components/marketing/CTASection";
import { Footer } from "@/components/marketing/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main id="main" className="flex-1 overflow-x-hidden">
        <HeroSection />
        <BrandStatement />
        <ServicesSection />
        <DashboardShowcase />
        <HowItWorks />
        <EcosystemSection />
        <AISection />
        <GlobalSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}

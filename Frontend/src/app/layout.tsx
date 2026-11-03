import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, DM_Mono } from "next/font/google";
import "./globals.css";

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const siteUrl = "https://logistimus.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Logistimus — Global Logistics Operating System",
    template: "%s — Logistimus",
  },
  description:
    "Manage orders, fleets, drivers, warehouses, and financial operations through one connected logistics platform. One platform. Every logistics operation.",
  keywords: [
    "logistics software",
    "fleet management",
    "dispatch software",
    "warehouse management",
    "order management",
    "route planning",
    "GPS tracking",
    "logistics platform",
    "freight forwarder software",
    "B2B SaaS logistics",
  ],
  applicationName: "Logistimus",
  authors: [{ name: "Logistimus" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Logistimus",
    title: "Logistimus — Global Logistics Operating System",
    description:
      "One connected platform for orders, fleet, dispatch, warehouse, finance and analytics. Built for global logistics businesses.",
    images: [
      {
        url: "/images/hero-scene.png",
        width: 1660,
        height: 948,
        alt: "Isometric logistics distribution center with warehouse and trucks",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Logistimus — Global Logistics Operating System",
    description:
      "One connected platform for orders, fleet, dispatch, warehouse, finance and analytics.",
    images: ["/images/hero-scene.png"],
  },
  robots: { index: true, follow: true },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f4feff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${hanken.variable} ${dmMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col overflow-x-hidden bg-ice text-royal">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}

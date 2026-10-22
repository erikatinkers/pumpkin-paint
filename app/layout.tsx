import type { Metadata, Viewport } from "next";
import { Cabin_Sketch } from "next/font/google";
import "./globals.css";
import WobbleTuner from "@/components/ui/WobbleTuner";

const hand = Cabin_Sketch({ weight: "400", subsets: ["latin"], variable: "--font-hand", display: "swap" });

export const metadata: Metadata = {
  title: "Pumpkin Paint Studio",
  description: "Turn a 3D pumpkin and paint it in pen and watercolor.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={hand.variable}>
      <body>
        {/* Wobble filters: the stylesheet runs borders and small shapes through these so the lines look hand-drawn. */}
        <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute" }}>
          <filter id="wobble" x="-10%" y="-5%" width="130%" height="115%">
            <feTurbulence type="fractalNoise" baseFrequency="0.025" numOctaves="1" seed="3" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="5" result="d" />
            {/* The displacement moves whole pixels, which stair-steps the edges at 1x; a touch of blur anti-aliases them (WobbleTuner turns it off on high-density screens). */}
            <feGaussianBlur id="wobble-blur" in="d" stdDeviation="0.55" />
          </filter>
          <filter id="wobble-sm" x="-8%" y="-8%" width="116%" height="116%">
            <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="1" seed="8" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="3.5" result="d" />
            <feGaussianBlur id="wobble-sm-blur" in="d" stdDeviation="0.5" />
          </filter>
        </svg>
        <WobbleTuner />
        {children}
      </body>
    </html>
  );
}

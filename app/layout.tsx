import type { Metadata, Viewport } from "next";
import { Patrick_Hand } from "next/font/google";
import "./globals.css";

const hand = Patrick_Hand({ weight: "400", subsets: ["latin"], variable: "--font-hand", display: "swap" });

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
            <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="3" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="5" />
          </filter>
          <filter id="wobble-sm" x="-8%" y="-8%" width="116%" height="116%">
            <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="8" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="3.5" />
          </filter>
        </svg>
        {children}
      </body>
    </html>
  );
}

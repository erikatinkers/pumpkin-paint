import type { Metadata, Viewport } from "next";
import { Fredoka } from "next/font/google";
import "./globals.css";

const fredoka = Fredoka({ subsets: ["latin"], variable: "--font-fredoka", display: "swap" });

export const metadata: Metadata = {
  title: "Pumpkin Paint Studio",
  description: "Turn a 3D clay pumpkin and paint it with soft pastel modeling clay.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fredoka.variable}>
      <body>{children}</body>
    </html>
  );
}

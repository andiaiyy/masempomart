import type { Metadata, Viewport } from "next";
import { Geist, Playfair_Display } from "next/font/google";
import CartBubble from "@/components/CartBubble";
import "./globals.css";

// Main font, the same as the Karueng Trip site. Playfair is only for product page headings
// (owner's reference). Both are downloaded at build time and served from this site.
const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Masempo Mart", template: "%s · Masempo Mart" },
  description: "Belanja camilan online di Masempo Mart, dikirim ke seluruh Indonesia.",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${geist.variable} ${playfair.variable}`}>
      <body className="flex min-h-dvh flex-col font-sans antialiased">
        <main id="isi" className="flex-1">
          {children}
        </main>
        <CartBubble />
      </body>
    </html>
  );
}

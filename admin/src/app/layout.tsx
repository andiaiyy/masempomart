import type { Metadata } from "next";
import { geist, playfair } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin Masempo Mart" },
  robots: { index: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${geist.variable} ${playfair.variable}`}>
      <body className="min-h-dvh font-sans antialiased">{children}</body>
    </html>
  );
}

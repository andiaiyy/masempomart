import { Geist, Noto_Sans_Buginese, Playfair_Display } from "next/font/google";

// The storefront's fonts: Geist for everything, Playfair for "Mart", Lontara for the shop name
export const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans", display: "swap" });
export const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap" });
export const lontara = Noto_Sans_Buginese({ weight: "400", subsets: ["buginese"], display: "swap" });

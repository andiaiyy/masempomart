import { IBM_Plex_Mono, Noto_Sans_Buginese } from "next/font/google";

// Lontara for the shop name (landing title card, receipt header). Self-hosted, so it shows on
// devices without a Bugis font.
export const lontara = Noto_Sans_Buginese({ weight: "400", subsets: ["buginese"], display: "swap" });

// The receipt's typewriter face, the same as the Karueng Trip receipt.
export const plexMono = IBM_Plex_Mono({ weight: ["400", "500", "600", "700"], subsets: ["latin"], display: "swap" });

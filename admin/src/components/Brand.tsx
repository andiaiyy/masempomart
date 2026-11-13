import { lontara } from "@/lib/fonts";

/** "ᨆᨔᨛᨇᨚ Mart", the storefront's title card in small: Lontara over Playfair, read out as "Masempo Mart". */
export default function Brand({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <span className={`inline-flex flex-col leading-none ${size === "lg" ? "items-center" : ""}`}>
      {/* Big, bold Lontara over a small "Mart", as on the landing title card */}
      <span lang="bug" aria-hidden="true" className={`${lontara.className} [-webkit-text-stroke:0.045em_currentColor] ${size === "lg" ? "text-5xl" : "text-3xl"}`}>
        ᨆᨔᨛᨇᨚ
      </span>
      <span className={`font-display ${size === "lg" ? "mt-1 text-xl" : "text-base"}`}>
        <span className="sr-only">Masempo </span>Mart
      </span>
    </span>
  );
}

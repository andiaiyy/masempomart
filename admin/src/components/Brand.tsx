import { lontara } from "@/lib/fonts";

/** "ᨆᨔᨛᨇᨚ Mart", the storefront's title card in small: Lontara over Playfair, read out as "Masempo Mart". */
export default function Brand({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <span className={`inline-flex flex-col leading-none ${size === "lg" ? "items-center" : ""}`}>
      <span lang="bug" aria-hidden="true" className={`${lontara.className} ${size === "lg" ? "text-4xl" : "text-2xl"}`}>
        ᨆᨔᨛᨇᨚ
      </span>
      <span className={`font-display ${size === "lg" ? "mt-1 text-3xl" : "text-xl"}`}>
        <span className="sr-only">Masempo </span>Mart
      </span>
    </span>
  );
}

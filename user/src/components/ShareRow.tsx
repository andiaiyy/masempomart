"use client";

import { useState } from "react";

const button = "inline-flex h-11 items-center px-3 text-sm hover:text-accent";

/** Share the product page: WhatsApp and Facebook open their share screens, or copy the link. */
export default function ShareRow({ name }: { name: string }) {
  const [copy, setCopy] = useState<"idle" | "done" | "failed">("idle");

  const open = (target: "whatsapp" | "facebook") => {
    const url = window.location.href;
    window.open(
      target === "whatsapp"
        ? `https://wa.me/?text=${encodeURIComponent(`${name} di Masempo Mart: ${url}`)}`
        : `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopy("done");
    } catch {
      setCopy("failed");
    }
  };

  return (
    <div className="mt-8 flex flex-wrap items-center">
      <span className="eyebrow mr-2 text-muted">Bagikan</span>
      <button type="button" onClick={() => open("whatsapp")} className={button}>
        WhatsApp
      </button>
      <button type="button" onClick={() => open("facebook")} className={button}>
        Facebook
      </button>
      <button type="button" onClick={copyLink} className={button}>
        {copy === "done" ? "Tautan disalin" : "Salin tautan"}
      </button>
      <span role="status" className={copy === "failed" ? "w-full px-3 text-xs text-danger sm:w-auto" : "sr-only"}>
        {copy === "failed" ? "Tautan tidak bisa disalin. Salin dari bilah alamat." : copy === "done" ? "Tautan disalin" : ""}
      </span>
    </div>
  );
}

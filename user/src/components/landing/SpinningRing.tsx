"use client";

import { useState } from "react";
import Image from "next/image";
import ring from "@/assets/jajanan-ring.png";
import { PauseIcon, PlayIcon } from "../Icons";

/**
 * The jajanan ring turning slowly around the title card (the owner asked for the food to circle).
 * Anything that moves on its own for more than 5 seconds needs a way to stop it (WCAG 2.2.2),
 * hence the pause button; visitors who ask their device for reduced motion get a still ring
 * and no button.
 */
export default function SpinningRing() {
  const [paused, setPaused] = useState(false);

  return (
    <div data-paused={paused || undefined}>
      {/* Round clip: a turning square's corners would otherwise poke past the screen edge on phones */}
      <div className="overflow-hidden rounded-full">
        <Image src={ring} alt="" priority sizes="(min-width: 800px) 760px, 100vw" className="ring-spin h-auto w-full select-none" />
      </div>
      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        aria-pressed={paused}
        aria-label={paused ? "Putar lagi ilustrasi jajanan" : "Hentikan putaran ilustrasi jajanan"}
        title={paused ? "Putar lagi" : "Hentikan putaran"}
        className="absolute bottom-0 right-0 flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-ink hover:border-ink motion-reduce:hidden"
      >
        {paused ? <PlayIcon /> : <PauseIcon />}
      </button>
    </div>
  );
}

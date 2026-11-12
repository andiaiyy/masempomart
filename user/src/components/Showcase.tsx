"use client";

import { useState } from "react";

/**
 * Product photos after the owner's reference: thumbnails in a column beside one large rounded
 * photo (under it on phones). White box with the cards' 16px radius, so it matches the shop.
 */
export default function Showcase({ images, name, soldOut }: { images: string[]; name: string; soldOut: boolean }) {
  const [shown, setShown] = useState(0);
  const src = images[shown];

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row">
      {images.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto sm:flex-col sm:overflow-visible">
          {images.map((photo, i) => (
            <li key={photo} className="shrink-0">
              <button
                type="button"
                onClick={() => setShown(i)}
                aria-label={`Foto ${i + 1} dari ${images.length}`}
                aria-pressed={i === shown}
                className={`block h-16 w-16 overflow-hidden rounded-lg border-2 bg-white ${i === shown ? "border-ink" : "border-transparent hover:border-line"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- thumbnail of an API photo */}
                <img src={photo} alt="" className="h-full w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="relative aspect-square min-w-0 flex-1 overflow-hidden rounded-2xl bg-white">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- photos come from the API's storage, sizes vary
          <img src={src} alt={name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted">Foto belum ada</div>
        )}
        {soldOut && <span className="absolute left-4 top-4 rounded bg-white px-2 py-1 text-xs font-bold uppercase text-danger ring-1 ring-line">Habis</span>}
      </div>
    </div>
  );
}

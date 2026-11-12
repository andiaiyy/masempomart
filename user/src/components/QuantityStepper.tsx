"use client";

import { MinusIcon, PlusIcon } from "./Icons";

/**
 * − 3 + with 44px tap targets (36px from the sm breakpoint when `compact`, for card rows).
 * `max` is the stock left; − at 1 calls onChange(0) when `canRemove`.
 */
export default function QuantityStepper({
  value,
  max,
  onChange,
  label,
  canRemove = false,
  compact = false,
  className = "",
}: {
  value: number;
  max: number;
  onChange: (next: number) => void;
  label: string;
  canRemove?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const atMax = value >= max;
  // Buttons carry the height, so the 1px border adds to the 44px target instead of eating into it
  const button = `flex shrink-0 items-center justify-center text-accent hover:bg-accent-soft disabled:text-muted disabled:hover:bg-transparent ${
    compact ? "h-11 w-11 sm:h-9 sm:w-9" : "h-11 w-11"
  }`;
  return (
    <div className={`flex items-stretch overflow-hidden rounded-md border border-accent bg-white ${className}`}>
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={!canRemove && value <= 1}
        aria-label={value <= 1 && canRemove ? `Hapus ${label} dari keranjang` : `Kurangi ${label}`}
        className={button}
      >
        <MinusIcon />
      </button>
      <span className="price flex min-w-6 flex-1 items-center justify-center text-sm font-bold" aria-live="polite">
        <span className="sr-only">Jumlah {label}: </span>
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={atMax}
        aria-label={atMax ? `Stok ${label} tinggal ${max}` : `Tambah satu ${label}`}
        title={atMax ? `Stok tinggal ${max}` : undefined}
        className={button}
      >
        <PlusIcon />
      </button>
    </div>
  );
}

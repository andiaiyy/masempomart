// Small stroke icons drawn for the shop's few controls: bag (cart), minus/plus (quantity), cross (remove),
// chevrons (previous / next product, collapsible filter sections), magnifier (search),
// pause / play (the turning ring on the landing page), down-up arrows (sort menu).
type Props = { className?: string };

const base = "fill-none stroke-current";

export function BagIcon({ className = "h-5 w-5" }: Props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={`${base} ${className}`} strokeWidth={1.8} strokeLinejoin="round">
      <path d="M5 8h14l-1.1 12H6.1L5 8z" />
      <path d="M9 10V7a3 3 0 0 1 6 0v3" strokeLinecap="round" />
    </svg>
  );
}

export function MinusIcon({ className = "h-4 w-4" }: Props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={`${base} ${className}`} strokeWidth={2.2} strokeLinecap="round">
      <path d="M5 12h14" />
    </svg>
  );
}

export function PlusIcon({ className = "h-4 w-4" }: Props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={`${base} ${className}`} strokeWidth={2.2} strokeLinecap="round">
      <path d="M5 12h14M12 5v14" />
    </svg>
  );
}

export function CrossIcon({ className = "h-4 w-4" }: Props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={`${base} ${className}`} strokeWidth={2} strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function ChevronIcon({ direction, className = "h-5 w-5" }: Props & { direction: "left" | "right" | "down" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={`${base} ${className}`} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d={{ left: "M15 5l-7 7 7 7", right: "M9 5l7 7-7 7", down: "M5 9l7 7 7-7" }[direction]} />
    </svg>
  );
}

export function PauseIcon({ className = "h-4 w-4" }: Props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={`${base} ${className}`} strokeWidth={2.4} strokeLinecap="round">
      <path d="M9 6v12M15 6v12" />
    </svg>
  );
}

export function PlayIcon({ className = "h-4 w-4" }: Props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={`${base} ${className}`} strokeWidth={2} strokeLinejoin="round">
      <path d="M8 5.5v13l10.5-6.5L8 5.5z" />
    </svg>
  );
}

export function SortIcon({ className = "h-4 w-4" }: Props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={`${base} ${className}`} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 4v16M5 17l3 3 3-3M16 20V4M13 7l3-3 3 3" />
    </svg>
  );
}

export function SearchIcon({ className = "h-4 w-4" }: Props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={`${base} ${className}`} strokeWidth={2} strokeLinecap="round">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </svg>
  );
}

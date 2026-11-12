import { digits } from "@/lib/format";

/** Every price in the shop reads the same: small "Rp", bold tabular digits. */
export default function Price({ value, className = "" }: { value: number; className?: string }) {
  return (
    <span className={`price whitespace-nowrap font-bold ${className}`}>
      <span className="mr-px text-[0.72em] font-semibold">Rp</span>
      {digits(value)}
    </span>
  );
}

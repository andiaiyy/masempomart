/** Square product photo on white (cart, order lines), or an honest placeholder until the shop uploads one. */
export default function ProductImage({
  src,
  alt,
  soldOut = false,
  className = "",
  eager = false,
}: {
  src: string | null;
  alt: string;
  soldOut?: boolean;
  className?: string;
  eager?: boolean;
}) {
  return (
    <div className={`relative aspect-square overflow-hidden rounded-md bg-white ${className}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- photos come from the API's storage, sizes vary
        <img src={src} alt={alt} loading={eager ? "eager" : "lazy"} className="h-full w-full object-cover" />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center p-3 text-center text-xs text-muted">Foto belum ada</span>
      )}
      {soldOut && (
        <span className="absolute left-2 top-2 rounded bg-white px-2 py-0.5 text-xs font-bold text-danger">Habis</span>
      )}
    </div>
  );
}

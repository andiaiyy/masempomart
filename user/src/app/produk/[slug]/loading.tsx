export default function Loading() {
  return (
    <div className="bg-paper">
      <div className="container-page" aria-busy="true">
        <p className="eyebrow border-b border-line py-5 text-muted" role="status">
          Memuat produk…
        </p>
        <div className="grid gap-10 py-10 md:grid-cols-2 md:gap-16 md:py-16" aria-hidden>
          <div className="mx-auto aspect-square w-full max-w-[480px] rounded-md bg-tile" />
          <div className="md:pt-8">
            <div className="h-10 w-3/4 rounded bg-tile" />
            <div className="mt-8 h-10 w-1/3 rounded bg-tile" />
            <div className="mt-8 grid grid-cols-3 gap-6">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="h-10 rounded bg-tile" />
              ))}
            </div>
            <div className="mt-8 h-12 w-2/3 rounded bg-tile" />
          </div>
        </div>
      </div>
    </div>
  );
}

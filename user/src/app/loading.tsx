export default function Loading() {
  return (
    <div className="px-4 pb-14 pt-8 sm:px-6 sm:pt-12" aria-busy="true">
      <p className="text-center text-sm text-muted" role="status">
        Memuat Masempo Mart…
      </p>
      <div aria-hidden className="mx-auto mt-6 aspect-square w-full max-w-[760px] rounded-full border-[min(90px,19vw)] border-line/70" />
    </div>
  );
}

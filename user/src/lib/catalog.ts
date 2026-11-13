/**
 * The shop's product shelf lives on the landing page (section #produk). Links into it carry
 * the tab, order and search in the URL, e.g. /?category=kue-kering#produk, so they can be shared.
 */
export type ShelfParams = {
  category?: string;
  q?: string;
  sort?: string;
  /** 1-based; left out for the first page */
  page?: number;
};

/** Link to the whole shelf */
export const SHELF = "/#produk";

/** Products per page: even rows at 2, 3 and 4 cards across */
export const SHELF_PAGE = 12;

export const SHELF_SORTS = [
  { value: "newest", label: "Baru" },
  { value: "best", label: "Terlaris" },
];
const DEFAULT_SORT = "newest";

/** Search params from Next.js, cleaned up: known keys, plain strings, known sort orders */
export function pick(raw: Record<string, string | string[] | undefined>): ShelfParams {
  const text = (key: string) => (typeof raw[key] === "string" && raw[key]!.trim() ? raw[key]!.trim().slice(0, 100) : undefined);
  const sort = text("sort");
  const page = Number(text("page"));
  return {
    category: text("category"),
    q: text("q"),
    sort: SHELF_SORTS.some((s) => s.value === sort) ? sort : undefined,
    page: Number.isInteger(page) && page > 1 && page < 1000 ? page : undefined,
  };
}

/** Link to the shelf showing this tab / order / search */
export function shelfHref(params: ShelfParams = {}) {
  const qs = new URLSearchParams();
  if (params.category) qs.set("category", params.category);
  if (params.q) qs.set("q", params.q);
  if (params.sort && params.sort !== DEFAULT_SORT) qs.set("sort", params.sort);
  if (params.page && params.page > 1) qs.set("page", String(params.page));
  const query = qs.toString();
  return query ? `/?${query}#produk` : SHELF;
}

/** The same view as a query for GET /api/products */
export function shelfApiQuery(params: ShelfParams) {
  const qs = new URLSearchParams({ per_page: String(SHELF_PAGE), page: String(params.page ?? 1), sort: params.sort ?? DEFAULT_SORT });
  if (params.category) qs.set("category", params.category);
  if (params.q) qs.set("q", params.q);
  return qs.toString();
}

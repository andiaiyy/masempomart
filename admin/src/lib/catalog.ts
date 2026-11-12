import { sql } from "./db";

/**
 * The public, read-only catalog the storefront reads (GET /api/categories, /api/products,
 * /api/products/:slug, /api/variants). A product is listed while it's on sale and has at least one
 * variant on sale.
 */

type ProductRow = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  images: string[];
  specs: { label: string; value: string }[];
  category_name: string;
  category_slug: string;
  category_id: number;
};

type VariantRow = {
  id: number;
  product_id: number;
  name: string;
  price: number;
  compare_at_price: number | null;
  weight_grams: number;
  stock: number;
};

const LISTED = `p.is_active and exists (select 1 from product_variants lv where lv.product_id = p.id and lv.is_active)`;

export async function categories() {
  return sql<{ id: number; name: string; slug: string; product_count: number }>(
    `select c.id, c.name, c.slug,
            (select count(*) from products p where p.category_id = c.id and ${LISTED}) as product_count
       from categories c order by c.sort_order, c.name`,
  );
}

export type ProductQuery = {
  category?: string | null;
  q?: string | null;
  exclude?: number | null;
  sort?: string | null;
  page?: number;
  perPage?: number;
  minPrice?: number | null;
  maxPrice?: number | null;
  inStock?: boolean;
  onSale?: boolean;
};

const SORTS: Record<string, string> = {
  price_asc: "min_price asc, p.name asc",
  price_desc: "min_price desc, p.name asc",
  name: "p.name asc",
  newest: "p.created_at desc, p.id desc",
  // Packs sold in orders that were actually paid; unpaid or cancelled orders don't count
  best: "sold desc, p.name asc",
};

export async function listProducts(query: ProductQuery) {
  // What the shopper is browsing (category, search) before narrowing it down with filters
  const scope: string[] = [LISTED];
  const params: unknown[] = [];
  const param = (value: unknown) => `$${params.push(value)}`;

  if (query.category) scope.push(`c.slug = ${param(query.category)}`);
  if (query.q?.trim()) scope.push(`p.name ilike ${param(`%${query.q.trim().replace(/[\\%_]/g, (m) => `\\${m}`)}%`)}`);
  if (query.exclude) scope.push(`p.id <> ${param(query.exclude)}`);

  const inStock = "exists (select 1 from product_variants sv where sv.product_id = p.id and sv.is_active and sv.stock > 0)";
  const onSale =
    "exists (select 1 from product_variants pv where pv.product_id = p.id and pv.is_active and pv.compare_at_price > pv.price)";

  const filters = [...scope];
  if (query.minPrice || query.maxPrice) {
    const range = [query.minPrice ? `rv.price >= ${param(query.minPrice)}` : null, query.maxPrice ? `rv.price <= ${param(query.maxPrice)}` : null]
      .filter(Boolean)
      .join(" and ");
    filters.push(`exists (select 1 from product_variants rv where rv.product_id = p.id and rv.is_active and ${range})`);
  }
  if (query.inStock) filters.push(inStock);
  if (query.onSale) filters.push(onSale);

  const from = "from products p join categories c on c.id = p.category_id";
  const where = (clauses: string[]) => `where ${clauses.join(" and ")}`;
  const perPage = Math.min(60, Math.max(1, query.perPage ?? 24));
  const page = Math.max(1, query.page ?? 1);

  const [{ total }] = await sql<{ total: number }>(`select count(*) as total ${from} ${where(filters)}`, params);
  const rows = await sql<ProductRow>(
    `select p.id, p.slug, p.name, p.description, p.images, '[]'::jsonb as specs, p.category_id,
            c.name as category_name, c.slug as category_slug,
            (select min(price) from product_variants mv where mv.product_id = p.id and mv.is_active) as min_price,
            (select coalesce(sum(i.quantity), 0) from order_items i join orders o on o.id = i.order_id
              where i.product_id = p.id and o.status in ('paid', 'shipped', 'completed')) as sold
       ${from} ${where(filters)}
      order by ${SORTS[query.sort ?? ""] ?? "p.name asc"}
      limit ${perPage} offset ${(page - 1) * perPage}`,
    params,
  );

  const [range] = await sql<{ low: number | null; high: number | null }>(
    `select min(v.price) as low, max(v.price) as high from product_variants v
      where v.is_active and v.product_id in (select p.id ${from} ${where(scope)})`,
    params.slice(0, countParams(scope)),
  );
  const [counts] = await sql<{ in_stock: number; on_sale: number }>(
    `select count(*) filter (where ${inStock}) as in_stock, count(*) filter (where ${onSale}) as on_sale ${from} ${where(scope)}`,
    params.slice(0, countParams(scope)),
  );

  return {
    data: await withVariants(rows, false),
    meta: {
      current_page: page,
      last_page: Math.max(1, Math.ceil(total / perPage)),
      total,
      // For a filter column: slider bounds and how many products each switch would leave
      price_range: range.low !== null ? { min: range.low, max: range.high! } : null,
      counts: { in_stock: counts.in_stock, on_sale: counts.on_sale },
    },
  };
}

/** The scope's placeholders come first in `params`; filters only add after them. */
const countParams = (clauses: string[]) => clauses.join(" ").match(/\$\d+/g)?.length ?? 0;

export async function productBySlug(slug: string) {
  const [row] = await sql<ProductRow>(
    `select p.id, p.slug, p.name, p.description, p.images, p.specs, p.category_id, c.name as category_name, c.slug as category_slug
       from products p join categories c on c.id = p.category_id where p.slug = $1 and ${LISTED}`,
    [slug],
  );
  if (!row) return null;

  // Neighbours in the same category, in catalog order, for the ‹ › links on the product page
  const siblings = await sql<{ id: number; slug: string; name: string }>(
    `select p.id, p.slug, p.name from products p where p.category_id = $1 and ${LISTED} order by p.name`,
    [row.category_id],
  );
  const at = siblings.findIndex((s) => s.id === row.id);
  const link = (s?: { slug: string; name: string }) => (s ? { slug: s.slug, name: s.name } : null);

  const [product] = await withVariants([row], true);
  return { ...product, previous: link(siblings[at - 1]), next: link(siblings[at + 1]) };
}

/** Current price and stock of the variants in a shopper's cart: ?ids=3,7,12 */
export async function variantsByIds(ids: number[]) {
  const rows = await sql<{
    id: number;
    name: string;
    price: number;
    stock: number;
    available: boolean;
    product_name: string;
    product_slug: string;
    images: string[];
  }>(
    `select v.id, v.name, v.price, v.stock, (v.is_active and p.is_active) as available,
            p.name as product_name, p.slug as product_slug, p.images
       from product_variants v join products p on p.id = v.product_id where v.id = any($1::int[])`,
    [ids],
  );
  return rows.map((v) => ({
    id: v.id,
    name: v.name,
    price: v.price,
    stock: v.stock,
    available: v.available,
    product: { name: v.product_name, slug: v.product_slug, image: v.images[0] ?? null },
  }));
}

async function withVariants(rows: ProductRow[], full: boolean) {
  const variants = rows.length
    ? await sql<VariantRow>(
        `select id, product_id, name, price, compare_at_price, weight_grams, stock from product_variants
          where product_id = any($1::int[]) and is_active order by sort_order, id`,
        [rows.map((r) => r.id)],
      )
    : [];

  return rows.map((p) => {
    const own = variants.filter((v) => v.product_id === p.id);
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      description: full ? p.description : limit(p.description, 120),
      category: { name: p.category_name, slug: p.category_slug },
      images: p.images,
      specs: full ? p.specs.map((s) => ({ label: s.label ?? "", value: s.value ?? "" })) : [],
      price_from: own.length ? Math.min(...own.map((v) => v.price)) : null,
      in_stock: own.some((v) => v.stock > 0),
      variants: own.map((v) => ({
        id: v.id,
        name: v.name,
        price: v.price,
        compare_at_price: v.compare_at_price !== null && v.compare_at_price > v.price ? v.compare_at_price : null,
        weight_grams: v.weight_grams,
        stock: v.stock,
      })),
    };
  });
}

const limit = (text: string | null, max: number) => (text && text.length > max ? `${text.slice(0, max).trimEnd()}...` : text);

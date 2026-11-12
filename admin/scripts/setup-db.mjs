// Creates the tables, loads the sample catalog into an empty database and makes the first admin.
// Safe to re-run.
//
//   npm run db:setup                                   local embedded Postgres in .pglite/
//   DATABASE_URL=postgres://... ADMIN_EMAIL=you@x.com ADMIN_PASSWORD=... npm run db:setup
//
// On Vercel it runs before every build (vercel.json), where the database URL is available.
import { readFileSync } from "node:fs";
import { randomBytes, scryptSync } from "node:crypto";
import { DEMO_CATALOG, slugify } from "../db/demo-catalog.mjs";

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;

let exec, query, close;
if (url) {
  const { default: pg } = await import("pg");
  // Same as databaseUrl() in src/lib/db.ts: libpq meaning for sslmode=require.
  const parsed = new URL(url);
  if (parsed.searchParams.has("sslmode") && !parsed.searchParams.has("uselibpqcompat")) parsed.searchParams.set("uselibpqcompat", "true");
  const client = new pg.Client({ connectionString: parsed.toString() });
  await client.connect();
  exec = (sql) => client.query(sql);
  query = async (sql, params) => (await client.query(sql, params)).rows;
  close = () => client.end();
} else {
  const { PGlite } = await import("@electric-sql/pglite");
  const db = new PGlite(process.env.PGLITE_DIR ?? ".pglite");
  exec = (sql) => db.exec(sql);
  query = async (sql, params) => (await db.query(sql, params)).rows;
  close = () => db.close();
}

await exec(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"));

// Sample catalog only for an empty database, so re-runs (every Vercel deploy) never bring back deleted products.
const [{ n }] = await query("select count(*)::int as n from categories");
if (n === 0 && process.env.SKIP_SEED !== "1") {
  for (const [c, [categoryName, products]] of DEMO_CATALOG.entries()) {
    const [category] = await query("insert into categories (name, slug, sort_order) values ($1, $2, $3) returning id", [
      categoryName,
      slugify(categoryName),
      c,
    ]);
    for (const [name, description, specs, variants] of products) {
      const [product] = await query(
        "insert into products (category_id, name, slug, description, specs) values ($1, $2, $3, $4, $5) returning id",
        [category.id, name, slugify(name), description, JSON.stringify(specs)],
      );
      for (const [i, [variantName, price, grams, stock, wasPrice]] of variants.entries()) {
        await query(
          "insert into product_variants (product_id, name, price, compare_at_price, weight_grams, stock, sort_order) values ($1, $2, $3, $4, $5, $6, $7)",
          [product.id, variantName, price, wasPrice ?? null, grams, stock, i],
        );
      }
    }
  }
  console.log("Sample catalog loaded.");
}

// Same format as hashPassword() in src/lib/auth.ts.
const hash = (password) => {
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
};

const email = process.env.ADMIN_EMAIL ?? (url ? null : "admin@masempo.test");
const password = process.env.ADMIN_PASSWORD ?? (url ? null : "password");
if (email && password) {
  const created = await query(
    "insert into admins (name, email, password_hash) values ($1, $2, $3) on conflict (email) do nothing returning id",
    [process.env.ADMIN_NAME ?? "Admin Masempo", email.toLowerCase(), hash(password)],
  );
  console.log(created.length ? `Admin ${email} created.` : `Admin ${email} already exists.`);
} else {
  console.log("No admin created: set ADMIN_EMAIL and ADMIN_PASSWORD to add one.");
}

await close();
console.log("Database ready.");

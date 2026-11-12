import pg from "pg";

export type Row = Record<string, unknown>;
export type Sql = <T = Row>(text: string, params?: unknown[]) => Promise<T[]>;
type Driver = { sql: Sql; exec: (text: string) => Promise<void>; tx: <T>(fn: (sql: Sql) => Promise<T>) => Promise<T>; close: () => Promise<void> };
type Queryable = { query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }> };

const wrap = (q: Queryable): Sql => async (text, params) => (await q.query(text, params)).rows as never;

// Counts and sums arrive as int8; every amount here fits in a JS number. Dates stay "YYYY-MM-DD".
const INT8 = 20;
const DATE = 1082;

/**
 * DATABASE_URL, or POSTGRES_URL as set by Vercel's Postgres integrations (Neon). Hosted URLs carry
 * sslmode=require, meaning "encrypted" in libpq; pg would also verify the certificate chain, which
 * managed poolers fail, so ask pg for libpq behaviour. (Same as Karueng.)
 */
export function databaseUrl() {
  const raw = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!raw) return null;
  const url = new URL(raw);
  if (url.searchParams.has("sslmode") && !url.searchParams.has("uselibpqcompat")) url.searchParams.set("uselibpqcompat", "true");
  return url.toString();
}

async function connect(): Promise<Driver> {
  const url = databaseUrl();
  if (url) {
    pg.types.setTypeParser(INT8, Number);
    pg.types.setTypeParser(DATE, (v: string) => v);
    const pool = new pg.Pool({ connectionString: url, max: 5 });
    return {
      sql: wrap(pool),
      exec: async (text) => {
        await pool.query(text);
      },
      tx: async (fn) => {
        const client = await pool.connect();
        try {
          await client.query("begin");
          const result = await fn(wrap(client));
          await client.query("commit");
          return result;
        } catch (err) {
          await client.query("rollback");
          throw err;
        } finally {
          client.release();
        }
      },
      close: () => pool.end(),
    };
  }

  // Serverless disks are temporary; a local database there would silently lose orders.
  if (process.env.VERCEL) throw new Error("DATABASE_URL (or POSTGRES_URL) is not set");

  // Without DATABASE_URL: an embedded Postgres in .pglite/ (one process at a time), for local dev and tests.
  const { PGlite, types } = await import("@electric-sql/pglite");
  const db = new PGlite(process.env.PGLITE_DIR ?? ".pglite", {
    parsers: { [types.INT8]: Number, [types.DATE]: (v: string) => v },
  });
  return {
    sql: wrap(db as Queryable),
    exec: async (text) => {
      await db.exec(text);
    },
    tx: (fn) => db.transaction((t) => fn(wrap(t as Queryable))),
    close: () => db.close(),
  };
}

// One connection per server process, also across dev hot reloads.
const g = globalThis as { __masempoDb?: Promise<Driver> };
const driver = () => (g.__masempoDb ??= connect());

export const sql: Sql = async (text, params) => (await driver()).sql(text, params);
/** Runs several statements at once (schema files); no parameters. */
export const exec = async (text: string) => (await driver()).exec(text);
export const tx = async <T>(fn: (sql: Sql) => Promise<T>) => (await driver()).tx(fn);

/** Closes the connection (scripts and tests); the next query opens a new one. */
export async function closeDb() {
  const current = g.__masempoDb;
  g.__masempoDb = undefined;
  if (current) await (await current).close();
}

/** True when a query failed on a unique constraint. */
export const isUniqueViolation = (err: unknown) => (err as { code?: string })?.code === "23505";

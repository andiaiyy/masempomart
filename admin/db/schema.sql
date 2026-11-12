-- Masempo Mart database. Safe to run again: every statement only adds what is missing.
-- Applied by scripts/setup-db.mjs (locally `npm run db:setup`, on Vercel before every build).

create table if not exists admins (
  id serial primary key,
  name text not null,
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

-- Tabs on the shop's shelf, in sort_order
create table if not exists categories (
  id serial primary key,
  name text not null,
  slug text not null unique,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists products (
  id serial primary key,
  category_id int not null references categories (id) on delete restrict,
  name text not null,
  slug text not null unique,
  description text,
  -- Photo URLs; the first is the one on the product card
  images jsonb not null default '[]',
  -- [{label, value}] in display order, shown in the product page's Detail tab
  specs jsonb not null default '[]',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- What the shopper actually buys: one flavor / pack size of a product
create table if not exists product_variants (
  id serial primary key,
  product_id int not null references products (id) on delete cascade,
  name text not null,
  price int not null check (price >= 0),
  -- Price before a promo, shown struck through; null when not on sale
  compare_at_price int check (compare_at_price is null or compare_at_price > 0),
  weight_grams int not null check (weight_grams > 0),
  -- Packs available to sell. Placing an order takes packs out; they come back if it isn't paid.
  stock int not null default 0 check (stock >= 0),
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists product_variants_product_idx on product_variants (product_id);

-- Stock log: deliveries (positive) and write-offs (negative). Rows are never edited.
create table if not exists restocks (
  id serial primary key,
  product_variant_id int not null references product_variants (id) on delete cascade,
  admin_id int references admins (id) on delete set null,
  quantity int not null check (quantity <> 0),
  cost_price int,
  expires_on date,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists orders (
  id serial primary key,
  -- Shown on the receipt; also the key to the public receipt page
  code text not null unique,
  customer_name text not null,
  email text not null,
  phone text not null,
  address text not null,
  province text not null,
  city text not null,
  district text not null,
  subdistrict text,
  postal_code text not null,
  -- RajaOngkir destination the shipping was priced to
  destination_id int,
  note text,
  weight_grams int not null,
  subtotal int not null,
  shipping int not null,
  shipping_courier text,
  shipping_service text,
  shipping_etd text,
  -- 1-999 rupiah in the total so no two unpaid orders ask for the same amount
  unique_code int not null default 0,
  total int not null,
  -- pending -> paid -> shipped -> completed, or pending -> expired / cancelled
  status text not null default 'pending',
  payment_type text,
  -- Reserved packs go back on the shelf after this
  expires_at timestamptz,
  paid_at timestamptz,
  courier text,
  tracking_number text,
  shipped_at timestamptz,
  -- Something an admin has to sort out by hand, e.g. paid after the hold ran out
  issue text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_status_idx on orders (status);
create index if not exists orders_expires_idx on orders (expires_at) where status = 'pending';

-- Names and prices are copied, so editing a product never rewrites old orders
create table if not exists order_items (
  id serial primary key,
  order_id int not null references orders (id) on delete cascade,
  product_id int references products (id) on delete set null,
  product_variant_id int references product_variants (id) on delete set null,
  name text not null,
  variant_name text not null,
  image text,
  price int not null,
  weight_grams int not null,
  quantity int not null check (quantity > 0)
);
create index if not exists order_items_order_idx on order_items (order_id);

-- Shop settings (bank accounts, WhatsApp, Instagram, new-order email), edited in the admin
create table if not exists settings (
  key text primary key,
  value jsonb,
  updated_at timestamptz not null default now()
);

-- RajaOngkir answers, so shoppers clicking around don't use up the API quota
create table if not exists api_cache (
  key text primary key,
  value jsonb not null,
  expires_at timestamptz not null
);

/** Shapes returned by the admin's API (admin/src/app/api). */

export type Variant = {
  id: number;
  name: string;
  price: number;
  /** Price before the promo; null when the variant isn't on sale */
  compare_at_price: number | null;
  weight_grams: number;
  stock: number;
};

export type Product = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  category: { name: string; slug: string };
  images: string[];
  /** Filled on the product page only */
  specs: { label: string; value: string }[];
  price_from: number | null;
  in_stock: boolean;
  variants: Variant[];
};

/** GET /api/products/{slug}: the product plus its neighbours in the category */
export type ProductDetail = Product & {
  previous: { slug: string; name: string } | null;
  next: { slug: string; name: string } | null;
};

export type Category = {
  id: number;
  name: string;
  slug: string;
  product_count: number;
};

export type ProductPage = {
  data: Product[];
  meta: {
    current_page: number;
    last_page: number;
    total: number;
    /** Cheapest and dearest variant in this category/search, before price and other filters */
    price_range: { min: number; max: number } | null;
    /** Products in this category/search that are in stock / on promo */
    counts: { in_stock: number; on_sale: number };
  };
};

export type BankAccount = { bank: string; account_number: string; account_name: string };

/** A kecamatan/kelurahan from RajaOngkir's destination search */
export type Destination = {
  id: number;
  label: string;
  province: string;
  city: string;
  district: string;
  subdistrict: string;
  postal_code: string;
};

/** One courier service to the shopper's destination, priced by RajaOngkir */
export type ShippingOption = {
  courier: string;
  courier_name: string;
  service: string;
  description: string;
  cost: number;
  etd: string;
};

export type OrderStatus = "pending" | "paid" | "shipped" | "completed" | "failed" | "expired" | "cancelled";

export type Order = {
  code: string;
  status: OrderStatus;
  /** Where to transfer; only while the order can still be paid */
  payment: { bank_accounts: BankAccount[]; whatsapp_url: string | null; pay_before: string } | null;
  payment_type: string | null;
  customer_name: string;
  city: string;
  subtotal: number;
  shipping: number;
  total: number;
  weight_grams: number;
  created_at: string;
  paid_at: string | null;
  courier: string | null;
  tracking_number: string | null;
  shipping_courier: string | null;
  shipping_service: string | null;
  shipping_etd: string | null;
  /** 1–999 rupiah added to the total so the transfer matches this order */
  unique_code: number;
  items: { name: string; variant_name: string; image: string | null; product_slug: string | null; price: number; quantity: number }[];
};

/** The shop's contact links, set in the admin's Shop settings */
export type ShopContact = { whatsapp_url: string | null; instagram_url: string | null; instagram_handle: string | null };

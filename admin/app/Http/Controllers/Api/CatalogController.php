<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Services\Orders;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/** Public, read-only catalog. Data is managed in the Filament panel. */
class CatalogController extends Controller
{
    public function categories()
    {
        $categories = Category::query()
            ->withCount(['products' => fn ($q) => $q->listed()])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return response()->json($categories->map(fn (Category $c) => [
            'id' => $c->id,
            'name' => $c->name,
            'slug' => $c->slug,
            'image' => $c->imageUrl(),
            'product_count' => $c->products_count,
        ]));
    }

    public function index(Request $request, Orders $orders)
    {
        // Without a scheduler running, abandoned orders would hold their packs forever
        $orders->expireStale();

        // What the shopper is browsing (category, search) before narrowing it down with filters
        $scope = Product::listed()
            ->when($request->query('category'), fn ($q, $slug) => $q->whereHas('category', fn ($c) => $c->where('slug', $slug)))
            ->when($request->boolean('featured'), fn ($q) => $q->where('is_featured', true))
            ->when(trim((string) $request->query('q')), fn ($q, $term) => $q->where('name', 'like', '%'.addcslashes($term, '%_\\').'%'))
            ->when($request->query('exclude'), fn ($q, $id) => $q->whereKeyNot($id));

        $min = $request->integer('min_price') ?: null;
        $max = $request->integer('max_price') ?: null;
        $products = (clone $scope)
            ->with(['category', 'variants' => self::variantOrder(...)])
            // A product matches when one of its variants on sale is in the price range
            ->when($min || $max, fn ($q) => $q->whereHas('variants', fn ($v) => $v->where('is_active', true)
                ->when($min, fn ($v) => $v->where('price', '>=', $min))
                ->when($max, fn ($v) => $v->where('price', '<=', $max))))
            ->when($request->boolean('in_stock'), fn ($q) => $q->whereHas('variants', self::inStock(...)))
            ->when($request->boolean('on_sale'), fn ($q) => $q->whereHas('variants', self::onSale(...)))
            ->withMin(['variants as min_price' => fn ($v) => $v->where('is_active', true)], 'price');

        match ($request->query('sort')) {
            'price_asc' => $products->orderBy('min_price')->orderBy('name'),
            'price_desc' => $products->orderByDesc('min_price')->orderBy('name'),
            'name' => $products->orderBy('name'),
            'newest' => $products->orderByDesc('created_at')->orderByDesc('id'),
            // Packs sold in orders that were actually paid; unpaid or cancelled orders don't count
            'best' => $products->orderByDesc(
                OrderItem::selectRaw('coalesce(sum(quantity), 0)')
                    ->whereColumn('order_items.product_id', 'products.id')
                    ->whereHas('order', fn ($o) => $o->whereIn('status', ['paid', 'shipped', 'completed']))
            )->orderBy('name'),
            default => $products->orderByDesc('is_featured')->orderBy('name'),
        };
        $page = $products->paginate(min(60, max(1, $request->integer('per_page', 24))));

        $range = ProductVariant::where('is_active', true)
            ->whereIn('product_id', (clone $scope)->select('products.id'))
            ->selectRaw('min(price) as low, max(price) as high')
            ->first();

        return response()->json([
            'data' => $page->getCollection()->map(fn (Product $p) => $this->product($p))->values(),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'total' => $page->total(),
                // For the filter column: slider bounds and how many products each switch would leave
                'price_range' => $range?->low !== null ? ['min' => (int) $range->low, 'max' => (int) $range->high] : null,
                'counts' => [
                    'in_stock' => (clone $scope)->whereHas('variants', self::inStock(...))->count(),
                    'on_sale' => (clone $scope)->whereHas('variants', self::onSale(...))->count(),
                ],
            ],
        ]);
    }

    private static function inStock($variants): void
    {
        $variants->where('is_active', true)->where('stock', '>', 0);
    }

    private static function onSale($variants): void
    {
        $variants->where('is_active', true)->whereNotNull('compare_at_price')->whereColumn('compare_at_price', '>', 'price');
    }

    public function show(string $slug, Orders $orders)
    {
        $orders->expireStale();

        $product = Product::listed()->with(['category', 'variants' => self::variantOrder(...)])->where('slug', $slug)->first();
        if (! $product) {
            return response()->json(['message' => 'Produk tidak ditemukan.'], 404);
        }

        // Neighbours in the same category, in catalog order, for the ‹ › links on the product page
        $siblings = Product::listed()->where('category_id', $product->category_id)->orderBy('name')->get(['id', 'slug', 'name']);
        $at = $siblings->search(fn (Product $p) => $p->id === $product->id);
        $link = fn (?Product $p) => $p ? ['slug' => $p->slug, 'name' => $p->name] : null;

        return response()->json($this->product($product, full: true) + [
            'previous' => $link($at > 0 ? $siblings[$at - 1] : null),
            'next' => $link($siblings[$at + 1] ?? null),
        ]);
    }

    /** Current price and stock of the variants in a shopper's cart: ?ids=3,7,12 */
    public function variants(Request $request, Orders $orders)
    {
        $orders->expireStale();

        $ids = collect(explode(',', (string) $request->query('ids')))->map(fn ($id) => (int) $id)->filter()->unique()->take(50);
        $variants = ProductVariant::with('product')->whereIn('id', $ids)->get();

        return response()->json($variants->map(fn (ProductVariant $v) => [
            'id' => $v->id,
            'name' => $v->name,
            'price' => $v->price,
            'stock' => $v->stock,
            'available' => $v->is_active && $v->product->is_active,
            'product' => [
                'name' => $v->product->name,
                'slug' => $v->product->slug,
                'image' => $v->product->imageUrls()[0] ?? null,
            ],
        ])->values());
    }

    private static function variantOrder($query): void
    {
        $query->orderBy('sort_order')->orderBy('id');
    }

    private function product(Product $p, bool $full = false): array
    {
        $variants = $p->variants->where('is_active', true)->values();

        return [
            'id' => $p->id,
            'slug' => $p->slug,
            'name' => $p->name,
            'description' => $full ? $p->description : Str::limit((string) $p->description, 120),
            'category' => ['name' => $p->category->name, 'slug' => $p->category->slug],
            'images' => $p->imageUrls(),
            'specs' => $full ? collect($p->specs ?? [])->map(fn ($s) => ['label' => $s['label'] ?? '', 'value' => $s['value'] ?? ''])->values()->all() : [],
            'is_featured' => $p->is_featured,
            'price_from' => $variants->min('price'),
            'in_stock' => $variants->sum('stock') > 0,
            'variants' => $variants->map(fn ($v) => [
                'id' => $v->id,
                'name' => $v->name,
                'price' => $v->price,
                'compare_at_price' => $v->compare_at_price > $v->price ? $v->compare_at_price : null,
                'weight_grams' => $v->weight_grams,
                'stock' => $v->stock,
            ])->all(),
        ];
    }
}

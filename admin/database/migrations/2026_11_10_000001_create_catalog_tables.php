<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Money is whole Rupiah, weight is grams. */
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('image')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained()->restrictOnDelete();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->json('images')->nullable();
            // [{label, value}] in display order, e.g. Asal / Makassar. A list, not an object,
            // because MySQL reorders JSON object keys.
            $table->json('specs')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('is_featured')->default(false);
            $table->timestamps();
        });

        // What the shopper actually buys: one flavor / pack size of a product.
        Schema::create('product_variants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->unsignedInteger('price');
            // Price before a promo, shown struck through; null when not on sale
            $table->unsignedInteger('compare_at_price')->nullable();
            $table->unsignedInteger('weight_grams');
            // Packs available to sell. Checkout takes packs out when the order is placed
            // and puts them back if the payment fails or expires.
            $table->unsignedInteger('stock')->default(0);
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        // Stock log: deliveries (positive) and write-offs (negative). Rows are never edited.
        Schema::create('restocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_variant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->integer('quantity');
            $table->unsignedInteger('cost_price')->nullable();
            $table->date('expires_on')->nullable();
            $table->string('note')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('restocks');
        Schema::dropIfExists('product_variants');
        Schema::dropIfExists('products');
        Schema::dropIfExists('categories');
    }
};

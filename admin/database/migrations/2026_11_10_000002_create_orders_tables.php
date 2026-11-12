<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            // Shown on the receipt; also the key to the public receipt page
            $table->string('code')->unique();
            $table->string('customer_name');
            $table->string('email');
            $table->string('phone', 30);
            $table->text('address');
            $table->string('province');
            $table->string('city');
            $table->string('district');
            $table->string('postal_code', 10);
            $table->string('note', 200)->nullable();
            $table->unsignedInteger('weight_grams');
            $table->unsignedInteger('subtotal');
            $table->unsignedInteger('shipping');
            $table->unsignedInteger('total');
            // pending -> paid -> shipped -> completed, or pending -> failed / expired / cancelled
            $table->string('status')->default('pending')->index();
            $table->string('payment_type')->nullable();
            $table->string('snap_token')->nullable();
            // Reserved stock goes back on the shelf after this
            $table->timestamp('expires_at')->nullable()->index();
            $table->timestamp('paid_at')->nullable();
            $table->string('courier')->nullable();
            $table->string('tracking_number')->nullable();
            $table->timestamp('shipped_at')->nullable();
            // Something an admin has to sort out by hand, e.g. paid after the hold ran out
            $table->string('issue')->nullable();
            $table->timestamps();
        });

        // Names and prices are copied, so editing a product never rewrites old orders.
        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('product_variant_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('variant_name');
            $table->string('image')->nullable();
            $table->unsignedInteger('price');
            $table->unsignedInteger('weight_grams');
            $table->unsignedSmallInteger('quantity');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
    }
};

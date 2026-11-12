<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Payment moves from Midtrans to bank transfer (no gateway fee): the shopper transfers to one of
 * the shop's accounts and sends the proof over WhatsApp, an admin marks the order paid.
 * The accounts and the WhatsApp number live in `settings`, edited on the admin "Payment details" page.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->json('value')->nullable();
            $table->timestamps();
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('snap_token');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('snap_token')->nullable();
        });
        Schema::dropIfExists('settings');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Shipping moves from flat per-kg rates to RajaOngkir: the shopper picks their kecamatan/kelurahan
 * (a RajaOngkir destination id) and a courier service, which the order keeps.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->unsignedInteger('destination_id')->nullable()->after('postal_code');
            $table->string('subdistrict')->nullable()->after('district');
            $table->string('shipping_courier', 20)->nullable()->after('shipping');
            $table->string('shipping_service', 60)->nullable()->after('shipping_courier');
            $table->string('shipping_etd', 30)->nullable()->after('shipping_service');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['destination_id', 'subdistrict', 'shipping_courier', 'shipping_service', 'shipping_etd']);
        });
    }
};

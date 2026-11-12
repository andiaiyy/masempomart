<?php

namespace App\Filament\Widgets;

use App\Filament\Resources\OrderResource;
use App\Models\Order;
use App\Models\ProductVariant;
use Filament\Widgets\StatsOverviewWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class ShopStats extends StatsOverviewWidget
{
    protected static ?int $sort = 1;

    protected function getStats(): array
    {
        $ordersWith = fn (string $status) => OrderResource::getUrl('index', ['tableFilters' => ['status' => ['value' => $status]]]);
        $sales = Order::whereIn('status', ['paid', 'shipped', 'completed'])->where('paid_at', '>=', now()->startOfMonth())->sum('total');
        $low = config('shop.low_stock');

        return [
            Stat::make('To ship', Order::where('status', 'paid')->count())
                ->description('Paid, waiting to be packed')
                ->url($ordersWith('paid')),
            Stat::make('Awaiting payment', Order::where('status', 'pending')->count())
                ->description('Packs reserved until paid or expired')
                ->url($ordersWith('pending')),
            Stat::make('Sales this month', 'Rp '.number_format($sales, 0, ',', '.'))
                ->description('Paid orders since '.now()->startOfMonth()->format('j M')),
            Stat::make('Low stock', ProductVariant::where('is_active', true)->where('stock', '<=', $low)->count())
                ->description("Variants at {$low} packs or fewer"),
        ];
    }
}

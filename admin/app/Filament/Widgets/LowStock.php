<?php

namespace App\Filament\Widgets;

use App\Filament\Resources\RestockResource;
use App\Models\ProductVariant;
use Filament\Tables\Actions\Action;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Filament\Widgets\TableWidget;

class LowStock extends TableWidget
{
    protected static ?int $sort = 2;

    protected int|string|array $columnSpan = 'full';

    protected static ?string $heading = 'Low stock';

    public function table(Table $table): Table
    {
        return $table
            ->query(
                ProductVariant::query()
                    ->with('product')
                    ->where('is_active', true)
                    ->where('stock', '<=', config('shop.low_stock'))
                    ->orderBy('stock')
            )
            ->columns([
                TextColumn::make('product.name')->label('Product'),
                TextColumn::make('name')->label('Variant'),
                TextColumn::make('stock')->badge()->color(fn (int $state) => $state === 0 ? 'danger' : 'warning'),
            ])
            ->actions([
                Action::make('restock')
                    ->icon('heroicon-o-truck')
                    ->url(fn (ProductVariant $record) => RestockResource::getUrl('create', ['variant' => $record->id])),
            ])
            ->paginated([5, 10, 25])
            ->emptyStateHeading('Everything is well stocked')
            ->emptyStateIcon('heroicon-o-check-circle');
    }
}

<?php

namespace App\Filament\Resources;

use App\Filament\Resources\OrderResource\Pages;
use App\Models\Order;
use App\Services\RajaOngkir;
use Filament\Infolists\Components\RepeatableEntry;
use Filament\Infolists\Components\Section;
use Filament\Infolists\Components\TextEntry;
use Filament\Infolists\Infolist;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;

/** Orders come from the shop; an admin marks them paid after checking the transfer, then shipped. */
class OrderResource extends Resource
{
    protected static ?string $model = Order::class;

    protected static ?string $navigationIcon = 'heroicon-o-shopping-bag';

    protected static ?string $navigationGroup = 'Sales';

    public const STATUS_COLORS = [
        'pending' => 'warning',
        'paid' => 'info',
        'shipped' => 'primary',
        'completed' => 'success',
        'failed' => 'danger',
        'expired' => 'gray',
        'cancelled' => 'gray',
    ];

    public static function canCreate(): bool
    {
        return false;
    }

    /** Paid orders waiting to be packed and shipped. */
    public static function getNavigationBadge(): ?string
    {
        $toShip = Order::where('status', 'paid')->count();

        return $toShip ? (string) $toShip : null;
    }

    public static function table(Table $table): Table
    {
        return $table
            ->defaultSort('created_at', 'desc')
            ->columns([
                TextColumn::make('code')->searchable()->copyable(),
                TextColumn::make('customer_name')->label('Customer')->searchable(),
                TextColumn::make('city')->description(fn (Order $record) => $record->province),
                TextColumn::make('total')->money('IDR', locale: 'id')->sortable(),
                TextColumn::make('status')->badge()->color(fn (string $state) => self::STATUS_COLORS[$state] ?? 'gray'),
                IconColumn::make('issue')
                    ->label('')
                    ->icon(fn ($state) => $state ? 'heroicon-o-exclamation-triangle' : null)
                    ->color('danger')
                    ->tooltip(fn (Order $record) => $record->issue),
                TextColumn::make('created_at')->dateTime('d M Y H:i')->sortable(),
            ])
            ->filters([
                SelectFilter::make('status')->options(array_combine(Order::STATUSES, array_map('ucfirst', Order::STATUSES))),
            ])
            ->actions([
                Tables\Actions\ViewAction::make(),
            ]);
    }

    public static function infolist(Infolist $infolist): Infolist
    {
        return $infolist->schema([
            Section::make('Needs attention')
                ->visible(fn (Order $record) => filled($record->issue))
                ->schema([TextEntry::make('issue')->hiddenLabel()->color('danger')]),
            Section::make('Order')->columns(4)->schema([
                TextEntry::make('code')->copyable(),
                TextEntry::make('status')->badge()->color(fn (string $state) => self::STATUS_COLORS[$state] ?? 'gray'),
                TextEntry::make('payment_type')->label('Paid by')->formatStateUsing(fn (?string $state) => $state === 'bank_transfer' ? 'Bank transfer' : $state)->placeholder('-'),
                TextEntry::make('created_at')->dateTime('d M Y H:i'),
                TextEntry::make('subtotal')->money('IDR', locale: 'id'),
                TextEntry::make('shipping')->money('IDR', locale: 'id'),
                TextEntry::make('shipping_service')
                    ->label('Courier chosen')
                    ->state(fn (Order $record) => $record->shipping_courier
                        ? trim(RajaOngkir::courierName($record->shipping_courier).' '.$record->shipping_service.($record->shipping_etd ? " · {$record->shipping_etd}" : ''))
                        : null)
                    ->placeholder('-'),
                TextEntry::make('total')->money('IDR', locale: 'id'),
                TextEntry::make('weight_grams')->label('Parcel weight')->formatStateUsing(fn (int $state) => number_format($state / 1000, 2, ',', '.').' kg'),
                TextEntry::make('paid_at')->dateTime('d M Y H:i')->placeholder('-'),
                TextEntry::make('expires_at')->label('Reservation ends')->dateTime('d M Y H:i')->visible(fn (Order $record) => $record->status === 'pending'),
                TextEntry::make('courier')->placeholder('-'),
                TextEntry::make('tracking_number')->copyable()->placeholder('-'),
            ]),
            Section::make('Ship to')->columns(3)->schema([
                TextEntry::make('customer_name')->label('Name'),
                TextEntry::make('phone')->label('WhatsApp')->copyable(),
                TextEntry::make('email')->copyable(),
                TextEntry::make('address')->columnSpan(2),
                TextEntry::make('district')->formatStateUsing(fn (Order $record) => trim(($record->subdistrict ? "{$record->subdistrict}, " : '').$record->district)),
                TextEntry::make('city')->formatStateUsing(fn (Order $record) => "{$record->city} {$record->postal_code}"),
                TextEntry::make('province'),
                TextEntry::make('note')->label('Note for courier')->placeholder('-'),
            ]),
            Section::make('Items')->schema([
                RepeatableEntry::make('items')->hiddenLabel()->columns(4)->schema([
                    TextEntry::make('name'),
                    TextEntry::make('variant_name')->label('Variant'),
                    TextEntry::make('quantity'),
                    TextEntry::make('price')->money('IDR', locale: 'id'),
                ]),
            ]),
        ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListOrders::route('/'),
            'view' => Pages\ViewOrder::route('/{record}'),
        ];
    }
}

<?php

namespace App\Filament\Resources;

use App\Filament\Resources\RestockResource\Pages;
use App\Models\ProductVariant;
use App\Models\Restock;
use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Form;
use Filament\Forms\Get;
use Filament\Resources\Resource;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\Filter;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/** Stock log: deliveries in, write-offs out. Entries can't be edited; log a correction instead. */
class RestockResource extends Resource
{
    protected static ?string $model = Restock::class;

    protected static ?string $navigationIcon = 'heroicon-o-truck';

    protected static ?string $navigationGroup = 'Catalog';

    protected static ?int $navigationSort = 3;

    protected static ?string $navigationLabel = 'Restocks';

    public static function canEdit(Model $record): bool
    {
        return false;
    }

    public static function canDelete(Model $record): bool
    {
        return false;
    }

    public static function form(Form $form): Form
    {
        return $form->schema([
            Select::make('product_variant_id')
                ->label('Variant')
                ->options(fn () => ProductVariant::with('product')->get()
                    ->sortBy(fn (ProductVariant $v) => $v->label())
                    ->mapWithKeys(fn (ProductVariant $v) => [$v->id => "{$v->label()} (stock {$v->stock})"]))
                ->searchable()
                ->required()
                // "Restock" on the dashboard's low-stock list opens this form with ?variant=<id>
                ->default(fn () => request()->integer('variant') ?: null)
                ->columnSpanFull(),
            TextInput::make('quantity')
                ->numeric()
                ->integer()
                ->required()
                ->notIn([0])
                ->live(onBlur: true)
                ->helperText('Packs received. Use a negative number to write off damaged or expired packs.'),
            TextInput::make('cost_price')
                ->label('Cost per pack')
                ->numeric()
                ->integer()
                ->minValue(0)
                ->prefix('Rp'),
            DatePicker::make('expires_on')
                ->label('Best before')
                ->native(false),
            TextInput::make('note')
                ->maxLength(255)
                ->required(fn (Get $get) => (int) $get('quantity') < 0)
                ->placeholder('Supplier, invoice number, or why packs were written off'),
        ])->columns(2);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->defaultSort('created_at', 'desc')
            ->columns([
                TextColumn::make('created_at')->label('Logged')->dateTime('d M Y H:i')->sortable(),
                TextColumn::make('variant.product.name')->label('Product')->searchable(),
                TextColumn::make('variant.name')->label('Variant'),
                TextColumn::make('quantity')
                    ->formatStateUsing(fn (int $state) => $state > 0 ? "+{$state}" : (string) $state)
                    ->color(fn (int $state) => $state > 0 ? 'success' : 'danger'),
                TextColumn::make('cost_price')->label('Cost')->money('IDR', locale: 'id')->placeholder('-'),
                TextColumn::make('expires_on')
                    ->label('Best before')
                    ->date('d M Y')
                    ->placeholder('-')
                    ->color(fn ($state) => $state && $state->isBefore(now()->addDays(30)) ? 'warning' : null),
                TextColumn::make('note')->limit(40)->placeholder('-'),
                TextColumn::make('user.name')->label('By')->placeholder('-'),
            ])
            ->filters([
                Filter::make('expiring')
                    ->label('Best before within 30 days')
                    ->query(fn (Builder $q) => $q->whereNotNull('expires_on')->where('expires_on', '<=', now()->addDays(30))),
                Filter::make('write_offs')
                    ->label('Write-offs only')
                    ->query(fn (Builder $q) => $q->where('quantity', '<', 0)),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListRestocks::route('/'),
            'create' => Pages\CreateRestock::route('/create'),
        ];
    }
}

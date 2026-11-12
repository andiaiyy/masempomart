<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ProductResource\Pages;
use App\Models\Product;
use App\Models\ProductVariant;
use Filament\Forms\Components\FileUpload;
use Filament\Forms\Components\Repeater;
use Filament\Forms\Components\Section;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Forms\Form;
use Filament\Forms\Get;
use Filament\Forms\Set;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Columns\ImageColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Columns\ToggleColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use Illuminate\Support\Str;

class ProductResource extends Resource
{
    protected static ?string $model = Product::class;

    protected static ?string $navigationIcon = 'heroicon-o-cube';

    protected static ?string $navigationGroup = 'Catalog';

    protected static ?int $navigationSort = 1;

    public static function form(Form $form): Form
    {
        return $form->schema([
            Section::make()->columns(2)->schema([
                TextInput::make('name')
                    ->required()
                    ->maxLength(120)
                    ->live(onBlur: true)
                    ->afterStateUpdated(fn (Set $set, ?string $state, string $operation) => $operation === 'create' ? $set('slug', Str::slug((string) $state)) : null),
                TextInput::make('slug')
                    ->required()
                    ->maxLength(140)
                    ->alphaDash()
                    ->unique(ignoreRecord: true),
                Select::make('category_id')
                    ->relationship('category', 'name')
                    ->required()
                    ->searchable()
                    ->preload(),
                Toggle::make('is_active')
                    ->label('On sale')
                    ->default(true)
                    ->inline(false),
                Textarea::make('description')
                    ->rows(4)
                    ->helperText('Taste, ingredients, allergens, halal certificate number.')
                    ->columnSpanFull(),
                FileUpload::make('images')
                    ->label('Photos')
                    ->multiple()
                    ->reorderable()
                    ->maxFiles(6)
                    ->image()
                    ->disk(config('shop.media_disk'))
                    ->directory('products')
                    ->helperText('The first photo is the one on the product card.')
                    ->columnSpanFull(),
                Toggle::make('is_featured')
                    ->label('Featured on the home page'),
            ]),

            Section::make('Specifications')
                ->description('Facts shown on the product page. The first four sit next to the price; the rest go under "Info Tambahan".')
                ->collapsible()
                ->schema([
                    Repeater::make('specs')
                        ->hiddenLabel()
                        ->schema([
                            TextInput::make('label')->required()->maxLength(30)->placeholder('Asal'),
                            TextInput::make('value')->required()->maxLength(80)->placeholder('Makassar'),
                        ])
                        ->columns(2)
                        ->reorderable()
                        ->defaultItems(0)
                        ->addActionLabel('Add specification')
                        ->itemLabel(fn (array $state): ?string => $state['label'] ?? null),
                ]),

            Section::make('Variants')
                ->description('One row per flavor or pack size. Shoppers pick one of these.')
                ->schema([
                    Repeater::make('variants')
                        ->relationship()
                        ->orderColumn('sort_order')
                        ->hiddenLabel()
                        ->schema([
                            TextInput::make('name')
                                ->required()
                                ->maxLength(60)
                                ->placeholder('Pedas · 250 g')
                                ->columnSpan(3),
                            TextInput::make('price')
                                ->numeric()
                                ->integer()
                                ->required()
                                ->minValue(0)
                                ->prefix('Rp'),
                            TextInput::make('compare_at_price')
                                ->label('Was price')
                                ->numeric()
                                ->integer()
                                ->prefix('Rp')
                                ->helperText('Only for a promo; shown struck through.')
                                ->rule(fn (Get $get) => function (string $attribute, $value, \Closure $fail) use ($get) {
                                    if (filled($value) && (int) $value <= (int) $get('price')) {
                                        $fail('The was price must be higher than the price.');
                                    }
                                }),
                            TextInput::make('weight_grams')
                                ->label('Weight')
                                ->numeric()
                                ->integer()
                                ->required()
                                ->minValue(1)
                                ->suffix('g')
                                ->helperText('Packed, for shipping.'),
                            // Set once here; after that stock moves through Restocks and orders,
                            // so saving this form can't overwrite packs an order just reserved.
                            TextInput::make('stock')
                                ->label('Starting stock')
                                ->numeric()
                                ->integer()
                                ->minValue(0)
                                ->default(0)
                                ->disabled(fn (?ProductVariant $record) => $record !== null)
                                ->helperText(fn (?ProductVariant $record) => $record ? 'Change it from Restocks.' : null),
                            Toggle::make('is_active')
                                ->label('On sale')
                                ->default(true)
                                ->inline(false),
                        ])
                        ->columns(4)
                        ->minItems(1)
                        ->defaultItems(1)
                        ->addActionLabel('Add variant')
                        ->itemLabel(fn (array $state): ?string => $state['name'] ?? null)
                        ->collapsible(),
                ]),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->defaultSort('name')
            ->columns([
                ImageColumn::make('images')->disk(config('shop.media_disk'))->limit(1)->square()->height(44)->label(''),
                TextColumn::make('name')->searchable()->sortable(),
                TextColumn::make('category.name')->label('Category')->sortable(),
                TextColumn::make('variants_count')->counts('variants')->label('Variants'),
                TextColumn::make('variants_min_price')->min('variants', 'price')->label('From')->money('IDR', locale: 'id'),
                TextColumn::make('variants_sum_stock')
                    ->sum('variants', 'stock')
                    ->label('Stock')
                    ->badge()
                    ->color(fn ($state) => (int) $state === 0 ? 'danger' : ((int) $state <= config('shop.low_stock') ? 'warning' : 'success')),
                ToggleColumn::make('is_active')->label('On sale'),
                ToggleColumn::make('is_featured')->label('Featured'),
            ])
            ->filters([
                SelectFilter::make('category')->relationship('category', 'name'),
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListProducts::route('/'),
            'create' => Pages\CreateProduct::route('/create'),
            'edit' => Pages\EditProduct::route('/{record}/edit'),
        ];
    }
}

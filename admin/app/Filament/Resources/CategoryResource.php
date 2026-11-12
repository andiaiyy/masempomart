<?php

namespace App\Filament\Resources;

use App\Filament\Resources\CategoryResource\Pages;
use App\Models\Category;
use Filament\Forms\Components\FileUpload;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Form;
use Filament\Forms\Set;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Columns\ImageColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Illuminate\Support\Str;

class CategoryResource extends Resource
{
    protected static ?string $model = Category::class;

    protected static ?string $navigationIcon = 'heroicon-o-tag';

    protected static ?string $navigationGroup = 'Catalog';

    protected static ?int $navigationSort = 2;

    public static function form(Form $form): Form
    {
        return $form->schema([
            TextInput::make('name')
                ->required()
                ->maxLength(60)
                ->live(onBlur: true)
                ->afterStateUpdated(fn (Set $set, ?string $state, string $operation) => $operation === 'create' ? $set('slug', Str::slug((string) $state)) : null),
            TextInput::make('slug')
                ->required()
                ->maxLength(80)
                ->alphaDash()
                ->unique(ignoreRecord: true)
                ->helperText('Used in the shop URL, e.g. /?category=keripik'),
            FileUpload::make('image')
                ->image()
                ->disk(config('shop.media_disk'))
                ->directory('categories')
                ->nullable(),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->reorderable('sort_order')
            ->defaultSort('sort_order')
            ->columns([
                ImageColumn::make('image')->disk(config('shop.media_disk'))->square()->height(40),
                TextColumn::make('name')->searchable(),
                TextColumn::make('slug')->color('gray'),
                TextColumn::make('products_count')->counts('products')->label('Products'),
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
                // Products keep their category; empty a category before deleting it
                Tables\Actions\DeleteAction::make()->hidden(fn (Category $record) => $record->products()->exists()),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListCategories::route('/'),
            'create' => Pages\CreateCategory::route('/create'),
            'edit' => Pages\EditCategory::route('/{record}/edit'),
        ];
    }
}

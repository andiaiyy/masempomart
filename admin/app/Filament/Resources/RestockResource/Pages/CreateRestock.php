<?php

namespace App\Filament\Resources\RestockResource\Pages;

use App\Filament\Resources\RestockResource;
use App\Services\Inventory;
use Filament\Resources\Pages\CreateRecord;
use Illuminate\Database\Eloquent\Model;

class CreateRestock extends CreateRecord
{
    protected static string $resource = RestockResource::class;

    protected static bool $canCreateAnother = false;

    // The log entry and the stock change are written together
    protected function handleRecordCreation(array $data): Model
    {
        return app(Inventory::class)->record(
            (int) $data['product_variant_id'],
            (int) $data['quantity'],
            $data,
            auth()->id(),
        );
    }

    protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl('index');
    }
}

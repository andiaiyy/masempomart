<?php

namespace App\Filament\Resources\RestockResource\Pages;

use App\Filament\Resources\RestockResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListRestocks extends ListRecords
{
    protected static string $resource = RestockResource::class;

    protected function getHeaderActions(): array
    {
        return [CreateAction::make()];
    }
}

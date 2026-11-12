<?php

namespace App\Filament\Resources\OrderResource\Pages;

use App\Filament\Resources\OrderResource;
use App\Services\Orders;
use App\Services\RajaOngkir;
use Filament\Actions\Action;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\ViewRecord;

class ViewOrder extends ViewRecord
{
    protected static string $resource = OrderResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Action::make('markPaid')
                ->label('Mark paid')
                ->icon('heroicon-o-banknotes')
                ->color('success')
                ->visible(fn () => in_array($this->record->status, ['pending', 'expired', 'cancelled'], true))
                ->requiresConfirmation()
                ->modalHeading(fn () => 'Transfer of '.number_format($this->record->total, 0, ',', '.').' received?')
                ->modalDescription(fn () => $this->record->status === 'pending'
                    ? 'Check the transfer proof the customer sent on WhatsApp against your bank account first. The receipt turns "Lunas" right away.'
                    : 'The reservation for this order already ended, so its packs are taken from stock again. Anything sold out in the meantime is flagged here for you to restock or refund.')
                ->action(function () {
                    $before = $this->record->status;
                    app(Orders::class)->markPaid($this->record);
                    $this->done($this->record->status === 'paid' && $before !== 'paid', 'Marked as paid. Pack and ship it next.');
                }),

            Action::make('ship')
                ->label('Mark shipped')
                ->icon('heroicon-o-truck')
                ->visible(fn () => $this->record->status === 'paid')
                // The courier the customer chose (and paid for) at checkout
                ->fillForm(fn () => ['courier' => RajaOngkir::courierName($this->record->shipping_courier)])
                ->form([
                    Select::make('courier')->options(self::couriers())->required(),
                    TextInput::make('tracking_number')->label('Tracking number (resi)')->required()->maxLength(60),
                ])
                ->action(fn (array $data) => $this->done(
                    app(Orders::class)->ship($this->record, $data['courier'], $data['tracking_number']),
                    'Marked as shipped. The customer sees the tracking number on their order page.',
                )),

            Action::make('complete')
                ->label('Mark completed')
                ->icon('heroicon-o-check-circle')
                ->color('success')
                ->visible(fn () => $this->record->status === 'shipped')
                ->requiresConfirmation()
                ->action(fn () => $this->done(app(Orders::class)->complete($this->record), 'Order completed.')),

            Action::make('cancel')
                ->label('Cancel order')
                ->icon('heroicon-o-x-circle')
                ->color('danger')
                ->visible(fn () => $this->record->status === 'pending')
                ->requiresConfirmation()
                ->modalDescription('The reserved packs go back in stock. If the customer transfers anyway, you can still mark it paid.')
                ->action(fn () => $this->done(app(Orders::class)->release($this->record, 'cancelled'), 'Order cancelled, packs are back in stock.')),
        ];
    }

    /** @return array<string, string> */
    private static function couriers(): array
    {
        $names = [...array_values(RajaOngkir::COURIERS), 'Other'];

        return array_combine($names, $names);
    }

    private function done(bool $changed, string $message): void
    {
        $changed
            ? Notification::make()->title($message)->success()->send()
            : Notification::make()->title('This order changed in the meantime. Reload the page.')->warning()->send();
    }
}

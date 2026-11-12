<?php

namespace App\Filament\Pages;

use App\Models\Setting;
use App\Services\Payments;
use Filament\Forms\Components\Repeater;
use Filament\Forms\Components\Section;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Concerns\InteractsWithForms;
use Filament\Forms\Contracts\HasForms;
use Filament\Forms\Form;
use Filament\Notifications\Notification;
use Filament\Pages\Page;

/**
 * Where shoppers send their money: the bank accounts printed on every unpaid receipt, and the
 * WhatsApp number the "send transfer proof" button opens.
 */
class PaymentDetails extends Page implements HasForms
{
    use InteractsWithForms;

    protected static ?string $navigationIcon = 'heroicon-o-banknotes';

    protected static ?string $navigationGroup = 'Sales';

    protected static ?int $navigationSort = 90;

    protected static string $view = 'filament.pages.payment-details';

    /** @var array<string, mixed> */
    public ?array $data = [];

    public function mount(): void
    {
        $this->form->fill([
            'bank_accounts' => Setting::read('bank_accounts', []),
            'payment_whatsapp' => Setting::read('payment_whatsapp'),
        ]);
    }

    public function form(Form $form): Form
    {
        return $form->statePath('data')->schema([
            Section::make('Bank accounts')
                ->description('Shown on the receipt of every unpaid order. Shoppers transfer the exact total to one of these.')
                ->schema([
                    Repeater::make('bank_accounts')
                        ->hiddenLabel()
                        ->columns(3)
                        ->reorderable()
                        ->addActionLabel('Add account')
                        ->defaultItems(0)
                        ->schema([
                            TextInput::make('bank')->placeholder('BCA')->required()->maxLength(40),
                            TextInput::make('account_number')
                                ->label('Account number')
                                ->required()
                                ->dehydrateStateUsing(fn (?string $state) => preg_replace('/[\s.-]/', '', (string) $state))
                                ->rule('regex:/^[\d\s.-]{5,30}$/')
                                ->validationMessages(['regex' => 'Digits only (spaces and dashes are fine).']),
                            TextInput::make('account_name')->label('Account holder')->required()->maxLength(80),
                        ]),
                ]),
            Section::make('WhatsApp for transfer proof')
                ->description('The receipt\'s "Kirim bukti transfer" button opens a chat with this number.')
                ->schema([
                    TextInput::make('payment_whatsapp')
                        ->label('WhatsApp number')
                        ->placeholder('0812 3456 7890')
                        ->tel()
                        ->dehydrateStateUsing(fn (?string $state) => Payments::normalizePhone($state) ?: null)
                        ->rule('nullable')
                        ->rule('regex:/^(\+?62|0)[\d\s-]{8,16}$/')
                        ->validationMessages(['regex' => 'Use an Indonesian number, like 0812 3456 7890.']),
                ]),
        ]);
    }

    public function save(): void
    {
        $data = $this->form->getState();
        Setting::write('bank_accounts', array_values($data['bank_accounts'] ?? []));
        Setting::write('payment_whatsapp', $data['payment_whatsapp'] ?? null);

        Notification::make()->title('Payment details saved.')->success()->send();
    }
}

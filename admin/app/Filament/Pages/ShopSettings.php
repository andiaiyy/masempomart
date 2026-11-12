<?php

namespace App\Filament\Pages;

use App\Models\Setting;
use App\Services\ShopSettings as Settings;
use Filament\Forms\Components\Repeater;
use Filament\Forms\Components\Section;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Concerns\InteractsWithForms;
use Filament\Forms\Contracts\HasForms;
use Filament\Forms\Form;
use Filament\Notifications\Notification;
use Filament\Pages\Page;

/**
 * The shop's own details: bank accounts printed on unpaid receipts, the WhatsApp contact (the
 * "send transfer proof" button and the contact links), Instagram, and the new-order email.
 */
class ShopSettings extends Page implements HasForms
{
    use InteractsWithForms;

    protected static ?string $navigationIcon = 'heroicon-o-cog-6-tooth';

    protected static ?string $navigationGroup = 'Sales';

    protected static ?int $navigationSort = 90;

    protected static ?string $title = 'Shop settings';

    protected static string $view = 'filament.pages.shop-settings';

    /** @var array<string, mixed> */
    public ?array $data = [];

    public function mount(Settings $settings): void
    {
        $this->form->fill([
            'bank_accounts' => $settings->accounts(),
            'payment_whatsapp' => $settings->whatsapp(),
            'instagram_url' => $settings->instagramUrl(),
            'order_notify_email' => $settings->notifyEmail(),
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
                            TextInput::make('bank')->placeholder('BNI')->required()->maxLength(40),
                            TextInput::make('account_number')
                                ->label('Account number')
                                ->required()
                                ->dehydrateStateUsing(fn (?string $state) => preg_replace('/[\s.-]/', '', (string) $state))
                                ->rule('regex:/^[\d\s.-]{5,30}$/')
                                ->validationMessages(['regex' => 'Digits only (spaces and dashes are fine).']),
                            TextInput::make('account_name')->label('Account holder')->required()->maxLength(80),
                        ]),
                ]),
            Section::make('Contact')
                ->description('WhatsApp opens from the receipt ("Kirim bukti transfer") and from the contact links at the bottom of the shop.')
                ->columns(2)
                ->schema([
                    TextInput::make('payment_whatsapp')
                        ->label('WhatsApp')
                        ->placeholder('0812 3456 7890 or https://wa.me/…')
                        ->helperText('A number, or a WhatsApp link. With a number the transfer-proof message is filled in for the shopper.')
                        ->dehydrateStateUsing(fn (?string $state) => Settings::normalizeWhatsapp($state))
                        ->rule(fn () => function (string $attribute, mixed $value, \Closure $fail) {
                            if (filled($value) && Settings::normalizeWhatsapp($value) === null) {
                                $fail('Use an Indonesian number like 0812 3456 7890, or a link starting with https://');
                            }
                        }),
                    TextInput::make('instagram_url')
                        ->label('Instagram')
                        ->placeholder('https://www.instagram.com/masempo.mart')
                        ->dehydrateStateUsing(fn (?string $state) => Settings::normalizeInstagram($state))
                        ->rule(fn () => function (string $attribute, mixed $value, \Closure $fail) {
                            if (filled($value) && Settings::normalizeInstagram($value) === null) {
                                $fail('Paste the profile link or the @name.');
                            }
                        }),
                ]),
            Section::make('New-order email')
                ->description('Gets an email for every new order: what was ordered, where it goes, and the amount to look for in the bank account.')
                ->schema([
                    TextInput::make('order_notify_email')->label('Email')->email()->maxLength(150),
                ]),
        ]);
    }

    public function save(): void
    {
        $data = $this->form->getState();
        Setting::write('bank_accounts', array_values($data['bank_accounts'] ?? []));
        Setting::write('payment_whatsapp', $data['payment_whatsapp'] ?? null);
        Setting::write('instagram_url', $data['instagram_url'] ?? null);
        Setting::write('order_notify_email', $data['order_notify_email'] ?: null);

        Notification::make()->title('Shop settings saved.')->success()->send();
    }
}

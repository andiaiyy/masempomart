@echo off
rem ---------------------------------------------------------------------------
rem  Masempo Mart - double-click to run the shop locally.
rem  First run sets up the database (admin@masempo.test / password).
rem  Close the two windows to stop.
rem ---------------------------------------------------------------------------
setlocal
set "ROOT=%~dp0"

pushd "%ROOT%admin"
if not exist vendor (
  echo Installing PHP packages ^(first run only^)...
  call composer install
)
if not exist .env (
  copy .env.example .env >nul
  php artisan key:generate
)
if not exist database\database.sqlite (
  echo Creating the local database with demo snacks...
  type nul > database\database.sqlite
  php artisan migrate --seed --force
  php artisan storage:link
)
popd

pushd "%ROOT%user"
if not exist node_modules (
  echo Installing storefront packages ^(first run only^)...
  call npm install
)
popd

rem Same as `php artisan serve`, but with OPcache switched on for this server only:
rem each request then takes a fraction of a second instead of several.
echo Starting API + admin on http://127.0.0.1:8000 ...
start "Masempo admin" cmd /k "cd /d "%ROOT%admin\public" && php -d zend_extension=opcache -d opcache.enable=1 -d opcache.enable_cli=1 -S 127.0.0.1:8000 ..\vendor\laravel\framework\src\Illuminate\Foundation\resources\server.php"
echo Starting the shop on http://localhost:3000 ...
start "Masempo shop" cmd /k "cd /d "%ROOT%user" && npm run dev:web"

echo.
echo Shop:  http://localhost:3000
echo Admin: http://127.0.0.1:8000  (admin@masempo.test / password)
timeout /t 5 >nul
endlocal

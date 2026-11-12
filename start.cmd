@echo off
rem ---------------------------------------------------------------------------
rem  Masempo Mart - double-click to run the shop locally.
rem  First run installs packages and sets up the local database
rem  (admin@masempo.test / password). Close the two windows to stop.
rem ---------------------------------------------------------------------------
setlocal
set "ROOT=%~dp0"

pushd "%ROOT%admin"
if not exist node_modules (
  echo Installing admin packages ^(first run only^)...
  call npm install
)
if not exist .pglite (
  echo Creating the local database with demo snacks...
  call npm run db:setup
)
popd

pushd "%ROOT%user"
if not exist node_modules (
  echo Installing storefront packages ^(first run only^)...
  call npm install
)
popd

echo Starting API + admin on http://localhost:8000 ...
start "Masempo admin" cmd /k "cd /d "%ROOT%admin" && npm run dev"
echo Starting the shop on http://localhost:3000 ...
start "Masempo shop" cmd /k "cd /d "%ROOT%user" && npm run dev:web"

echo.
echo Shop:  http://localhost:3000
echo Admin: http://localhost:8000  (admin@masempo.test / password)
timeout /t 5 >nul
endlocal

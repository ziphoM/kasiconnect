@echo off
echo Creating KasiConnect project structure...
cd C:\xampp\htdocs\

REM Create directories
mkdir kasiconnect\backend\routes 2>nul
mkdir kasiconnect\backend\models 2>nul
mkdir kasiconnect\backend\middleware 2>nul
mkdir kasiconnect\backend\utils 2>nul
mkdir kasiconnect\frontend\src\components 2>nul
mkdir kasiconnect\frontend\src\pages 2>nul
mkdir kasiconnect\frontend\src\services 2>nul
mkdir kasiconnect\frontend\src\styles 2>nul
mkdir kasiconnect\database 2>nul
mkdir kasiconnect\ussd 2>nul

echo Directories created!
echo.
echo Next steps:
echo 1. Copy the code files into these folders
echo 2. Run XAMPP Control Panel
echo 3. Start Apache and MySQL
echo 4. Open http://localhost/phpmyadmin
echo.
pause
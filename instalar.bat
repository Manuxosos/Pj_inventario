@echo off
title Inventario IT - Instalacion inicial
set ROOT=%~dp0
set ROOT=%ROOT:~0,-1%

echo ============================================
echo   Inventario IT - Instalacion inicial
echo ============================================
echo.

:: Verificar Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js no esta instalado.
    echo Descargalo en: https://nodejs.org/en/download
    pause
    exit
)

echo [1/4] Instalando dependencias del backend...
cd /d "%ROOT%"
call npm install
if %errorlevel% neq 0 ( echo ERROR en backend. & pause & exit )

echo.
echo [2/4] Instalando dependencias del frontend...
cd /d "%ROOT%\frontend"
call npm install
if %errorlevel% neq 0 ( echo ERROR en frontend. & pause & exit )

echo.
echo [3/4] Creando base de datos...
cd /d "%ROOT%"
node seed.js
if %errorlevel% neq 0 ( echo ERROR al crear la base de datos. & pause & exit )

echo.
echo [4/4] Listo!
echo.
echo ============================================
echo  Instalacion completada exitosamente.
echo  Ahora usa "iniciar.bat" para arrancar la app.
echo ============================================
echo.
pause

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
    pause & exit
)

:: Verificar .env
if not exist "%ROOT%\.env" (
    echo AVISO: No se encontro el archivo .env
    echo Copia .env.example a .env y configura tus credenciales de PostgreSQL.
    echo.
    pause & exit
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
echo [3/4] Cargando datos iniciales en PostgreSQL...
cd /d "%ROOT%"
node seed.js
if %errorlevel% neq 0 ( echo ERROR al cargar datos. Verifica que PostgreSQL este corriendo y el .env sea correcto. & pause & exit )

echo.
echo [4/4] Compilando frontend para produccion...
cd /d "%ROOT%\frontend"
call npm run build
if %errorlevel% neq 0 ( echo ERROR al compilar frontend. & pause & exit )

echo.
echo ============================================
echo  Instalacion completada.
echo  Usa "iniciar.bat" para arrancar la app.
echo ============================================
echo.
pause

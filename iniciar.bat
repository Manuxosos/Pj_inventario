@echo off
title Inventario IT - Iniciando...

:: Obtener la carpeta donde esta este .bat (funciona en cualquier PC)
set ROOT=%~dp0
set ROOT=%ROOT:~0,-1%

echo Verificando Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js no esta instalado.
    echo Descargalo en https://nodejs.org
    pause
    exit
)

echo Iniciando Backend...
start "Backend - Inventario IT" cmd /k "cd /d "%ROOT%" && node server.js"

timeout /t 2 /nobreak >nul

echo Iniciando Frontend...
start "Frontend - Inventario IT" cmd /k "cd /d "%ROOT%\frontend" && npm run dev"

timeout /t 4 /nobreak >nul

echo Abriendo navegador...
start http://localhost:5173

exit

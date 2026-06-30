@echo off
title Inventario IT - Iniciando...
set ROOT=%~dp0
set ROOT=%ROOT:~0,-1%

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js no esta instalado.
    pause & exit
)

:: Modo produccion: si existe frontend/dist, el backend sirve todo
if exist "%ROOT%\frontend\dist\index.html" (
    echo Modo PRODUCCION - Backend sirve el frontend compilado.
    start "Inventario IT" cmd /k "cd /d "%ROOT%" && node server.js"
    timeout /t 3 /nobreak >nul
    start http://localhost:3001
) else (
    echo Modo DESARROLLO - Backend y frontend por separado.
    start "Backend - Inventario IT" cmd /k "cd /d "%ROOT%" && node server.js"
    timeout /t 2 /nobreak >nul
    start "Frontend - Inventario IT" cmd /k "cd /d "%ROOT%\frontend" && npm run dev"
    timeout /t 4 /nobreak >nul
    start http://localhost:5173
)

exit

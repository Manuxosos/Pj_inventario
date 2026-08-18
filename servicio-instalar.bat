@echo off
title Inventario IT - Arrancar con PM2
setlocal
set ROOT=%~dp0
set ROOT=%ROOT:~0,-1%
set APPNAME=inventario-it

echo ============================================
echo   Inventario IT - Arrancar con PM2
echo ============================================
echo.

:: Requiere permisos de administrador
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Este script debe ejecutarse como Administrador.
    echo Click derecho sobre servicio-instalar.bat y elige "Ejecutar como administrador".
    pause & exit /b 1
)

:: Verificar Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js no esta instalado.
    echo Descargalo en: https://nodejs.org/en/download
    pause & exit /b 1
)

:: Verificar que la instalacion inicial ya se hizo
if not exist "%ROOT%\.env" (
    echo ERROR: No se encontro el archivo .env
    echo Copia .env.example a .env, configuralo y ejecuta instalar.bat primero.
    pause & exit /b 1
)
if not exist "%ROOT%\frontend\dist\index.html" (
    echo ERROR: El frontend no esta compilado.
    echo Ejecuta instalar.bat primero.
    pause & exit /b 1
)

:: Leer el puerto del .env (por defecto 3001)
set PORT=3001
for /f "tokens=2 delims==" %%a in ('findstr /b /c:"PORT=" "%ROOT%\.env"') do set PORT=%%a

:: Verificar/instalar PM2
where pm2 >nul 2>&1
if %errorlevel% neq 0 (
    echo [1/4] Instalando PM2 globalmente...
    call npm install -g pm2
    if %errorlevel% neq 0 ( echo ERROR instalando PM2. & pause & exit /b 1 )
) else (
    echo [1/4] PM2 ya esta instalado.
)

:: Arrancar (o reiniciar) la app en PM2
echo [2/4] Arrancando %APPNAME% en PM2...
cd /d "%ROOT%"
call pm2 describe %APPNAME% >nul 2>&1
if %errorlevel% equ 0 (
    call pm2 restart %APPNAME%
) else (
    call pm2 start server.js --name %APPNAME%
)
call pm2 save

:: Abrir el puerto en el firewall
echo [3/4] Abriendo el puerto %PORT% en el firewall...
netsh advfirewall firewall delete rule name="Inventario IT" >nul 2>&1
netsh advfirewall firewall add rule name="Inventario IT" dir=in action=allow protocol=TCP localport=%PORT% >nul

:: Verificar si PM2 ya esta registrado como servicio de Windows
echo [4/4] Verificando persistencia al reiniciar el servidor...
sc query PM2 >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ============================================
    echo  AVISO IMPORTANTE
    echo ============================================
    echo  La app ya esta corriendo en PM2, pero PM2 en si
    echo  NO esta registrado como servicio de Windows todavia.
    echo  Eso significa que si el servidor se reinicia SIN que
    echo  nadie inicie sesion, la app no va a arrancar sola.
    echo.
    echo  Para dejarlo resuelto de forma permanente, sigue el
    echo  punto 5.2 de DESPLIEGUE.md (instala pm2-installer).
    echo  Es un paso manual, de una sola vez.
    echo ============================================
) else (
    echo        PM2 ya esta registrado como servicio de Windows. OK.
)

echo.
set IP=
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } | Select-Object -First 1).IPAddress" 2^>nul') do set IP=%%i

echo ============================================
echo  %APPNAME% arriba en PM2.
echo.
echo  En este equipo:    http://localhost:%PORT%
if defined IP echo  Desde la red local: http://%IP%:%PORT%
echo.
echo  Ver estado:  pm2 list
echo  Ver logs:    pm2 logs %APPNAME%
echo  Para quitarlo: servicio-desinstalar.bat
echo ============================================
echo.
pause

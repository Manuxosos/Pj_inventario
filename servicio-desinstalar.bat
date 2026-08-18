@echo off
title Inventario IT - Detener y quitar de PM2
set ROOT=%~dp0
set APPNAME=inventario-it

echo ============================================
echo   Inventario IT - Detener y quitar de PM2
echo ============================================
echo.

:: Requiere permisos de administrador
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Este script debe ejecutarse como Administrador.
    echo Click derecho sobre servicio-desinstalar.bat y elige "Ejecutar como administrador".
    pause & exit /b 1
)

where pm2 >nul 2>&1
if %errorlevel% neq 0 (
    echo PM2 no esta instalado. Nada que hacer.
    pause & exit /b 0
)

echo Deteniendo y quitando %APPNAME% de PM2...
call pm2 delete %APPNAME% >nul 2>&1
call pm2 save

echo Quitando la regla del firewall...
netsh advfirewall firewall delete rule name="Inventario IT" >nul 2>&1

echo.
echo Listo. %APPNAME% fue quitado de PM2.
echo La aplicacion y la base de datos NO se tocaron.
echo.
echo Nota: esto NO desinstala PM2 en si ni el servicio de Windows
echo "PM2" (si lo configuraste con pm2-installer). Si quieres
echo quitar tambien eso, hazlo desde services.msc o siguiendo
echo la documentacion de pm2-installer.
echo.
pause

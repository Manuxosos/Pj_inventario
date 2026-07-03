@echo off
title Inventario IT - Desinstalar servicio de Windows
set ROOT=%~dp0
set ROOT=%ROOT:~0,-1%
set SVC=InventarioIT
set NSSM=%ROOT%\nssm.exe

echo ============================================
echo   Inventario IT - Desinstalar servicio
echo ============================================
echo.

:: Requiere permisos de administrador
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Este script debe ejecutarse como Administrador.
    echo Click derecho sobre servicio-desinstalar.bat y elige "Ejecutar como administrador".
    pause & exit /b 1
)

sc query %SVC% >nul 2>&1
if %errorlevel% neq 0 (
    echo El servicio %SVC% no esta instalado. Nada que hacer.
    pause & exit /b 0
)

if not exist "%NSSM%" (
    echo ERROR: No se encuentra nssm.exe en esta carpeta.
    echo Es el mismo archivo que descargo servicio-instalar.bat.
    pause & exit /b 1
)

echo Deteniendo y eliminando el servicio %SVC%...
"%NSSM%" stop %SVC% >nul 2>&1
"%NSSM%" remove %SVC% confirm >nul 2>&1

echo Quitando la regla del firewall...
netsh advfirewall firewall delete rule name="Inventario IT" >nul 2>&1

echo.
echo Listo. El servicio fue eliminado.
echo La aplicacion y la base de datos NO se tocaron:
echo puedes seguir usando iniciar.bat manualmente si quieres.
echo.
pause

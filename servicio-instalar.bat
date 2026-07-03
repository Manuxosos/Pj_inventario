@echo off
title Inventario IT - Instalar servicio de Windows
setlocal
set ROOT=%~dp0
set ROOT=%ROOT:~0,-1%
set SVC=InventarioIT
set NSSM=%ROOT%\nssm.exe

echo ============================================
echo   Inventario IT - Instalar como servicio
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
set NODE_EXE=
for /f "delims=" %%i in ('where node') do if not defined NODE_EXE set NODE_EXE=%%i

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

:: Descargar NSSM si no esta junto al script
if not exist "%NSSM%" (
    echo [1/5] Descargando NSSM ^(gestor de servicios^)...
    powershell -NoProfile -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://nssm.cc/release/nssm-2.24.zip' -OutFile \"$env:TEMP\nssm.zip\"; Expand-Archive -Force \"$env:TEMP\nssm.zip\" \"$env:TEMP\nssm\"; Copy-Item \"$env:TEMP\nssm\nssm-2.24\win64\nssm.exe\" '%NSSM%'"
    if not exist "%NSSM%" (
        echo ERROR: No se pudo descargar NSSM automaticamente.
        echo Descargalo manualmente de https://nssm.cc/download y copia
        echo el archivo win64\nssm.exe a esta carpeta. Luego vuelve a ejecutar este script.
        pause & exit /b 1
    )
) else (
    echo [1/5] NSSM ya esta descargado.
)

:: Si el servicio ya existe, quitarlo para reinstalar limpio
sc query %SVC% >nul 2>&1
if %errorlevel% equ 0 (
    echo [2/5] El servicio ya existia, se reinstalara...
    "%NSSM%" stop %SVC% >nul 2>&1
    "%NSSM%" remove %SVC% confirm >nul 2>&1
) else (
    echo [2/5] Registrando servicio nuevo...
)

:: Detectar el servicio de PostgreSQL para arrancar despues de el
set PGSVC=
for /f "delims=" %%s in ('powershell -NoProfile -Command "(Get-Service postgresql* | Select-Object -First 1).Name" 2^>nul') do set PGSVC=%%s

:: Crear carpeta de logs
if not exist "%ROOT%\logs" mkdir "%ROOT%\logs"

:: Instalar y configurar el servicio
echo [3/5] Configurando el servicio %SVC%...
"%NSSM%" install %SVC% "%NODE_EXE%" server.js
"%NSSM%" set %SVC% AppDirectory "%ROOT%" >nul
"%NSSM%" set %SVC% DisplayName "Inventario IT" >nul
"%NSSM%" set %SVC% Description "Sistema de inventario de equipos IT (Node.js + PostgreSQL)" >nul
"%NSSM%" set %SVC% Start SERVICE_AUTO_START >nul
"%NSSM%" set %SVC% AppStdout "%ROOT%\logs\servicio.log" >nul
"%NSSM%" set %SVC% AppStderr "%ROOT%\logs\servicio-error.log" >nul
"%NSSM%" set %SVC% AppRotateFiles 1 >nul
"%NSSM%" set %SVC% AppRotateBytes 1048576 >nul
"%NSSM%" set %SVC% AppExit Default Restart >nul
"%NSSM%" set %SVC% AppRestartDelay 5000 >nul
if defined PGSVC (
    "%NSSM%" set %SVC% DependOnService %PGSVC% >nul
    echo        Dependencia configurada: arranca despues de %PGSVC%
) else (
    echo        AVISO: No se detecto el servicio de PostgreSQL en esta maquina.
    echo        Si PostgreSQL corre en otro equipo, ignora este aviso.
)

:: Abrir el puerto en el firewall de Windows
echo [4/5] Abriendo el puerto %PORT% en el firewall...
netsh advfirewall firewall delete rule name="Inventario IT" >nul 2>&1
netsh advfirewall firewall add rule name="Inventario IT" dir=in action=allow protocol=TCP localport=%PORT% >nul

:: Arrancar el servicio
echo [5/5] Iniciando el servicio...
"%NSSM%" start %SVC% >nul 2>&1

:: Mostrar resultado
timeout /t 3 /nobreak >nul
set IP=
for /f "delims=" %%i in ('powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } | Select-Object -First 1).IPAddress" 2^>nul') do set IP=%%i

echo.
echo ============================================
echo  Servicio instalado y en marcha.
echo.
echo  En este equipo:    http://localhost:%PORT%
if defined IP echo  Desde la red local: http://%IP%:%PORT%
echo.
echo  El servicio arranca solo al encender el servidor.
echo  Logs en: %ROOT%\logs\
echo  Para quitarlo: servicio-desinstalar.bat
echo ============================================
echo.
pause

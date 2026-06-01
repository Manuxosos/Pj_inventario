@echo off
title Inventario IT - Deteniendo...

echo Deteniendo servidores...
taskkill /FI "WINDOWTITLE eq Backend - Inventario IT" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Frontend - Inventario IT" /T /F >nul 2>&1

echo Servidores detenidos.
timeout /t 2 /nobreak >nul
exit

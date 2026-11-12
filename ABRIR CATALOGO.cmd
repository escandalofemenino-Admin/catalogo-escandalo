@echo off
cd /d "%~dp0"
start "Catalogo Escandalo" /min node server.mjs
timeout /t 1 /nobreak >nul
start "" "http://127.0.0.1:8770/catalogo.html"

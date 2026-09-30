@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Instala Node.js LTS 22 o 24 desde https://nodejs.org/ y vuelve a ejecutar este archivo.
  pause
  exit /b 1
)
where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo npm no esta disponible. Reinstala Node.js incluyendo npm.
  pause
  exit /b 1
)
echo Instalando dependencias reproducibles...
call npm.cmd ci --no-audit --no-fund
if errorlevel 1 goto fallo
echo Instalando Chromium, Firefox y WebKit...
call npx.cmd playwright install chromium firefox webkit
if errorlevel 1 goto fallo
call npm.cmd run validate
if errorlevel 1 goto fallo
call npm.cmd test -- %*
if errorlevel 1 goto fallo
echo Ejecucion finalizada. Abre el dashboard indicado arriba.
pause
exit /b 0
:fallo
echo El proceso termino con errores. Revisa la consola y la carpeta reports.
pause
exit /b 1

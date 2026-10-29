@echo off
REM ============================================================
REM   SIGPROV - Modo Demo (SOLO FRONTEND)
REM   Usa datos MOCK - no requiere Python ni Backend
REM ============================================================

title SIGPROV - Modo Demo

echo.
echo  ============================================================
echo    SIGPROV - Modo Demo (Solo Frontend)
echo  ============================================================
echo.
echo  Este modo usa DATOS SIMULADOS realistas.
echo  NO necesita Python, ni base de datos, ni backend.
echo.
echo  Datos incluidos:
echo    - 38 productos (panes, cafes, bebidas, combos)
echo    - 13 materia prima con recetas
echo    - 23 recetas (BOM) con costos calculados
echo    - 8 combos colombianos
echo    - 12 mesas en 4 zonas
echo    - 7 proveedores
echo    - 30 dias de historial de ventas
echo    - Prediccion ML pre-calculada
echo.
echo  Tiempo estimado: 1-2 minutos (solo npm install la 1ra vez)
echo.
echo  Requisitos: Node.js 18+ desde https://nodejs.org/
echo.
pause

cd /d "%~dp0frontend"

where node >nul 2>&1
if errorlevel 1 (
    echo.
    echo  [ERROR] Node.js NO esta instalado.
    echo  Descargalo de https://nodejs.org/ (version 18 LTS o superior)
    echo  Instalalo y volve a correr este script.
    echo.
    pause
    exit /b 1
)

if not exist node_modules (
    echo.
    echo  Instalando dependencias de Node (1-2 minutos)...
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo  [ERROR] Fallo npm install.
        echo  Posibles causas:
        echo    - Sin conexion a internet
        echo    - Antivirus activo
        echo    - Proxy corporativo
        echo.
        pause
        exit /b 1
    )
)

echo.
echo  Arrancando frontend...
start "SIGPROV Frontend - http://localhost:5173" cmd /k "echo Servidor iniciado. NO cierres esta ventana. && echo. && npm run dev"

REM Esperar un poco y abrir navegador
timeout /t 6 /nobreak >nul
start "" http://localhost:5173

echo.
echo  ============================================================
echo    LISTO!
echo    http://localhost:5173
echo  ============================================================
echo.
echo  Si el navegador no se abrio, anda a http://localhost:5173
echo.
echo  Para detener: cerra la ventana "SIGPROV Frontend".
echo.
pause

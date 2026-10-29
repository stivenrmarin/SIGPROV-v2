@echo off
REM ============================================================
REM   SIGPROV - Instalador y Lanzador Completo
REM   Backend FastAPI + Frontend React
REM   Proyecto Integrador - Universidad San Mateo
REM ============================================================

title SIGPROV - Instalador Completo

echo.
echo  ============================================================
echo    SIGPROV - Sistema de Inventario y Prediccion ML
echo    Proyecto Integrador - Universidad San Mateo
echo  ============================================================
echo.
echo  Este script va a:
echo   1) Verificar Python 3.11+ y Node.js 18+
echo   2) Crear el entorno virtual de Python (venv)
echo   3) Instalar dependencias del backend FastAPI
echo   4) Instalar dependencias de Node (frontend)
echo   5) Levantar el BACKEND en una ventana
echo   6) Levantar el FRONTEND en otra ventana
echo.
echo  IMPORTANTE:
echo   - NO cierres las 2 ventanas que se van a abrir.
echo   - La primera vez tarda 3-5 minutos instalando.
echo.
echo  Para detener todo: cerra las 2 ventanas.
echo.
echo  Si SOLO queres ver el demo (sin Python):
echo   Ejecuta SOLO_FRONTEND.bat en su lugar.
echo.
pause

REM ============================================================
REM Paso 1: Verificar requisitos
REM ============================================================
echo.
echo [1/6] Verificando requisitos...

where python >nul 2>&1
if errorlevel 1 (
    echo.
    echo  [ERROR] Python NO esta instalado en este equipo.
    echo.
    echo  Sin Python no podemos levantar el backend.
    echo.
    echo  Opciones:
    echo    A) Instalar Python 3.11+ desde https://www.python.org/downloads/
    echo       IMPORTANTE: marca "Add Python to PATH" durante la instalacion.
    echo.
    echo    B) Ejecuta SOLO_FRONTEND.bat en su lugar (solo necesita Node.js)
    echo.
    pause
    exit /b 1
)
for /f "tokens=2" %%i in ('python --version') do set PYVER=%%i
echo   - Python %PYVER% detectado OK

where node >nul 2>&1
if errorlevel 1 (
    echo.
    echo  [ERROR] Node.js NO esta instalado en este equipo.
    echo.
    echo  Sin Node.js no podemos levantar el frontend.
    echo.
    echo  Descargalo de https://nodejs.org/ (version 18 LTS o superior)
    echo.
    pause
    exit /b 1
)
for /f "tokens=2" %%i in ('node --version') do set NVER=%%i
echo   - Node.js v%NVER% detectado OK

REM ============================================================
REM Paso 2: Backend - crear venv
REM ============================================================
echo.
echo [2/6] Creando entorno virtual de Python...
cd /d "%~dp0backend"
if not exist venv (
    python -m venv venv
    if errorlevel 1 (
        echo.
        echo  [ERROR] No se pudo crear el entorno virtual.
        echo  Tip: ejecuta desde una terminal como administrador.
        echo.
        pause
        exit /b 1
    )
)
echo   - Entorno virtual OK (backend\venv)

REM ============================================================
REM Paso 3: Instalar dependencias Python
REM ============================================================
echo.
echo [3/6] Instalando dependencias de Python (esto puede tardar 2-3 minutos)...
call venv\Scripts\activate.bat
python -m pip install --upgrade pip --quiet
pip install -r requirements.txt --quiet
if errorlevel 1 (
    echo.
    echo  [ERROR] Fallo la instalacion de dependencias de Python.
    echo  Posibles causas:
    echo    - Antivirus activo (desactivalo temporalmente)
    echo    - Sin conexion a internet
    echo    - Python requiere Visual C++ Build Tools
    echo.
    echo  Tip: intenta ejecutar SOLO_FRONTEND.bat (sin backend)
    echo.
    pause
    exit /b 1
)
echo   - Dependencias Python instaladas OK

REM ============================================================
REM Paso 4: npm install (frontend)
REM ============================================================
echo.
echo [4/6] Instalando dependencias de Node (esto puede tardar 1-2 minutos)...
cd /d "%~dp0frontend"
if exist package-lock.json (
    call npm ci --silent
) else (
    call npm install --silent
)
if errorlevel 1 (
    echo.
    echo  [ERROR] Fallo npm install.
    echo  Posibles causas:
    echo    - Sin conexion a internet
    echo    - Proxy corporativo bloqueando npm
    echo    - Antivirus activo
    echo.
    pause
    exit /b 1
)
echo   - Dependencias Node instaladas OK

REM ============================================================
REM Paso 5: Levantar backend en nueva ventana
REM ============================================================
echo.
echo [5/6] Levantando BACKEND (puerto 8000) en ventana propia...
cd /d "%~dp0backend"
start "SIGPROV Backend - http://localhost:8000" cmd /k "call venv\Scripts\activate.bat && echo Backend corriendo... && echo. && uvicorn app.main:app --reload --port 8000"

REM Esperar a que el backend arranque
echo   Esperando 5 segundos a que el backend arranque...
timeout /t 5 /nobreak >nul

REM ============================================================
REM Paso 6: Levantar frontend
REM ============================================================
echo.
echo [6/6] Levantando FRONTEND (puerto 5173) en ventana propia...
cd /d "%~dp0frontend"
start "SIGPROV Frontend - http://localhost:5173" cmd /k "echo Frontend arrancando... && echo. && npm run dev"

REM Esperar a que el frontend este listo
echo   Esperando 8 segundos a que el frontend arranque...
timeout /t 8 /nobreak >nul

REM Abrir el navegador automaticamente
start "" http://localhost:5173

echo.
echo  ============================================================
echo    LISTO!
echo  ============================================================
echo.
echo  Frontend:    http://localhost:5173
echo  Backend API: http://localhost:8000
echo  Docs API:    http://localhost:8000/docs
echo.
echo  La base de datos se creo en backend\data\sigprov.db (SQLite).
echo  No necesitas Docker para nada.
echo.
echo  Si el navegador no se abrio, anda a http://localhost:5173
echo.
echo  Para detener todo: cerra las 2 ventanas (Backend y Frontend).
echo.
pause

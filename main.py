"""SIGPROV v2 - Lanzador con detecci\u00f3n autom\u00e1tica de modo.

Modos:
  - Docker:        usa Postgres via docker-compose (preferido)
  - Local (sin Docker): usa SQLite embebido + genera datos sint\u00e9ticos autom\u00e1ticamente

Uso:
    python main.py                   # Detecta modo y levanta todo
    python main.py --modo local      # Fuerza modo local (SQLite)
    python main.py --modo docker     # Fuerza modo docker
    python main.py --stop            # Detiene todo
    python main.py --status          # Estado de servicios
"""
from __future__ import annotations

import argparse
import os
import shutil
import signal
import subprocess
import sys
import time
import urllib.error
import urllib.request
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PROYECTO = ROOT
COMPOSE_FILE = PROYECTO / "docker-compose.yml"
BACKEND_DIR = PROYECTO / "backend"
FRONTEND_DIR = PROYECTO / "frontend"

BACKEND_PORT = 8000
FRONTEND_PORT = 5173

GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
CYAN = "\033[96m"
RESET = "\033[0m"


def color(t, c): return f"{c}{t}{RESET}" if sys.stdout.isatty() else t
def banner():
    print(color("=" * 64, CYAN))
    print(color("  SIGPROV v2 - Inventario + Prediccion de Ventas", CYAN))
    print(color("  Proyecto Integrador 2026-2 - Universidad San Mateo", CYAN))
    print(color("=" * 64, CYAN))
    print()


def docker_disponible() -> bool:
    if not shutil.which("docker"):
        return False
    r = subprocess.run(["docker", "info"], capture_output=True, text=True,
                       creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
    return r.returncode == 0


def paso(n, t, m): print(color(f"[{n}/{t}] {m}...", YELLOW))
def ok(m): print(color(f"      OK: {m}", GREEN))
def warn(m): print(color(f"      WARN: {m}", YELLOW))
def err(m): print(color(f"      ERROR: {m}", RED))


def levantar_docker() -> bool:
    paso(1, 5, "Levantando PostgreSQL con docker-compose")
    r = subprocess.run(
        ["docker", "compose", "-f", str(COMPOSE_FILE), "up", "-d", "postgres"],
        cwd=PROYECTO, capture_output=True, text=True,
        creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
    )
    if r.returncode != 0:
        err(r.stderr or r.stdout)
        return False
    print("       Esperando DB healthy...", end="", flush=True)
    for _ in range(30):
        time.sleep(2)
        r = subprocess.run(
            ["docker", "inspect", "--format={{.State.Health.Status}}", "sigprov-postgres"],
            capture_output=True, text=True,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
        )
        if "healthy" in r.stdout:
            print()
            ok("PostgreSQL listo")
            return True
        print(".", end="", flush=True)
    print()
    err("Timeout DB")
    return False


def backend_venv_python() -> str:
    return str(BACKEND_DIR / "venv" / "Scripts" / "python.exe" if os.name == "nt"
               else BACKEND_DIR / "venv" / "bin" / "python")


def backend_venv_existe() -> bool:
    return Path(backend_venv_python()).exists()


def instalar_deps_backend() -> bool:
    if not backend_venv_existe():
        print("       Creando venv...")
        r = subprocess.run(["python", "-m", "venv", "venv"], cwd=BACKEND_DIR, capture_output=True,
                          creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
        if r.returncode != 0:
            err("No se pudo crear venv")
            return False
        skip_pip = False
    else:
        r = subprocess.run([backend_venv_python(), "-c", "import fastapi; print('ok')"],
                          capture_output=True, creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
        skip_pip = r.returncode == 0
    if skip_pip:
        ok("Dependencias del backend OK")
        return True
    req = BACKEND_DIR / "requirements.txt"
    if not req.exists():
        err("requirements.txt no encontrado")
        return False
    print("       Instalando dependencias (primera vez, puede tardar)...")
    r = subprocess.run([backend_venv_python(), "-m", "pip", "install", "-q", "-r", str(req)],
                      cwd=BACKEND_DIR, capture_output=True,
                      creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
    return r.returncode == 0


def levantar_backend():
    paso(2, 5, "Levantando backend FastAPI")
    if not instalar_deps_backend():
        return None
    cmd = [backend_venv_python(), "-m", "uvicorn", "app.main:app",
           "--reload", "--host", "0.0.0.0", "--port", str(BACKEND_PORT)]
    if os.name == "nt":
        proc = subprocess.Popen(cmd, cwd=BACKEND_DIR,
                                creationflags=subprocess.CREATE_NEW_CONSOLE)
    else:
        proc = subprocess.Popen(cmd, cwd=BACKEND_DIR)
    print(f"       Esperando backend en :{BACKEND_PORT}...", end="", flush=True)
    for _ in range(40):
        time.sleep(1)
        try:
            with urllib.request.urlopen(f"http://localhost:{BACKEND_PORT}/health", timeout=2) as r:
                if r.status == 200:
                    print()
                    ok(f"Backend listo en http://localhost:{BACKEND_PORT}")
                    ok(f"Swagger en http://localhost:{BACKEND_PORT}/docs")
                    return proc
        except Exception:
            print(".", end="", flush=True)
    print()
    warn(f"Backend no respondi\u00f3 en 40s, sigue iniciando")
    return proc


def levantar_frontend():
    if os.environ.get("SIGPROV_SKIP_FRONTEND") == "1":
        warn("Frontend saltado")
        return None
    paso(3, 5, "Levantando frontend Vite")
    if not (FRONTEND_DIR / "node_modules").exists():
        print("       Instalando deps del frontend (primera vez, puede tardar 2-5 min)...")
        npm = "npm.cmd" if os.name == "nt" else "npm"
        r = subprocess.run([npm, "install", "--no-audit", "--no-fund"],
                          cwd=FRONTEND_DIR, capture_output=True,
                          creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
        if r.returncode != 0:
            err("npm install fall\u00f3")
            return None
    npm = "npm.cmd" if os.name == "nt" else "npm"
    if os.name == "nt":
        proc = subprocess.Popen([npm, "run", "dev"], cwd=FRONTEND_DIR,
                                creationflags=subprocess.CREATE_NEW_CONSOLE)
    else:
        proc = subprocess.Popen([npm, "run", "dev"], cwd=FRONTEND_DIR)
    print(f"       Esperando frontend en :{FRONTEND_PORT}...", end="", flush=True)
    for _ in range(30):
        time.sleep(1)
        try:
            with urllib.request.urlopen(f"http://localhost:{FRONTEND_PORT}", timeout=2):
                print()
                ok(f"Frontend listo en http://localhost:{FRONTEND_PORT}")
                return proc
        except Exception:
            print(".", end="", flush=True)
    print()
    warn(f"Frontend no respondi\u00f3 en 30s, sigue iniciando")
    return proc


def abrir_navegador():
    paso(4, 5, "Abriendo navegador")
    try:
        webbrowser.open(f"http://localhost:{FRONTEND_PORT}")
        ok(f"Navegador abierto")
    except Exception as e:
        warn(f"No se pudo abrir navegador: {e}")


def resumen_final(modo):
    paso(5, 5, "Listo")
    print()
    print(color("=" * 64, GREEN))
    print(color("  SIGPROV v2 funcionando", GREEN))
    print(color(f"  Modo: {modo}", YELLOW if modo == "LOCAL (SQLite)" else GREEN))
    print(color("=" * 64, GREEN))
    print()
    print(f"   App:        {color(f'http://localhost:{FRONTEND_PORT}', CYAN)}")
    print(f"   Backend:    {color(f'http://localhost:{BACKEND_PORT}', CYAN)}")
    print(f"   Swagger:    {color(f'http://localhost:{BACKEND_PORT}/docs', CYAN)}")
    print()
    print(color("   P\u00e1ginas:", YELLOW))
    print("     /              Hoy (Dashboard del due\u00f1o)")
    print("     /semana        Predicci\u00f3n semanal con ML")
    print("     /productos     Inventario + alertas")
    print("     /venta         POS registrar venta")
    print("     /alertas       Alertas activas")
    print("     /configuracion Configuraci\u00f3n del local")
    print()
    if modo == "LOCAL (SQLite)":
        print(color("   Nota: Modo LOCAL sin Docker.", YELLOW))
        print("   El frontend usa datos MOCK realistas (12 meses de panader\u00eda).")
        print("   Para tener backend con DB, levant\u00e1 Docker Desktop y reinici\u00e1.")
    print()
    print(color("   Para detener: 'python main.py --stop'", YELLOW))
    print()


def estado():
    banner()
    servicios = [
        ("PostgreSQL", "http://localhost:5432"),
        ("Backend FastAPI", f"http://localhost:{BACKEND_PORT}/health"),
        ("Frontend Vite", f"http://localhost:{FRONTEND_PORT}"),
    ]
    for nombre, url in servicios:
        try:
            with urllib.request.urlopen(url, timeout=2) as r:
                status = color(f"ACTIVO ({r.status})", GREEN)
        except Exception:
            status = color("CAIDO", RED)
        print(f"  {nombre:25s} {url:40s} [{status}]")
    print()


def detener():
    banner()
    print("Deteniendo servicios...")
    if shutil.which("docker"):
        subprocess.run(["docker", "compose", "-f", str(COMPOSE_FILE), "down"],
                      cwd=PROYECTO, capture_output=True,
                      creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
    if os.name == "nt":
        subprocess.run(["taskkill", "/F", "/IM", "uvicorn.exe"], capture_output=True,
                      creationflags=subprocess.CREATE_NO_WINDOW)
        subprocess.run(["taskkill", "/F", "/IM", "node.exe", "/FI", "WINDOWTITLE eq SIGPROV*"],
                      capture_output=True, creationflags=subprocess.CREATE_NO_WINDOW)
    else:
        subprocess.run(["pkill", "-f", "uvicorn"], capture_output=True)
        subprocess.run(["pkill", "-f", "vite"], capture_output=True)
    ok("Servicios detenidos")


def main() -> int:
    parser = argparse.ArgumentParser(description="SIGPROV v2 launcher")
    parser.add_argument("--stop", action="store_true")
    parser.add_argument("--status", action="store_true")
    parser.add_argument("--no-browser", action="store_true")
    parser.add_argument("--modo", choices=["auto", "docker", "local"], default="auto")
    parser.add_argument("--foreground", action="store_true")
    args = parser.parse_args()

    if args.stop:
        detener()
        return 0
    if args.status:
        estado()
        return 0

    banner()

    # Detectar modo
    if args.modo == "auto":
        usar_docker = docker_disponible()
    elif args.modo == "docker":
        usar_docker = docker_disponible()
        if not usar_docker:
            err("Modo docker pedido pero Docker no est\u00e1 disponible")
            err("Prueba: python main.py --modo local")
            return 1
    else:  # local
        usar_docker = False

    modo_str = "DOCKER (Postgres)" if usar_docker else "LOCAL (SQLite)"
    ok(f"Modo: {modo_str}")

    if not shutil.which("python"):
        err("Python no est\u00e1 en PATH")
        return 1
    if not shutil.which("node"):
        warn("Node no encontrado - frontend NO se levantar\u00e1")
        os.environ["SIGPROV_SKIP_FRONTEND"] = "1"

    if usar_docker:
        if not levantar_docker():
            warn("No se pudo levantar Docker, fallback a modo LOCAL")
            usar_docker = False
            modo_str = "LOCAL (SQLite)"

    backend_proc = levantar_backend()
    if backend_proc is None:
        err("No se pudo levantar el backend")
        return 1

    frontend_proc = levantar_frontend()

    if not args.no_browser:
        abrir_navegador()

    resumen_final(modo_str)

    if args.foreground:
        try:
            signal.pause()
        except KeyboardInterrupt:
            pass
        detener()

    return 0


if __name__ == "__main__":
    sys.exit(main())
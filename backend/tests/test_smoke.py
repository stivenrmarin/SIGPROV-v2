"""Tests smoke del backend (ejecutar con pytest)."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_ok():
    r = client.get("/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert "version" in data
    assert "uptime_seconds" in data


def test_root():
    r = client.get("/")
    assert r.status_code == 200
    assert "docs" in r.json()


def test_metrics():
    r = client.get("/metrics")
    assert r.status_code == 200
    assert "version" in r.json()


def test_productos_listar_vacio():
    """Lista de productos puede estar vacía si no hay seed."""
    r = client.get("/api/productos/")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_productos_crear_terminado():
    r = client.post(
        "/api/productos/",
        json={
            "nombre": "Pan francés test",
            "tipo": "terminado",
            "categoria": "panes",
            "precio_venta": 3000,
            "costo_unitario": 1200,
            "unidad": "unidad",
            "stock_minimo": 10,
            "stock_actual": 100,
        },
    )
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["nombre"] == "Pan francés test"
    assert data["stock_actual"] == 100
    assert data["activo"] is True


def test_productos_crear_sin_precio_rechaza():
    """Productos terminados DEBEN tener precio_venta."""
    r = client.post(
        "/api/productos/",
        json={
            "nombre": "Harina test",
            "tipo": "terminado",
            "categoria": "panes",
            "costo_unitario": 2500,
        },
    )
    assert r.status_code == 400


def test_inventario_alertas_vacio_si_no_hay_bajo_stock():
    r = client.get("/api/inventario/alertas")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_ventas_resumen_hoy():
    r = client.get("/api/ventas/resumen/hoy")
    assert r.status_code == 200
    data = r.json()
    assert "fecha" in data
    assert "total_vendido" in data
    assert "num_ventas" in data


def test_dashboard_resumen():
    r = client.get("/api/dashboard/resumen")
    assert r.status_code == 200
    data = r.json()
    assert "total_vendido" in data
    assert "productos_stock_bajo" in data


def test_prediccion_stubs():
    """Los stubs de predicción deben responder 200 con mensaje de fase 2."""
    r = client.post("/api/prediccion/entrenar")
    assert r.status_code == 200
    assert r.json()["status"] == "pending"

    r = client.get("/api/prediccion/proxima-semana")
    assert r.status_code == 200
    assert "modelo_version" in r.json()

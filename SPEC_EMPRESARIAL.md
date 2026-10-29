# SIGPROV — Especificación de Desarrollo: De MVP Demo a Producto Empresarial

**Versión:** 3.0 (Empresa)
**Fecha:** 2026-10-25
**Proyecto:** Proyecto Integrador — Universidad San Mateo
**Alcance:** Sistema de inventario + predicción ML + POS para panaderías

> Este documento define exactamente qué falta para que SIGPROV deje de ser una demo
> funcional y pase a ser un producto que un negocio pueda operar en producción con
> confianza. Cada tarea tiene ID, dependencias, entregable y criterio de aceptación.

---

## 1. Resumen Ejecutivo

### 1.1 Estado real verificado (2026-10-25)

| Capa | Estado | Detalle verificado |
|---|---|---|
| Frontend React+TS | 🟢 Sólido | 9 páginas, dark mode, exports PDF/Excel, chatbot, tour, `tsc` 0 errores, `dist` compilado |
| Mock data | 🟢 Completo | 38 productos, 13 MP, 23 recetas, 8 combos, 7 proveedores, 12 mesas, 30 días historial |
| Backend FastAPI | 🟡 Funcional | **32 endpoints** en 5 routers, **8 modelos ORM**, compila sin errores |
| Base de datos | 🟡 Parcial | `01_schema.sql` con 8 tablas + 3 triggers + índices; `docker-compose` solo levanta Postgres |
| ML (Prophet) | 🟡 Funcional | `trainer.py` / `predictor.py` / `metrics.py`; endpoints de entrenamiento y métricas |
| Persistencia real | 🔴 Ausente | `store/` vacío; localStorage solo guarda UI (tema/sidebar/tour). Las ventas mock **se pierden al recargar** |
| Autenticación | 🔴 Ausente | Cero login, cero roles, cero JWT |
| Escrituras | 🔴 Riesgo | `api.ts:70` `smartFetch` cae a mock **en silencio** si el backend falla → pérdida de venta invisible |
| Electron | 🔴 Ausente | Scripts `electron:*` en `package.json`, pero **no existe la carpeta `electron/`** |
| Tests | 🔴 Mínimo | Solo `backend/tests/test_smoke.py`. Cero tests frontend, cero E2E, cero CI |
| Docs | 🟡 Parcial | `SPEC.md` + READMEs sólidos; `docs/` **vacío** |

### 1.2 Veredicto

| Barra | % | Nota |
|---|---|---|
| Demo de portafolio / pregrado | **~90%** | Presentable y体系中 completo |
| Piloto con dueño real | **~50%** | Necesita backend vivo + auth |
| **Producto empresarial** | **~30%** | Este documento cierra ese 70% |

### 1.3 Definición de "Done" — 100% profesional empresarial

El proyecto se considera **empresarial** cuando los 14 criterios se cumplen **verificados**:

| # | Criterio | Cómo se verifica |
|---|---|---|
| D1 | Postgres real corre, migraciones Alembic, cero SQL manual | `alembic upgrade head` desde cero = OK |
| D2 | Auth JWT + 3 roles (admin/cajero/gerente) | Login real, rutas bloqueadas por rol |
| D3 | Cero escrituras con fallback silencioso | Grep + test: caída de backend ⇒ error visible, no mock |
| D4 | Cobertura backend ≥80%, frontend ≥70% | `pytest --cov`, `vitest --coverage` |
| D5 | E2E de 8 flujos críticos en verde | Playwright |
| D6 | CI verde en cada PR | GitHub Actions: lint + typecheck + test + build |
| D7 | `.exe` portable en Windows limpio | Sin Python ni Node instalados en la máquina de prueba |
| D8 | Secrets fuera del código | `.env` + `.env.example`, secret scan en CI |
| D9 | Backups automáticos + restore probado | Script + evidencia de restore |
| D10 | Logs estructurados + `/health` + `/metrics` | JSON logs, Prometheus-ready |
| D11 | Documentación: OpenAPI, runbook, guía de usuario | `docs/` poblado |
| D12 | Cero mojibake / escapes `\uXXXX` en el source | Sweep de 52 ocurrencias |
| D13 | Timezone America/Bogota, locale es-CO, IVA 19%/0 correcto | Tests de contrato |
| D14 | Aprobación de piloto real | 2 semanas de uso en panadería |

**Esfuerzo total estimado: ~20 días efectivo (4 semanas a 1 developer).**

---

## 2. Arquitectura Objetivo

```
┌─────────────────────────────────────────────────────────────────┐
│                     CAPAS DE CLIENTE                            │
├─────────────────────────────────────────────────────────────────┤
│  Electron .exe (Windows)          Navegador (responsive)        │
│  └─ file:// + API http://127.0.0.1:8000                        │
└─────────────────────────────────────────────────────────────────┘
                              │ HTTPS / JWT Bearer
┌─────────────────────────────▼───────────────────────────────────┐
│                     API GATEWAY (FastAPI)                        │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐      │
│  │  auth    │catalogo  │ POS/vent │prediccion│operaciones│      │
│  │ usuarios │productos │mesas/caja│  ML      │proveedor.│      │
│  │ roles    │ recetas  │ proveedores│ filtros │ report   │      │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘      │
│  Middleware: JWT · RBAC · RequestID · Logging · RateLimit      │
└─────────────────────────────┬───────────────────────────────────┘
                              │ SQLAlchemy 2.0
┌─────────────────────────────▼───────────────────────────────────┐
│                     PostgreSQL 16                                │
│  8 tablas core + 9 nuevas (D2) · Triggers stock · Vistas        │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                   ML PIPELINE (Prophet)                          │
│  scheduler nocturno → entrenar → evaluar MAPE → guardar modelo  │
│  versionado en /models + registro en predicciones                │
└─────────────────────────────────────────────────────────────────┘
```

### 2.1 Decisiones de diseño (por qué)

| Decisión | Alternativa descartada | Razón |
|---|---|---|
| Alembic para migraciones | SQL manual versionado | Un solo comando reproducible; CI puede aplicar schema desde cero |
| JWT stateless + refresh en DB | Sessions en memoria | Escala a multi-terminal sin tocar backend; permite revocar por usuario |
| Fallback de lectura → mock, **escritura → error** | Fallback simétrico | Nunca perder una venta en silencio. Regla: **lectura degrada, escritura falla fuerte** |
| Roles por permiso granular (`permisos` JSON) | RBAC hardcoded | El dueño cambia permisos sin deploy |
| Un solo proceso Electron que habla HTTP al backend | Lógica en el renderer | Reutiliza el mismo backend en web y desktop; una sola base de código |
| Prophet reentrenado nightly con versionado | Entrenar on-demand | Predicciones reproducibles y auditables; rollback de modelo |

---

## 3. Modelo de Datos — Delta exacto

### 3.1 Tablas nuevas (9)

```sql
-- F2: Identidad
CREATE TABLE usuarios (
    id              SERIAL PRIMARY KEY,
    username        VARCHAR(50) UNIQUE NOT NULL,
    email           VARCHAR(120) UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,   -- argon2/bcrypt, nunca plaintext
    nombre_completo VARCHAR(120) NOT NULL,
    rol             VARCHAR(20) NOT NULL DEFAULT 'cajero'
                    CHECK (rol IN ('admin','gerente','cajero')),
    permisos_extra  JSONB DEFAULT '{}',
    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    ultimo_acceso   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE refresh_tokens (
    id           SERIAL PRIMARY KEY,
    usuario_id   INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token_hash   VARCHAR(255) NOT NULL UNIQUE,
    expira_en    TIMESTAMPTZ NOT NULL,
    revocado     BOOLEAN NOT NULL DEFAULT FALSE,
    creado_en    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- F3: Operaciones que hoy viven solo en mocks
CREATE TABLE proveedores (
    id             SERIAL PRIMARY KEY,
    nombre         VARCHAR(120) NOT NULL,
    categoria      VARCHAR(50),
    contacto_nombre VARCHAR(120),
    telefono       VARCHAR(30),
    email          VARCHAR(120),
    direccion      VARCHAR(200),
    dias_entrega   INTEGER NOT NULL DEFAULT 3,
    pedido_minimo  NUMERIC(12,2) NOT NULL DEFAULT 0,
    activo         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE pedidos_proveedor (
    id                SERIAL PRIMARY KEY,
    proveedor_id      INTEGER NOT NULL REFERENCES proveedores(id),
    numero            VARCHAR(30) UNIQUE NOT NULL,
    estado            VARCHAR(20) NOT NULL DEFAULT 'borrador'
                      CHECK (estado IN ('borrador','enviado','confirmado','en_transito','recibido','cancelado')),
    fecha_pedido      DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_entrega_est DATE,
    fecha_recibido    DATE,
    total             NUMERIC(14,2) NOT NULL DEFAULT 0,
    notas             TEXT,
    creado_por        INTEGER REFERENCES usuarios(id),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE detalle_pedido_proveedor (
    id            SERIAL PRIMARY KEY,
    pedido_id     INTEGER NOT NULL REFERENCES pedidos_proveedor(id) ON DELETE CASCADE,
    producto_id   INTEGER NOT NULL REFERENCES productos(id),
    cantidad      NUMERIC(12,2) NOT NULL,
    costo_unitario NUMERIC(12,2) NOT NULL,
    subtotal      NUMERIC(14,2) GENERATED ALWAYS AS (cantidad * costo_unitario) STORED
);

CREATE TABLE mesas (
    id          SERIAL PRIMARY KEY,
    numero      INTEGER NOT NULL UNIQUE,
    zona        VARCHAR(30) NOT NULL,
    capacidad   INTEGER NOT NULL DEFAULT 4,
    estado      VARCHAR(20) NOT NULL DEFAULT 'libre'
                CHECK (estado IN ('libre','ocupada','reservada','limpieza','fuera_servicio')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ordenes_mesa (
    id          SERIAL PRIMARY KEY,
    mesa_id     INTEGER NOT NULL REFERENCES mesas(id),
    usuario_id  INTEGER REFERENCES usuarios(id),
    estado      VARCHAR(20) NOT NULL DEFAULT 'abierta'
                CHECK (estado IN ('abierta','cerrada','cancelada')),
    abierta_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
    cerrada_en  TIMESTAMPTZ,
    total       NUMERIC(14,2) NOT NULL DEFAULT 0
);

CREATE TABLE arqueos_caja (
    id             SERIAL PRIMARY KEY,
    usuario_id     INTEGER NOT NULL REFERENCES usuarios(id),
    fecha          DATE NOT NULL DEFAULT CURRENT_DATE,
    esperado_efectivo NUMERIC(14,2) NOT NULL,
    contado_efectivo   NUMERIC(14,2) NOT NULL,
    diferencia     NUMERIC(14,2) NOT NULL,
    desglose       JSONB NOT NULL DEFAULT '{}',  -- {100000: 3, 50000: 1, ...}
    estado         VARCHAR(20) NOT NULL DEFAULT 'abierto'
                   CHECK (estado IN ('abierto','cerrado')),
    observaciones  TEXT,
    cerrado_en     TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE auditoria (
    id          BIGSERIAL PRIMARY KEY,
    usuario_id  INTEGER REFERENCES usuarios(id),
    accion      VARCHAR(50) NOT NULL,      -- crear_venta, anular_venta, editar_producto...
    entidad     VARCHAR(50) NOT NULL,      -- venta, producto, pedido...
    entidad_id  INTEGER,
    datos_antes JSONB,
    datos_despues JSONB,
    ip          INET,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_auditoria_fecha ON auditoria(created_at DESC);
CREATE INDEX idx_auditoria_entidad ON auditoria(entidad, entidad_id);
```

### 3.2 Alteraciones a tablas existentes

| Tabla | Cambio | Motivo |
|---|---|---|
| `ventas` | `+ usuario_id`, `+ canal`, `+ estado`, `+ anulada_razon` | Trazabilidad y no_rep (devoluciones) |
| `ventas` | `+ updated_at` | Mutabilidad controlada |
| `movimientos_inventario` | `+ usuario_id` | Saber quién ajusta stock |
| `productos` | `+ codigo_barras`, `+ imagen_url`, `+ activo` ya existe → reutilizar | POS real |
| `predicciones` | `+ version_modelo`, `+ generado_en`, `+ mapeo` | Versionado de modelos ML |
| todas | `updated_at TIMESTAMPTZ DEFAULT now()` + trigger `touch` | Auditoría temporal |

### 3.3 Vistas de negocio

```sql
CREATE VIEW v_stock_valorizado AS
SELECT p.id, p.nombre, p.tipo, p.categoria,
       COALESCE(s.cantidad, 0) AS cantidad,
       COALESCE(s.costo_unitario, 0) AS costo_unitario,
       COALESCE(s.cantidad,0) * COALESCE(s.costo_unitario,0) AS valor_total,
       COALESCE(consumo_diario.promedio, 0) AS consumo_diario,
       CASE WHEN COALESCE(consumo_diario.promedio,0) > 0
            THEN COALESCE(s.cantidad,0) / consumo_diario.promedio
            ELSE NULL END AS cobertura_dias
FROM productos p
LEFT JOIN stock_materia_prima s ON s.producto_id = p.id
LEFT JOIN (
    SELECT producto_id, AVG(cantidad) AS promedio
    FROM movimientos_inventario
    WHERE tipo_movimiento IN ('salida','merma')
      AND created_at >= now() - INTERVAL '30 days'
    GROUP BY producto_id
) consumo_diario ON consumo_diario.producto_id = p.id;

CREATE VIEW v_ventas_por_hora AS
SELECT date_trunc('hour', fecha) AS hora,
       COUNT(*) AS ordenes,
       SUM(total) AS ingresos,
       AVG(total) AS ticket_promedio
FROM ventas WHERE estado = 'pagada'
GROUP BY 1 ORDER BY 1;
```

---

## 4. Contrato de API — Endpoints nuevos

### 4.1 Auth (`/api/auth`)

| Método | Path | Body / Query | Respuesta | Rol |
|---|---|---|---|---|
| POST | `/login` | `{username, password}` | `{access_token, refresh_token, expires_in, usuario}` | público |
| POST | `/refresh` | `{refresh_token}` | `{access_token}` | público |
| POST | `/logout` | `{refresh_token}` | `204` | autenticado |
| GET | `/me` | — | `{id, username, nombre, rol, permisos}` | autenticado |
| POST | `/usuarios` | `{username, password, nombre, rol}` | `201 usuario` | admin |
| GET | `/usuarios` | `?q=&rol=&activo=` | `[usuario]` | admin |
| PATCH | `/usuarios/{id}` | `{nombre?, rol?, activo?, password?}` | `usuario` | admin |
| POST | `/usuarios/{id}/reset-password` | `{nueva_password}` | `204` | admin |

### 4.2 Sesiones / POS (`/api/mesas`)

| Método | Path | Descripción |
|---|---|---|
| GET | `/` | `?zona=&estado=` → mesas con orden activa |
| POST | `/` | crear mesa (admin/gerente) |
| PATCH | `/{id}` | editar mesa |
| POST | `/{id}/abrir` | sentar clientes → crea `ordenes_mesa` |
| POST | `/{id}/items` | agregar item a la orden |
| DELETE | `/{id}/items/{item_id}` | quitar item |
| POST | `/{id}/cerrar` | cerrar cuenta → crea `venta` + descuenta stock |
| POST | `/{id}/liberar` | liberar reserva / pasar a limpieza |
| DELETE | `/{id}` | eliminar mesa |

### 4.3 Caja (`/api/caja`)

| Método | Path | Descripción |
|---|---|---|
| GET | `/esperado?fecha=` | efectivo esperado del día por método de pago |
| POST | `/conteo` | `{fecha, desglose: {denominacion: cantidad}}` → calcula total y diferencia |
| POST | `/cerrar` | cierra arqueo, escribe `arqueos_caja` |
| GET | `/historial?desde=&hasta=` | arqueos previos |
| GET | `/historial`/comparativo | desviaciones por cajero (detección de anomalías) |

### 4.4 Proveedores (`/api/proveedores`)

| Método | Path | Descripción |
|---|---|---|
| GET | `/` | directorio con filtros |
| POST | `/` | crear proveedor (admin) |
| PATCH | `/{id}` | editar |
| DELETE | `/{id}` | baja lógica |
| GET | `/stock-critico` | productos bajo cobertura + proveedor sugerido |
| GET | `/pedidos` | `?estado=&proveedor_id=` |
| POST | `/pedidos` | crear pedido + detalle |
| PATCH | `/pedidos/{id}` | cambiar estado (recibido → entra stock) |
| POST | `/pedidos/{id}/recibir` | recibe y genera movimientos de inventario |

### 4.5 Reportes (`/api/reportes`)

| Método | Path | Descripción |
|---|---|---|
| GET | `/ventas?desde=&hasta=&formato=` | pdf/xlsx/csv |
| GET | `/inventario` | valorización + cobertura |
| GET | `/prediccion` | reporte de producción sugerida |
| GET | `/caja` | arqueos + desviaciones |
| GET | `/ml` | calidad del modelo (MAPE/RMSE por producto) |

### 4.6 Sistema

| Método | Path | Descripción |
|---|---|---|
| GET | `/health` | liveness/readiness + versión + DB ping |
| GET | `/metrics` | Prometheus (request count, latency, errores) |
| GET | `/configuracion` | parámetros del negocio (IVA, moneda, umbrales) |
| PATCH | `/configuracion` | actualizar (admin) |

---

## 5. Plan de Fases (F0 → F8)

> Cada fase es **entregable y verificable**. No se avanza a la siguiente con la anterior a medias.

### F0 — Saneamiento y Fundaciones (0.5 día) 🟢

| ID | Tarea | Dep | Criterio de aceptación |
|---|---|---|---|
| F0-1 | Sweep de mojibake: 52 ocurrencias de `\uXXXX` + 1 en `requirements.txt` | — | `grep -r '\\u[0-9a-f]\{4\}' backend/` → 0 hits |
| F0-2 | Mover secretos a `.env`; crear `.env.example` con placeholders | — | `db_password` sale de `config.py` y `docker-compose.yml` |
| F0-3 | `.gitignore` completo (`node_modules`, `venv`, `.env`, `dist`, `models/`) | — | `git status` limpio tras clonar |
| F0-4 | `pyproject.toml` + `ruff` + `black` + `mypy` (strict en `app/`) | — | `ruff check app/` = 0 errores |
| F0-5 | `frontend`: ESLint + Prettier + `eslint-plugin-react-hooks` | — | `npm run lint` = 0 errores |
| F0-6 | `structured-logging`: JSON logs con `request_id`, `usuario_id`, `duracion_ms` | — | Cada request deja 1 línea JSON parseable |

**Entregable:** base de código limpia, secrets fuera, lint y logging listos.
**DoD:** `ruff` + `mypy` + `eslint` en verde; `git grep` no encuentra passwords.

---

### F1 — Base de Datos Real + Alembic (2 días) 🟡

| ID | Tarea | Dep | Criterio de aceptación |
|---|---|---|---|
| F1-1 | `alembic init` + `alembic.ini` con URL desde `settings.database_url` | F0-2 | `alembic current` funciona |
| F1-2 | Migración inicial: traducir `01_schema.sql` + `02_festivos.sql` a revisión Alembic `0001_initial` | F1-1 | `alembic upgrade head` sobre DB vacío = OK; `alembic downgrade base` = OK |
| F1-3 | Migración `0002_operational` con las 9 tablas nuevas + vista `v_stock_valorizado` | F1-2 | Sin errores en DB limpio |
| F1-4 | `docker-compose.yml` completo: `postgres` + `backend` + healthcheck + volumen | F1-1 | `docker compose up -d` levanta ambos; `/health` = `ok` |
| F1-5 | Script `scripts/cargar_datos_demo.py`: popula catálogo, recetas, MP, proveedores, mesas, 12 meses de ventas | F1-3 | `SELECT COUNT(*) FROM ventas` ≈ 12 meses × ~90/día |
| F1-6 | Generador de ventas usa **timestamps reales** con hora, no solo fecha | F1-5 | Heatmap 7×16 con distribución horaria coherente |
| F1-7 | Seed de usuarios: `admin/admin123!` (cambio forzado al primer login) | F1-5 | Login funciona contra DB real |
| F1-8 | Smoke test real: `pytest` contra DB de test | F1-4 | 1 test verde end-to-end con Postgres |

**Entregable:** `docker compose up` → Postgres + backend + datos de 12 meses.
**DoD:** **D1** cumplido. Un `docker compose down -v && up` reconstruye todo desde cero.

---

### F2 — Autenticación, Roles y Auditoría (2.5 días) 🔴

| ID | Tarea | Dep | Criterio de aceptación |
|---|---|---|---|
| F2-1 | Deps: `passlib[bcrypt]` o `argon2-cffi`, `python-jose`/`pyjwt`, `python-multipart` | F0 | `pip install` sin conflictos con Prophet |
| F2-2 | `app/core/security.py`: hash, verify, crear/verificar JWT | F2-1 | Tests: hash≠password, token expira |
| F2-3 | `app/dependencies.py`: `get_current_user`, `require_roles(...)`, `get_sucursal` | F2-2 | Dependency usable en routers |
| F2-4 | Router `auth.py` con los 8 endpoints de §4.1 | F2-3 | `/login` devuelve tokens válidos |
| F2-5 | Refresh token rotation + revocación (`refresh_tokens` table) | F2-4 | Reusar token revocado → 401 |
| F2-6 | Middleware de auditoría: hook en operaciones sensibles | F2-4 | Venta creada → fila en `auditoria` con `datos_antes/datos_despues` |
| F2-7 | Rate limiting en `/login` (5 intentos/min por IP+usuario) | F2-4 | 6to intento → 429 |
| F2-8 | `usuario_id` en `ventas` y `movimientos_inventario` + backfill | F1-3 | Todo venta histórica tiene usuario (system/admin) |
| F2-9 | Frontend: pantalla de login, store de sesión, interceptor que adjunta `Authorization` | F2-4 | Token se refresca solo ante 401 |
| F2-10 | Frontend: rutas protegidas por rol (configuración solo admin) | F2-9 | Cajero no ve `/configuracion` |

**Entregable:** login real, 3 roles, auditoría completa.
**DoD:** **D2** + **D8** cumplidos.

---

### F3 — Módulos Operativos en API (3 días) 🔴

> Hoy proveedores, mesas y cierre de caja **solo existen en mocks**. Aquí se vuelven realidad.

| ID | Tarea | Dep | Criterio de aceptación |
|---|---|---|---|
| F3-1 | Router `mesas.py` con los 9 endpoints de §4.2 | F2-3 | Crear → abrir → items → cerrar = venta persistida |
| F3-2 | Al cerrar cuenta: recalcular total desde DB (no desde el request) | F3-1 | Cliente no puede manipular el total |
| F3-3 | Router `caja.py` con los 5 endpoints de §4.3 | F2-3 | Conteo por denominación → total + diferencia exactos |
| F3-4 | Al cerrar caja: escribir `arqueos_caja` con desglose JSON | F3-3 | Historial consultable y exportable |
| F3-5 | Router `proveedores.py` con los 9 endpoints de §4.4 | F2-3 | `/stock-critico` usa `v_stock_valorizado` |
| F3-6 | Recibir pedido → genera `movimientos_inventario` tipo `entrada` | F3-5 | Stock sube, kardex refleja |
| F3-7 | Router `configuracion.py` (parámetros: IVA 19%/0%, moneda, umbrales, nombre negocio) | F2-3 | Frontend lee valores, no hardcodea |
| F3-8 | Router `reportes.py` con 5 reportes (PDF/XLSX server-side) | F3-1, F3-3 | Descarga el archivo correcto |
| F3-9 | Frontend: `api_proveedores`, `api_mesas`, `api_caja` replacing mocks | F3-1, F3-3, F3-5 | Las 3 páginas leen/escriben en DB |
| F3-10 | Frontend: `store/` con TanStack Query como fuente única (eliminar estado duplicado) | F3-9 | Recargar la página NO pierde datos |

**Entregable:** las 9 páginas del dashboard talked to a real DB.
**DoD:** **D3** (sin fallback silencioso en escritura) + **D13**.

---

### F4 — Regla de Degradación y Resiliencia (1 día) 🟡

| ID | Tarea | Dep | Criterio de aceptación |
|---|---|---|---|
| F4-1 | Separar `smartRead` (degrada a mock) de `smartWrite` (falla fuerte) | F3-9 | Escritura con backend caído = toast de error, NO venta fantasma |
| F4-2 | Banner persistente "Modo sin conexión — los datos NO se guardarán" | F4-1 | Visible solo cuando el backend no responde |
| F4-3 | Retry exponencial (3 intentos) en lecturas | F4-1 | Falla transitoria se recupera sola |
| F4-4 | `useMutation` con invalidación de queries coherente | F3-10 | Tras cobrar, KPIs y stock se actualizan sin refresh |
| F4-5 | Manejo de `409 Conflict` (stock insuficiente) en UI | F4-4 | Mensaje claro al cajero |

**Entregable:** la app nunca pierde datos en silencio.
**DoD:** **D3** verificado con el backend apagado.

---

### F5 — Calidad: Tests y CI (3.5 días) 🔴

| ID | Tarea | Dep | Criterio de aceptación |
|---|---|---|---|
| F5-1 | Backend: `pytest` + `pytest-cov` + fixtures (DB de test con rollback) | F1-8 | Suite corre en < 60s |
| F5-2 | Tests de auth: hash, expiración, refresh rotation, RBAC por rol | F2-4 | ≥90% cobertura de `security.py` |
| F5-3 | Tests de routers: CRUD completo + casos 401/403/404/422 | F3-8 | ≥80% cobertura total |
| F5-4 | Tests de ML: MAPE calculado sobre serie conocida; split train/test | F1-5 | MAPE < 15% en producto estable |
| F5-5 | Tests de triggers: venta descuenta stock; merma reduce; anulación revierte | F1-2 | Stock cuadra al centavo |
| F5-6 | Frontend: `Vitest` + `React Testing Library` | F0-5 | ≥70% cobertura |
| F5-7 | Tests de componentes críticos: `CierreCaja`, `Mesas`, `RegistrarVenta` | F5-6 | Renderizan y validan |
| F5-8 | E2E `Playwright`: 8 flujos (§6.3) | F5-7 | Suite verde en CI |
| F5-9 | CI `GitHub Actions`: lint → typecheck → test → build → docker → e2e | F5-8 | Badge verde; PR bloqueado si falla |
| F5-10 | Pre-commit hooks (`ruff`, `eslint`, `prettier`) | F0-4 | Commit con violation = rechazado |
| F5-11 | Workflow de release: tag → build .exe → publicar artefacto | F5-9 | `.exe` descargable desde Releases |

**Entregable:** red de seguridad + CI verde.
**DoD:** **D4**, **D5**, **D6** cumplidos.

---

### F6 — Empaquetado Electron (2 días) 🟡

| ID | Tarea | Dep | Criterio de aceptación |
|---|---|---|---|
| F6-1 | `electron/main.ts`: BrowserWindow, preload con contextBridge, sin `nodeIntegration` | — | `window.api` expone solo lo permitido |
| F6-2 | Preload: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` | F6-1 | Aislamiento verificado |
| F6-3 | Backend empaquetado: PyInstaller o uvicorn como sidecar | F6-1 | El .exe levanta el backend en `127.0.0.1:8000` |
| F6-4 | `electron-builder.yml`: NSIS instalador + portable `.exe` | F6-3 | Ambos artefactos se generan |
| F6-5 | Ícono + metadata (nombre, versión, publisher) | F6-4 | Aparece correcto en "Agregar/Quitar" |
| F6-6 | Health-check del sidecar: espera activa antes de abrir la ventana | F6-3 | No hay pantalla en blanco por race condition |
| F6-7 | Log del backend a archivo (`%APPDATA%/SIGPROV/logs/`) con rotación | F6-3 | 3 archivos, máx 10 MB cada uno |
| F6-8 | Pruebas en **Windows limpio** (sin Python/Node) | F6-4 | Instala, abre, funciona |

**Entregable:** `.exe` portable que corre en cualquier Windows.
**DoD:** **D7** cumplido.

---

### F7 — Observabilidad, Backups y Operación (1.5 días) 🟡

| ID | Tarea | Dep | Criterio de aceptación |
|---|---|---|---|
| F7-1 | `/health` (liveness) + `/ready` (DB ping) | F1-4 | Docker healthcheck lo usa |
| F7-2 | `/metrics` estilo Prometheus (requests, latencia, errores, negocio) | F2-6 | Scrapeable |
| F7-3 | Logging JSON con rotación + `request_id` en toda la cadena | F0-6 | Traza una venta completa con grep |
| F7-4 | Script `scripts/backup.sh`/`.ps1`: `pg_dump` diario comprimido | F1-4 | Backup en `backups/` con fecha |
| F7-5 | Script `scripts/restore.sh`: restaura sobre DB limpia | F7-4 | **Restore probado y documentado** |
| F7-6 | Retención: 7 diarios + 4 semanales | F7-4 | Política configurable |
| F7-7 | `docs/RUNBOOK.md`: qué hacer si la app no arranca, si Postgres cae, si el modelo ML falla | F7-3 | Un dev nuevo lo resuelve con el doc |
| F7-8 | `docs/ARQUITECTURA.md`: diagramas + flujo de datos | — | Cubre §2 |
| F7-9 | `docs/GUIA_USUARIO.md`: manual del cajero + del dueño | — | Con capturas |

**Entregable:** el sistema se puede operar y recuperar.
**DoD:** **D9**, **D10**, **D11** cumplidos.

---

### F8 — Go-Live y Cierre (2 días) 🟢

| ID | Tarea | Dep | Criterio de aceptación |
|---|---|---|---|
| F8-1 | Migración de datos: importador de inventario real (Excel del proveedor) | F3-6 | Carga 500+ SKUs con validación de errores |
| F8-2 | Importador de histórico de ventas (CSV) → tabla `ventas` | F8-1 | 12 meses reales cargados |
| F8-3 | Impresión de ticket POS (80mm) | F3-8 | Ticket con IVA y gratitude |
| F8-4 | Modo "modo papel" (sin internet): todo local, exporta al final | F6-1 | Piloto sin internet funciona |
| F8-5 | Checklist de piloto: 2 semanas, 1 sucursal, 3 usuarios | F8-1..4 | Checklist firmado |
| F8-6 | Plan de rollback: snapshot DB + .exe anterior + config anterior | F8-5 | Restaurable en <10 min |
| F8-7 | Capacitación: video de 5 min por rol + sesión con el equipo | F8-5 | 3 videos publicados |
| F8-8 | Post-mortem y backlog de lo que quedó fuera | F8-5 | Documentado |

**Entregable:** piloto real en producción.
**DoD:** **D14** cumplido → **100% profesional empresarial**.

---

## 6. Estrategia de QA

### 6.1 Pirámide de tests

```
         /\
        /  \        E2E (Playwright)        ~8 flujos   ~15 tests   ~2% tiempo
       /____\       
      /      \      Integración (pytest)   routers+DB  ~120 tests  ~40%
     /________\    
    /          \   Unitarios (pytest/vitest) lógica      ~250 tests  ~45%
   /____________\  
```

### 6.2 Cobertura objetivo

| Módulo | Backend | Frontend |
|---|---|---|
| `app/core/security.py` | 95% | — |
| `app/routers/*` | 85% | — |
| `app/ml/*` | 75% | — |
| `app/services/*` | 80% | — |
| Páginas React | — | 70% |
| Componentes UI | — | 60% |
| **Global** | **≥80%** | **≥70%** |

### 6.3 Los 8 flujos E2E críticos (E2E-1 … E2E-8)

| ID | Flujo | Resultado esperado |
|---|---|---|
| E2E-1 | Login admin → ver dashboard | KPIs cargan desde DB real |
| E2E-2 | Login cajero → cobrar mesa → cobrar producto | Venta persistida, stock descontado, ticket impreso |
| E2E-3 | Admin crea mesa → la abre → agrega items → cierra | Total recalculado en servidor, mesa vuelve a `libre` |
| E2E-4 | Recepción de pedido a proveedor | Stock sube, kardex refleja, cobertura se actualiza |
| E2E-5 | Cierre de caja con conteo correcto → cuadre | Arqueo guardado, diferencia $0 |
| E2E-6 | Cierre de caja con diferencia → sobrante | Registra diferencia, genera alerta |
| E2E-7 | Entrenar modelo ML → ver predicción 7 días | MAPE reportado, predicción persistida con versión |
| E2E-8 | Backend apagado → intentar cobrar | Error visible, **NO** venta fantasma |

---

## 7. Seguridad (OWASP Top 10 — cobertura)

| Riesgo | Mitigación | Tarea |
|---|---|---|
| A01 Broken Access Control | RBAC en cada endpoint + tests 403 | F2-3, F5-2 |
| A02 Cryptographic Failures | argon2/bcrypt, JWT firmados, secrets en `.env` | F0-2, F2-2 |
| A03 Injection | SQLAlchemy parametrizado (nada de f-strings en SQL) | continuo |
| A04 Insecure Design | Regla escritura-falla-fuerte; idempotencia en ventas | F4-1 |
| A05 Security Misconfiguration | CORS por env, helmet-equivalent, sin debug en prod | F0-4 |
| A06 Vulnerable Components | `pip-audit` + `npm audit` en CI | F5-9 |
| A07 Auth Failures | Rate limit, refresh rotation, bloqueo tras 5 fallos | F2-5, F2-7 |
| A08 Data Integrity | Fallos de integridad DB, checksum en backups | F7-4 |
| A09 Logging Failures | Auditoría + logs JSON de operaciones sensibles | F2-6, F7-3 |
| A10 SSRF | El backend solo llama a URLs whitelisted | n/a |

**Checklist adicional:** `.env` nunca commiteado · sin secretos en el frontend bundle · CSP en Electron · `sandbox: true` · validación de entrada con Pydantic en todo endpoint.

---

## 8. DevOps

### 8.1 Pipeline CI/CD

```
PR → [lint: ruff + eslint] → [typecheck: mypy + tsc] → [unit: pytest + vitest]
   → [build: docker image + vite build] → [e2e: playwright] → ✅ merge
main/tag → [build .exe] → [release: artefactos] → [deploy: installer firmado]
```

### 8.2 Ambientes

| Entorno | Datos | Backend | DB |
|---|---|---|---|
| `local` | Demo (12 meses sintéticos) | `uvicorn --reload` | Docker Postgres |
| `test` | Reset por test | pytest fixtures | `sigprov_test` |
| `staging` | Copia anonimizada real | Docker Compose | Postgres docker |
| `prod` | Real | systemd / Task Scheduler + monitor | Postgres nativo + backups |

### 8.3 Operación diaria

| Tarea | Frecuencia | Responsable |
|---|---|---|
| Backup `pg_dump` | Diaria 02:00 | Automático (cron/Task Scheduler) |
| Rotación de logs | Automática | Docker/Fluentbit |
| Verificar salud del backend | Cada 5 min | Monitor |
| Reentrenar modelo ML | Diaria 03:00 (tras cierre) | Automático |
| Revisar cola de alertas | Diaria | Dueño del negocio |
| Restore drill | Mensual | Dev |

---

## 9. Fuera de alcance (anti-sobreingeniería)

Para evitar que el proyecto crezca sin control, **explícitamente NO hacemos** en esta versión:

| Descartado | Razón |
|---|---|
| Multi-tenant / multi-sucursal | Un negocio, una sede. Se resuelve con `sucursal_id` después |
| Kiosco / app móvil nativa | El Electron cubre escritorio; móvil es otro proyecto |
| Pagos electrónicos / PSE | Integración con pasarela externa es otro proyecto |
| Facturación electrónica DIAN | Requiere proveedor de facturación certificado |
| Códigos QR / loyalty | No aporta al objetivo de predicción |
| Dashboard de BI高级 / Power BI | PostgreSQL + Metabase resuelven sin código |
| IA generativa en el producto | El chatbot actual es guía del dashboard; no generar datos de negocio |
| Migración a microservicios | Monolito modular es correcto a esta escala |
| Kubernetes | 1 panadería no necesita orquestación |
| SSO / LDAP | Roles internos cubren el caso |
| Versionado del modelo ML en MLflow | `predicciones.version_modelo` + filesystem bastan |

---

## 10. Riesgos

| # | Riesgo | Prob. | Impacto | Mitigación | Tarea |
|---|---|---|---|---|---|
| R1 | El alcance指定的 es demasiado grande para el tiempo disponible | Alta | Alto | Priorizar MUST → SHOULD; F0-F4 son el núcleo | — |
| R2 | Prophet no compila en la máquina de los compañeros | Media | Alto | `numpy<2.0` pineado + wheel precompilado | F0-1 |
| R3 | El modelo predice mal con poco histórico | Alta | Medio | Fallback a promedio simple + badge "baja confianza" | F5-4 |
| R4 | Datos sintéticos no reflejan la operación real | Media | Alto | Importadores de Excel/CSV (F8-1, F8-2) | F8 |
| R5 | Merma/conversión difiere entre panaderías | Media | Medio | Recetas y factores configurables por negocio | F3-7 |
| R6 | Bugs en POSalin en pleno servicio | Media | Crítico | E2E de flujos de cobro + plan de rollback | F5-8, F8-6 |
| R7 | Scope creep hacia "sistema completo de panadería" | Alta | Medio | Sección §9 como frontera explícita | continuo |

---

## 11. Timeline y Esfuerzo

| Fase | Duración | Acumulado | Hito verificable |
|---|---|---|---|
| F0 Saneamiento | 0.5 d | 0.5 d | Lint/typecheck verdes, secrets fuera |
| F1 DB + Alembic | 2 d | 2.5 d | `docker compose up` = DB con 12 meses de datos |
| F2 Auth + roles | 2.5 d | 5 d | Login real, auditoría activa |
| F3 Módulos API | 3 d | 8 d | Las 9 páginas habland con DB |
| F4 Resiliencia | 1 d | 9 d | Cero ventas fantasma |
| F5 Tests + CI | 3.5 d | 12.5 d | CI verde, 8 E2E en verde |
| F6 Electron | 2 d | 14.5 d | `.exe` portable funcionando |
| F7 Observabilidad | 1.5 d | 16 d | Backups + runbook + métricas |
| F8 Go-live | 2 d | 18 d | Piloto corriendo |
| **Buffer** | **2 d** | **20 d** | Imprevistos, polishes |

**Plan de 4 sprints de 1 semana:**

| Sprint | Contenido | Al final |
|---|---|---|
| **S1** | F0 + F1 | Backend con DB real y datos reales |
| **S2** | F2 + F3 | Login + las 9 páginas contra DB |
| **S3** | F4 + F5 + F6 | Tests, CI, .exe |
| **S4** | F7 + F8 + pilotaje | Sistema en producción |

---

## 12. Backlog Priorizado (MOO / DEBE / PUEDE)

### 🔴 MUST — sin esto no hay producto (8 días)
`F0-1` … `F0-6` · `F1-1` … `F1-8` · `F2-1` … `F2-10` · `F3-1` … `F3-10` · `F4-1` … `F4-5`

### 🟡 SHOULD — para que sea mantenible (7 días)
`F5-1` … `F5-11` · `F6-1` … `F6-8` · `F7-1` … `F7-9`

### 🟢 COULD — si hay tiempo (5 días)
`F8-1` … `F8-8`

### ⚪ WON'T (esta versión)
Sección §9 completa.

---

## 13. Primer Paso Concreto (arranque en 30 minutos)

```powershell
# Terminal 1 — Base de datos + backend
cd "C:\Users\pikie\Documents\Proyecto Integrador\GRUPO_XX_SIGPROV\16_INVENTARIO_FORECAST"
docker compose up -d postgres

# Verificar que Postgres responde
docker exec -it sigprov-postgres psql -U sigprov -d sigprov -c "\dt"

# Crear .env desde el ejemplo (con credenciales reales)
copy .env.example .env

# Aplicar schema (hoy manual; mañana Alembic)
docker exec -i sigprov-postgres psql -U sigprov -d sigprov < backend\sql\01_schema.sql
docker exec -i sigprov-postgres psql -U sigprov -d sigprov < backend\sql\02_festivos.sql

# Terminal 2 — Backend
cd backend
.\venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Terminal 3 — Frontend
cd ..\frontend
npm install
npm run dev

# Verificar
curl http://localhost:8000/health
# → {"status":"ok","database":"ok","version":"2.0.0"}
```

Cuando `/health` responda `ok` con la DB conectada, **F1 empieza a estar cumplido** y ya podemos atacar auth.

---

## 14. Preguntas Abiertas (decidir antes de F2)

| # | Pregunta | Recomendación | Decisión de Ronald |
|---|---|---|---|
| Q1 | ¿Un solo negocio con varias sedes, o un solo negocio? | `sucursal_id` en todas las tablas desde ya (cuesta 2h ahora, 2 semanas después) | ☐ |
| Q2 | ¿El cajero puede anular una venta? | No, solo admin/gerente;留下 siempre queda en auditoría | ☐ |
| Q3 | ¿Los combos se expanden a productos en el stock? | Sí, se venden como producto compuesto y se descuentan sus insumos | ☐ |
| Q4 | ¿Mismo precio de venta para todos? | Precio por producto + override por tipo de cliente (mayorista) | ☐ |
| Q5 | ¿Impresión de ticket desde la app o desde impresora de 80mm del sistema? | pywin32 hacia la impresora instalada | ☐ |
| Q6 | ¿ML por producto o por categoría? | Por producto, con fallback a categoría si hay <60 días | ☐ |

---

**Fin del documento.** Actualización: `SPEC_EMPRESARIAL.md` v3.0 — 2026-10-25

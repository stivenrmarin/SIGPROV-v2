# SPEC-001 — Sistema de Inventario + Predicción de Ventas

**Proyecto Integrador 2026-2 — Universidad San Mateo**
**Estudiante:** Ronald Steven Marín Rincón
**Fecha:** 19-oct-2026
**Versión:** 2.0 — Pivot desde SIGPROV con feedback del profesor

---

## 1. Concepto

Sistema web full-stack para **cualquier tipo de local/negocio** (panadería,
panadería+cafetería, tienda de barrio, restaurante, etc.) que integra tres
módulos en una sola plataforma:

1. **Inventario dual con kardex** — productos terminados (panes, bebidas
   Postobón) + materia prima (harina, levadura, mantequilla). Movimientos
   de entrada/salida/ajuste/merma siempre cuadrados.
2. **Registro de ventas (POS simplificado)** — cada venta descuenta stock de
   productos terminados y, si el producto tiene receta, descuenta también la
   materia prima usada. Alimenta el dataset de ML.
3. **Predicción de ventas con ML** — entrena con el histórico de ventas del
   mismo sistema. Tiene en cuenta **día de la semana, festivos colombianos
   (Ley Emiliani)** y tendencia anual. Predice cuánto se va a vender la
   próxima semana con intervalo de confianza.

Está pensado para que lo use el **dueño del negocio** (no el técnico). UX simple,
sin jerga, en español colombiano.

---

## 2. Caso de estudio (para el demo académico)

**Panadería-Cafetería "El Rincón"** — local de barrio en Bogotá.

- ~30 **productos terminados** divididos en:
  - Panes (pan francés, pan dulce, almojábana, croissant, pandebono, etc.)
  - Pasteles (torta de chocolate, torta de arequipe, brazo de reina)
  - Cafés y bebidas calientes (tinto, café con leche, capuchino, aromática)
  - **Bebidas Postobón** (Colombiana, Manzana Postobón, Pony Malta, Hit
      naranja, Hit mango, Brisa, Agua Cristal, Mr. Tea)
  - Otros (galletas, paquetes)
- ~15 **materias primas** (harina, levadura, mantequilla, azúcar, sal, queso,
  arequipe, leche, etc.)
- ~80 ventas/día entre semana, ~120 ventas/día fines de semana (NO feriados)
- En **feriados y festivos** las ventas BAJAN ~30% (la gente sale de paseo)
- Horario: 6am – 8pm
- Ticket promedio: $8.500 COP
- Datos sintéticos: 12 meses de ventas (oct 2025 → oct 2026) con estacionalidad
  semanal + festivos colombianos reales (Ley Emiliani) + tendencia suave + ruido

> Nota: la plataforma funciona para cualquier tipo de local. El caso de
> panadería+cafetería con Postobón es solo para el demo de sustentación.

---

## 3. Stack (se mantiene del proyecto anterior)

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite + TypeScript + shadcn/ui + TailwindCSS |
| Backend | FastAPI + Uvicorn + Pydantic |
| DB | PostgreSQL 16 |
| ML | Prophet (Meta) + pandas + scikit-learn (métricas) |
| Deploy | Docker + Docker Compose |
| Launcher | `python main.py` |

**Lo que se elimina:**
- pgvector (no hay embeddings)
- sentence-transformers
- LightGBM / XGBoost / SHAP
- Fairlearn
- mesa (ABM)

---

## 4. Modelo de datos (núcleo del sistema)

### 4.1 `productos`
| Campo | Tipo | Notas |
|---|---|---|
| id | SERIAL PK | |
| nombre | VARCHAR(120) UNIQUE NOT NULL | |
| tipo | VARCHAR(20) NOT NULL | 'terminado' / 'materia_prima' |
| categoria | VARCHAR(60) NOT NULL | panes / pasteles / bebidas / bebidas_postobon / galletas / materia_prima / otros |
| precio_venta | NUMERIC(12,2) NULL | NULL para materia prima (no se vende directo) |
| costo_unitario | NUMERIC(12,2) NOT NULL | en COP |
| unidad | VARCHAR(20) NOT NULL DEFAULT 'unidad' | unidad / docena / kg / litros |
| stock_actual | INTEGER NOT NULL DEFAULT 0 | para materia prima puede ser fraccionario vía NUMERIC |
| stock_minimo | INTEGER NOT NULL DEFAULT 5 | umbral para alerta |
| activo | BOOLEAN NOT NULL DEFAULT TRUE | |
| created_at | TIMESTAMPTZ NOT NULL DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ NOT NULL DEFAULT NOW() | |

> Nota: para materia prima el stock se maneja en `NUMERIC(10,3)` (gramos/kilos)
> a través de tabla accesoria `stock_materia_prima` (ver 4.5).

### 4.2 `stock_materia_prima` (separada porque la materia prima usa fracciones)
| Campo | Tipo | Notas |
|---|---|---|
| producto_id | INTEGER PK FK → productos.id | |
| cantidad_actual | NUMERIC(10,3) NOT NULL DEFAULT 0 | en la `unidad` definida en `productos` |
| updated_at | TIMESTAMPTZ NOT NULL DEFAULT NOW() | |

### 4.3 `recetas` (BOM — Bill of Materials)
| Campo | Tipo | Notas |
|---|---|---|
| id | SERIAL PK | |
| producto_terminado_id | INTEGER FK → productos.id NOT NULL | producto que se vende al cliente |
| materia_prima_id | INTEGER FK → productos.id NOT NULL | insumo usado |
| cantidad_necesaria | NUMERIC(10,3) NOT NULL | cantidad de materia prima por 1 unidad de producto terminado |
| UNIQUE | (producto_terminado_id, materia_prima_id) | no se duplica la misma relación |

**Ejemplos:**
- Pan francés → 0.300 kg harina + 0.050 kg levadura + 0.020 kg mantequilla + 0.005 kg sal
- Colombiana Postobón → 0 (es un producto que se compra terminado, no se produce)
- Croissant → 0.150 kg harina + 0.040 kg mantequilla + 0.030 kg azúcar + 0.025 kg leche

> Solo los productos **hechos en casa** tienen receta. Los productos Postobón
> NO tienen receta (se compran ya elaborados).

### 4.4 `movimientos_inventario` (kardex unificado)
| Campo | Tipo | Notas |
|---|---|---|
| id | SERIAL PK | |
| producto_id | INTEGER FK → productos.id NOT NULL | |
| tipo_movimiento | VARCHAR(20) NOT NULL | 'entrada' / 'salida' / 'ajuste' / 'merma' / 'consumo_produccion' |
| cantidad | NUMERIC(10,3) NOT NULL | siempre positivo |
| unidad | VARCHAR(20) NOT NULL | copia de la unidad al momento del movimiento |
| motivo | VARCHAR(200) NULL | texto libre |
| referencia | VARCHAR(60) NULL | ej. "venta #1234" / "compra proveedor X" / "produccion pan #5" |
| created_at | TIMESTAMPTZ NOT NULL DEFAULT NOW() | |

**Trigger:** cada INSERT actualiza el stock del producto.
- `entrada` → stock += cantidad
- `salida` / `merma` / `consumo_produccion` → stock -= cantidad
- `ajuste` → stock = cantidad (caso conteo físico)

### 4.5 `ventas`
| Campo | Tipo | Notas |
|---|---|---|
| id | SERIAL PK | |
| fecha | TIMESTAMPTZ NOT NULL DEFAULT NOW() | |
| total | NUMERIC(12,2) NOT NULL | |
| metodo_pago | VARCHAR(20) NOT NULL DEFAULT 'efectivo' | efectivo / transferencia / datáfono |
| notas | VARCHAR(200) NULL | |
| created_at | TIMESTAMPTZ NOT NULL DEFAULT NOW() | |

### 4.6 `detalle_ventas`
| Campo | Tipo | Notas |
|---|---|---|
| id | SERIAL PK | |
| venta_id | INTEGER FK → ventas.id NOT NULL ON DELETE CASCADE | |
| producto_id | INTEGER FK → productos.id NOT NULL | debe ser tipo='terminado' |
| cantidad | INTEGER NOT NULL | |
| precio_unitario | NUMERIC(12,2) NOT NULL | congelado al momento de la venta |
| subtotal | NUMERIC(12,2) NOT NULL | cantidad × precio_unitario |

**Trigger:** cada INSERT en `detalle_ventas`:
1. Crea movimiento `salida` en kardex del producto vendido
2. Si el producto tiene receta, crea movimientos `consumo_produccion` para
   cada materia prima (cantidad × cantidad_necesaria)

Esto garantiza que el inventario SIEMPRE cuadre con las ventas, y que al
vender 1 pan también se descuente la harina y levadura usadas.

### 4.7 `predicciones` (log de predicciones servidas)
| Campo | Tipo | Notas |
|---|---|---|
| id | SERIAL PK | |
| fecha_prediccion | DATE NOT NULL | día que se predice |
| producto_id | INTEGER FK → productos.id NULL | NULL = total del local |
| cantidad_predicha | NUMERIC(12,2) NOT NULL | valor central |
| limite_inferior | NUMERIC(12,2) NOT NULL | intervalo de confianza |
| limite_superior | NUMERIC(12,2) NOT NULL | intervalo de confianza |
| cantidad_real | NUMERIC(12,2) NULL | se llena al final del día |
| error_pct | NUMERIC(6,2) NULL | se calcula cuando se conoce el real |
| modelo_version | VARCHAR(30) NOT NULL | ej. "prophet-2026-10-19-v1" |
| created_at | TIMESTAMPTZ NOT NULL DEFAULT NOW() | |

### 4.8 `calendario_festivos` (para el ML)
| Campo | Tipo | Notas |
|---|---|---|
| fecha | DATE PK | |
| nombre | VARCHAR(60) NOT NULL | ej. "Día de la Raza" |
| tipo | VARCHAR(15) NOT NULL | 'festivo' / 'puente' / 'semana_santa' / 'navidad' / 'fin_anio' |
| efecto_venta | NUMERIC(4,2) NOT NULL DEFAULT -0.30 | multiplicador (ej. -0.30 = vende 30% menos) |

> Pre-cargado con todos los festivos 2025-2026 según calendario oficial colombiano
> (incluyendo traslados al lunes por Ley Emiliani).

---

## 5. Endpoints REST (API)

### Productos
- `GET    /api/productos?tipo=terminado` — lista (filtra por tipo)
- `POST   /api/productos` — crea producto
- `GET    /api/productos/{id}` — detalle (incluye receta si es terminado)
- `PATCH  /api/productos/{id}` — actualiza
- `DELETE /api/productos/{id}` — soft delete
- `PUT    /api/productos/{id}/receta` — reemplaza la receta completa

### Inventario / Kardex
- `GET    /api/inventario/stock` — stock actual de todos (terminados + MP)
- `GET    /api/inventario/alertas` — productos bajo stock_minimo
- `GET    /api/inventario/kardex?producto_id=X&desde=...&hasta=...`
- `POST   /api/inventario/entrada` — registra entrada (compra proveedor / Postobón)
- `POST   /api/inventario/ajuste` — ajuste por conteo físico
- `POST   /api/inventario/merma` — registra merma

### Ventas
- `POST   /api/ventas` — registra venta (dispara triggers: stock + MP + log)
- `GET    /api/ventas?desde=...&hasta=...`
- `GET    /api/ventas/{id}` — detalle
- `GET    /api/ventas/resumen/hoy`
- `GET    /api/ventas/resumen/rango?desde=...&hasta=...`

### Predicción (ML)
- `POST   /api/prediccion/entrenar` — reentrena Prophet (background job)
- `GET    /api/prediccion/entrenar/{job_id}` — estado del job
- `GET    /api/prediccion/proxima-semana` — predicción próximos 7 días (con festivos)
- `GET    /api/prediccion/proximo-mes`
- `GET    /api/prediccion/producto/{id}?dias=7`
- `GET    /api/prediccion/metricas` — MAPE / MAE histórico

### Dashboard (agregaciones para UI del dueño)
- `GET    /api/dashboard/resumen` — KPIs para "Hoy"
- `GET    /api/dashboard/semana` — serie diaria + predicción próximos 7 días
- `GET    /api/dashboard/top-productos?dias=30`
- `GET    /api/dashboard/alertas-stock` — para widgets

### Util
- `GET    /health`
- `GET    /metrics` — versión + uptime

---

## 6. ML: predicción de ventas con Prophet

### Modelo
Prophet (Meta) configurado con:
- **Estacionalidad semanal** automática (sábado pico, lunes bajo)
- **Estacionalidad anual** automática (diciembre alto, mitad de año bajo)
- **Festivos personalizados** cargados desde `calendario_festivos` con efecto
  negativo (-30% por defecto)
- Cambepoint detection para detectar cambios de tendencia

### Features que alimentan al modelo
- Serie diaria de ventas totales (`fecha`, `total`)
- Festivos (binario) + multiplicador de efecto
- Días desde apertura del local (para tendencia)

### Salidas
- Predicción puntual (valor esperado)
- Límite inferior y superior (intervalo de confianza 95%)

### Métricas de evaluación
- **MAPE** (Mean Absolute Percentage Error) — principal
- **MAE** (Mean Absolute Error) — en COP
- Comparación vs baseline "promedio últimos 30 días"

**Objetivo:** MAPE ≤ 25% en producto más vendido (umbral académicamente razonable).

---

## 7. Generador de datos sintéticos (12 meses)

Script `scripts/generar_datos_sinteticos.py` que crea:

### Productos
- 30 productos terminados (mezcla panes + bebidas Postobón)
- 15 materias primas
- Recetas para panes y pasteles (Postobón sin receta)

### Movimientos
- Compras periódicas a proveedores (entradas de materia prima)
- Reposiciones de Postobón cada 3-4 días

### Ventas (12 meses, oct 2025 → oct 2026)
Para cada día genera N ventas con:
- **Día de semana**: lunes a jueves = bajo, viernes = medio, sábado = alto,
  domingo = alto pero < sábado
- **Festivos/Puentes**: ventas × 0.70 (-30%)
- **Semana Santa**: ventas × 0.10 (cerrado casi todo)
- **Navidad/Fin de año**: ventas × 1.40 (+40%)
- **Tendencia anual**: +2% mensual acumulado
- **Ruido**: ±15% aleatorio
- **Hora**: 70% de ventas entre 6am-12pm, 30% entre 12pm-8pm
- **Productos vendidos**: distribución sesgada (algunos productos son bestsellers)

### Festivos 2025-2026
Cargados manualmente desde el calendario oficial colombiano con traslados
Ley Emiliani:
- 1 enero (Año Nuevo)
- 6 enero (Reyes)
- 24 marzo (San José)
- 1 mayo (Día del Trabajo)
- 2 junio (Ascensión)
- 23 junio (Corpus Christi)
- 30 junio (San Pedro)
- 20 julio (Independencia)
- 7 agosto (Batalla de Boyacá)
- 18 agosto (Asunción)
- 12 octubre (Día de la Raza)
- 2 noviembre (Todos los Santos)
- 17 noviembre (Independencia de Cartagena)
- 8 diciembre (Inmaculada Concepción)
- 25 diciembre (Navidad)

---

## 8. Estructura de archivos del nuevo proyecto

```
GRUPO_XX_SIGPROV/
├── main.py                          # modificado — apunta a 16_INVENTARIO_FORECAST
├── 00_FICHA_INICIO_PROYECTO.md     # actualizado para reflejar el pivot
├── CHANGELOG.md                     # entrada v2.0.0 pivot
├── 14_ARQUITECTURA_Y_PLAN/          # referencia histórica, se conserva
├── 15_NUEVA_PLATAFORMA/             # SIGUIENTE PROYECTO — referencia histórica
│   └── _LEEME.txt                   # "Este código es el proyecto anterior, archivado por pivot"
└── 16_INVENTARIO_FORECAST/          # ← ESTE ES EL PROYECTO ACTIVO
    ├── README.md
    ├── SPEC.md                      # este documento
    ├── docker-compose.yml
    ├── backend/
    │   ├── requirements.txt
    │   ├── Dockerfile
    │   ├── sql/
    │   │   ├── 01_schema.sql
    │   │   ├── 02_festivos.sql
    │   │   └── 03_seed_basico.sql
    │   ├── scripts/
    │   │   └── generar_datos_sinteticos.py
    │   └── app/
    │       ├── main.py
    │       ├── config.py
    │       ├── database.py
    │       ├── models.py
    │       ├── schemas.py
    │       ├── routers/
    │       │   ├── productos.py
    │       │   ├── inventario.py
    │       │   ├── ventas.py
    │       │   ├── prediccion.py
    │       │   └── dashboard.py
    │       ├── services/
    │       │   ├── inventario_service.py
    │       │   ├── ventas_service.py
    │       │   └── prediccion_service.py
    │       └── ml/
    │           ├── trainer.py
    │           ├── predictor.py
    │           └── metrics.py
    ├── frontend/
    │   ├── package.json
    │   ├── vite.config.ts
    │   ├── index.html
    │   └── src/
    │       ├── main.tsx
    │       ├── App.tsx
    │       ├── components/
    │       │   ├── layout/
    │       │   │   ├── app-shell.tsx
    │       │   │   ├── sidebar.tsx       # 3 entradas: Hoy / Semana / Productos
    │       │   │   ├── topbar.tsx
    │       │   │   └── theme-provider.tsx
    │       │   └── ui/                  # shadcn/ui
    │       ├── pages/
    │       │   ├── Hoy.tsx
    │       │   ├── Semana.tsx
    │       │   ├── Productos.tsx
    │       │   └── RegistrarVenta.tsx
    │       ├── services/
    │       │   └── api.ts
    │       ├── store/
    │       │   └── useTienda.ts
    │       └── types/
    │           └── index.ts
    └── docs/
        ├── ARQUITECTURA.md
        ├── API.md
        ├── GUIA_DEFENSA.md
        └── ISSUES_CONOCIDOS.md
```

---

## 9. Lo que se va del proyecto anterior

| Componente | Acción |
|---|---|
| `15_NUEVA_PLATAFORMA/` | Se mueve a `_archivado/` (no se borra) |
| pgvector / sentence-transformers | Eliminar |
| LightGBM / XGBoost / SHAP | Eliminar |
| Fairlearn | Eliminar |
| mesa (ABM) | Eliminar |
| Endpoints: rfq, etica, embeddings, ordenes, bitacora (SHA), ml (predicción OC) | Eliminar |
| Páginas frontend: RFQ, Sesgos, Bitácora, Búsqueda, PredicciónML, Alertas, Reportes, Evaluaciones, Órdenes, Proveedores | Eliminar (queda solo Dashboard + 3 nuevas + POS) |
| `main.py` | Modificar para apuntar a `16_INVENTARIO_FORECAST/` |
| `00_FICHA_INICIO_PROYECTO.md` | Actualizar para reflejar el pivot |
| `CHANGELOG.md` | Agregar entrada v2.0.0 — pivot |

> **Por qué archivamos y no borramos:** evidencia del proceso, se puede
> mencionar en la sustentación como "lo que aprendimos y descartamos".

---

## 10. Criterios de aceptación

### Inventario dual
- CA-01: Crear producto tipo='terminado' con stock 5, registrar entrada de 50, stock = 55
- CA-02: Crear producto tipo='materia_prima' harina con stock 10 kg, registrar consumo de 2 kg, stock = 8 kg
- CA-03: Producto bajo stock_minimo aparece en `/api/inventario/alertas`

### Recetas (BOM)
- CA-04: Pan francés con receta (0.3 kg harina + 0.05 kg levadura). Vender 10 panes → descuenta 3 kg harina y 0.5 kg levadura del stock de MP
- CA-05: Producto Postobón sin receta → vender no descuenta materia prima
- CA-06: Cambiar receta de un producto impacta las próximas ventas (no las pasadas)

### Ventas
- CA-07: Vender 5 panes a $3000 c/u → crea venta con total $15000
- CA-08: Stock insuficiente de producto terminado → rechaza la venta con error 400
- CA-09: Materia prima insuficiente para producir → rechaza la venta con error 400
- CA-10: Resumen "hoy" cuadra con suma de detalle_ventas del día

### Festivos
- CA-11: Tabla `calendario_festivos` tiene los festivos colombianos 2025-2026 con efecto -30%
- CA-12: Festivos incluidos en dataset sintético bajan ventas vs día normal

### Predicción (ML)
- CA-13: Con 12 meses de datos, MAPE ≤ 25% en producto más vendido
- CA-14: Predicción incluye intervalo de confianza (límite inferior y superior)
- CA-15: Festivos colombianos están en el modelo (no se predice lunes festivo como día normal)
- CA-16: Reentrenamiento funciona sin tumbar el servidor (background job)

### UX
- CA-17: Dueño NO técnico registra una venta en menos de 30 segundos
- CA-18: Pantalla "Hoy" muestra total vendido con 1 solo vistazo
- CA-19: Funciona en móvil (responsive)
- CA-20: Colores del estado de stock son intuitivos (🟢 ok / 🟡 pedir / 🔴 urgente)

---

## 11. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Prophet no se instala en Windows (cmdstanpy requiere compilación) | Fallback a `statsmodels SARIMA` (sin compilación nativa) |
| Datos sintéticos poco realistas | Generador con validación visual: comparar gráfico generado vs patrón esperado |
| Sin datos reales del cliente | Caso panadería inventado pero creíble — el profe lo va a ver bien |
| Tiempo corto (1 semana) | Fases priorizadas: backend + ML antes que UI bonita |
| Festivos cambian cada año | Script `02_festivos.sql` se actualiza manualmente cada año, separado del schema |

---

## 12. Trabajo futuro (post-entrega)

- Login multi-tenant (varios locales en una plataforma)
- Integración con datáfono real
- App móvil nativa (React Native)
- Importación masiva desde Excel
- Notificaciones push cuando stock_bajo
- Sugerencia automática de pedido a partir de la predicción + stock_actual

---

**Fin del SPEC.**

Ronald — leélo completo y decime: ¿algo que falte o querás cambiar antes de
que arranque con la Fase 1 (backend + schema SQL)?
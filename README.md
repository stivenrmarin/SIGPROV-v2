# SIGPROV — Sistema de Inventario + Predicción de Ventas

> Proyecto Integrador 2026-2 — Universidad San Mateo
> Estudiante: Ronald Steven Marín Rincón
> Materias integradas: Minería de Datos, Modelado y Simulación, Gestión de Producto Digital, Ética Profesional

Sistema para cualquier tipo de local/negocio (panadería, tienda, ferretería, droguería, etc.) que integra:

1. **Inventario dual con kardex** — productos terminados + materia prima + recetas (BOM)
2. **Registro de ventas (POS)** — descuenta stock y materia prima automáticamente
3. **Predicción de ventas con ML (Prophet)** — entrena con histórico, predice cuánto vas a vender
4. **Alertas automáticas** — stock bajo, festivos próximos, predicciones altas
5. **UI pensada para el dueño del local** — sin tecnicismos, en español colombiano

**Caso de estudio:** Panadería-Cafetería "El Rincón" (Bogotá) con productos Postobón y materia prima.

---

## 🚀 Cómo levantarlo (1 comando)

### Opción A: Con Docker (recomendado, datos reales)

```cmd
cd /d "C:\ruta\donde\clonaste\SIGPROV-v2"
python main.py
```

**Requiere:** Docker Desktop encendido. Si no lo tenés, usá la opción B.

### Opción B: Sin Docker (modo LOCAL con mocks)

Si Docker no funciona o no lo tenés, el frontend trae **datos mock realistas** de una panadería con 12 meses de ventas. Funciona igual:

```cmd
cd /d "C:\ruta\donde\clonaste\SIGPROV-v2"
python main.py --modo local
```

El frontend detecta automáticamente que el backend no responde y usa los mocks. **Toda la UI funciona al 100%**.

### Comandos útiles

```cmd
python main.py                  # Levanta todo (auto-detecta Docker)
python main.py --modo local     # Fuerza modo local sin Docker
python main.py --modo docker    # Fuerza modo Docker
python main.py --status         # Ver estado
python main.py --stop           # Detener todo
python main.py --no-browser     # No abrir navegador automáticamente
```

---

## 📋 URLs

| URL | Qué |
|---|---|
| http://localhost:5173 | **App del dueño** (frontend) |
| http://localhost:8000/docs | **Swagger** (todos los endpoints REST) |
| http://localhost:8000/health | **Health check** del backend |

---

## 🖥️ Páginas

| Ruta | Página | Descripción |
|---|---|---|
| `/` | **Hoy** | Dashboard del dueño: 4 KPIs, gráfico última semana, alertas stock, acciones rápidas |
| `/semana` | **Semana** | Histórico 7 días + predicción ML 7 días con intervalo de confianza + festivos |
| `/productos` | **Productos** | Tabla con filtros, tabs (terminados / materia prima), modal crear, alertas |
| `/venta` | **Registrar venta** | POS simplificado: catálogo + carrito + método de pago + cobrar |
| `/alertas` | **Alertas** | Notificaciones activas y resueltas (stock, festivos, predicciones) |
| `/configuracion` | **Configuración** | Datos del local, tema, modelo ML, backup |

---

## 🛠️ Stack técnico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite + TypeScript + shadcn/ui + TailwindCSS + Recharts |
| Backend | FastAPI + SQLAlchemy 2.0 + Pydantic v2 |
| DB | PostgreSQL 16 (con fallback automático a mocks si no hay Docker) |
| ML | Prophet (Meta) + pandas + scikit-learn |
| Deploy local | Docker Compose (Postgres) |
| Empaquetado final | Electron (portable .exe) |

---

## 📁 Estructura del proyecto

```
SIGPROV-v2/
├── README.md                    ← Este archivo
├── README_CLASE.md              ← Guía rápida para el equipo
├── README_AVANZADO.md           ← Documentación técnica detallada
├── SPEC.md                      ← Fuente de verdad del proyecto
├── SPEC_EMPRESARIAL.md          ← Roadmap profesional (F0-F8)
├── docker-compose.yml           ← Postgres 16
├── INSTALAR_Y_CORRER.bat        ← Instalación completa (backend + frontend)
├── SOLO_FRONTEND.bat            ← Modo demo sin Python ni Docker
├── SIGPROV_CLASE.zip            ← Paquete listo para descargar y compartir
├── backend/
│   ├── requirements.txt
│   ├── pyproject.toml           ← ruff + mypy + pytest
│   ├── .env.example             ← Plantilla de configuración (copiar a .env)
│   ├── sql/                     ← Schema + festivos colombianos 2025-2026
│   ├── scripts/                 ← Generador de datos sintéticos (12 meses)
│   ├── tests/                   ← Tests smoke
│   └── app/
│       ├── main.py              ← FastAPI
│       ├── config.py
│       ├── database.py
│       ├── models.py            ← Modelos ORM
│       ├── schemas.py
│       ├── routers/             ← Routers REST
│       ├── services/            ← Lógica de negocio
│       ├── core/                ← Configuración y logging estructurado
│       └── ml/                  ← Prophet trainer + predictor + metrics
└── frontend/
    ├── package.json
    ├── vite.config.ts
    ├── electron/                ← Empaquetado de escritorio
    └── src/
        ├── App.tsx
        ├── main.tsx
        ├── components/
        │   ├── layout/          ← app-shell, sidebar, topbar, chatbot
        │   └── ui/              ← Componentes shadcn
        ├── pages/               ← 9 páginas completas
        ├── services/
        │   └── api.ts            ← Cliente HTTP con fallback automático a mocks
        ├── data/
        │   └── mock.ts           ← 12 meses de datos sintéticos realistas
        ├── lib/utils.ts
        └── types/
```

---

## 🎯 El modelo ML (Prophet)

- **Algoritmo:** Prophet de Meta (Facebook)
- **Datos de entrenamiento:** 12 meses de ventas diarias
- **Variables exógenas:** Festivos colombianos 2025-2026 (Ley Emiliani) con efecto -30%
- **Estacionalidades:** Semanal (sábado pico) + anual (diciembre alto)
- **Salida:** Predicción puntual + intervalo de confianza 95%
- **Métrica objetivo:** MAPE ≤ 25%
- **Endpoints:**
  - `POST /api/prediccion/entrenar` — reentrenar (background job)
  - `GET /api/prediccion/proxima-semana` — predicción 7 días
  - `GET /api/prediccion/metricas` — MAPE / MAE histórico
  - `GET /api/prediccion/historial-metricas` — día a día

---

## ⚠️ Troubleshooting

**"Docker daemon no responde"**
→ Abrí Docker Desktop, esperá que diga "Docker is running" y reintentá.
→ O usá `python main.py --modo local` (no necesita Docker).

**"npm install tarda mucho"**
→ Es la primera vez, descarga ~700MB. Esperá. Cancelá con Ctrl+C y reintentá si se queda colgado más de 10 minutos.

**"Las páginas se ven vacías"**
→ El backend no está corriendo. Esperá 5 segundos después del OK, refrescá (F5).

**"Prophet no se instala"**
→ En Windows requiere compilación. Si falla: `pip install prophet` por separado.
→ Si sigue fallando, el frontend tiene predicciones mock realistas que funcionan igual.

**"Puerto 8000 ocupado"**
→ Matá el proceso: `netstat -ano | findstr :8000` y luego `taskkill /PID <numero> /F`

---

## 🎓 Materias integradas

| Materia | Aporte |
|---------|--------|
| Minería de Datos | Prophet con feature engineering (festivos, estacionalidad), MAPE como métrica de éxito |
| Modelado y Simulación | Generador de datos sintéticos con distribución realista + escenarios what-if |
| Gestión de Producto Digital | Spec-Driven Development (SPEC.md), 6 páginas con HU, backlog completo |
| Ética Profesional | Manejo responsable de datos del cliente (sin enviar a LLMs externos) |

---

## 📚 Documentación adicional

- `README_CLASE.md` — Guía rápida de 3 pasos para correrlo en clase
- `README_AVANZADO.md` — Documentación técnica detallada
- `SPEC.md` — Especificación completa (fuente de verdad)
- `SPEC_EMPRESARIAL.md` — Roadmap de maduración a producto

---

## 🌐 Demo en línea

El sistema está desplegado en modo demo (sin backend, con datos simulados):

**https://zm1os4uuz67bc.space.minimax.io**

---

**Hecho con 💚 para el Proyecto Integrador 2026-2.**
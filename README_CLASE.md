# SIGPROV — Sistema de Inventario y Predicción ML para Panaderías

**Proyecto Integrador — Universidad San Mateo**
**Estudiante:** Ronald Steven Marín · rsmarinr@sanmateo.edu.co

---

## 🚀 Cómo correr el proyecto en la clase (3 pasos)

Hay **DOS modos** según el tiempo que tengan:

### 🟢 **Opción A — MODO DEMO (Recomendado para clase)**

> Solo necesita **Node.js 18+** instalado. NO requiere Python, ni base de datos, ni Docker.

1. Verificá que tengas Node.js: https://nodejs.org/ (versión 18 LTS o superior)
2. **Doble-click en `SOLO_FRONTEND.bat`**
3. Esperá 2-3 minutos y se abre el navegador solo

Verás **todo el sistema funcionando con datos simulados** (ventas del día, predicciones ML, salón con mesas, chatbot, cierre de caja). Ideal para mostrar en clase sin complicarse.

> ⚠️ La primera vez `npm install` tarda 2-3 minutos (instala ~700 paquetes). Después es instantáneo.

### 🔵 **Opción B — MODO COMPLETO (con Backend + base de datos real)**

> Requiere Python 3.11+ y Node.js 18+. Tarda 3-5 minutos la primera vez.

1. Asegurate de tener:
   - **Python 3.11+**: https://www.python.org/downloads/ (marcá "Add to PATH")
   - **Node.js 18+**: https://nodejs.org/
2. **Doble-click en `INSTALAR_Y_CORRER.bat`**
3. Esperá a que instale todo y se abran 2 ventanas (NO las cierres)
4. Se abre el navegador en http://localhost:5173

**En este modo:**
- Se crea la base de datos **SQLite** en `backend/data/sigprov.db` (NO necesitás Docker)
- Se aplican los **triggers de inventario** (vender descuenta stock y materia prima según la receta)
- Se carga el **calendario de 39 festivos colombianos** de 2025-2026
- El backend queda disponible en http://localhost:8000 con docs en /docs

---

## 📋 Qué tiene el sistema

### Los 9 módulos del dashboard

| Módulo | Qué hace |
|---|---|
| 🏠 **Inicio** | KPIs del día, salón en vivo, alertas, gráfico de 7 días |
| 🪑 **Salón** | 12 mesas en 4 zonas, pedidos en tiempo real, crear/editar mesas |
| 🛒 **Nueva venta** | POS con 38 productos y 8 combos colombianos |
| 📦 **Productos** | Catálogo con productos terminados, materia prima y combos |
| 🚚 **Proveedores** | Directorio + pedidos en curso + stock crítico |
| 💵 **Cierre de caja** | Conteo de billetes/monedas + cuadre automático |
| 📅 **Predicción ML** | Prophet: cuánto hornear y qué materia prima comprar (7 días) |
| 🔔 **Alertas** | Stock crítico, picos de demanda, inconsistencias |
| ⚙️ **Configuración** | Parámetros del negocio |

### 🤖 Chatbot del dashboard

En la **esquina inferior derecha** hay un **ícono de burbuja 💬**. Hacele click y tenés un asistente llamado **"Don Pancracio"**.

Tiene **25+ respuestas embebidas** sobre el proyecto: KPIs, márgenes, predicción ML, festivos (Ley Emiliani), salón, POS, cierre de caja, proveedores, recetas BOM, stack técnico.

Funciona **sin internet, sin API keys y sin enviar datos a ningún servidor**. Útil durante la defensa si te preguntan algo técnico.

### Combos colombianos incluidos (8)

☕ Desayuno Completo · 🌽 Tamal con Chocolate · 🍳 Huevos Pericos con Pan · 🥘 Calentado Paisa · 🍫 Chocolate Santafereño · 🎂 Combo Familiar · 🥐 Desayuno Ejecutivo · 🍞 Pan Recién Horneado

---

## 🧪 Flujos para probar en clase (3 minutos)

### 1. **Demo del dashboard**
**Inicio** → hero card con ventas del día · 4 mini-KPIs con sparklines · gráfico de barras con días reales (Lun 13, Mar 14...) · salón en vivo · top productos · combos populares · alertas

### 2. **Crear una mesa y cobrar**
**Salón** → botón **+ Mesa** → crear mesa 13 → click en la mesa → **Sentar clientes** (4 personas) → **Agregar items** (3 combos Desayuno) → **Cerrar cuenta** → **Efectivo** → $50.000 → cambio $20.500 → **Confirmar**

### 3. **Predicción ML**
**Predicción ML** → pestaña **Por producto** → filtrá "Pan Francés" → predicción 7 días + materia prima necesaria + costo + margen

### 4. **Cierre de caja**
**Cierre de caja** → contá los billetes → la app te dice cuánto se esperaba y muestra el cuadre (sobrante/faltante)

### 5. **Chatbot**
Click en 💬 → preguntá "¿Cómo funciona la predicción?" o "¿Qué es un BOM?"

---

## 🔧 Para los que quieran trastear con el código

### Estructura

```
SIGPROV_CLASE/
├── INSTALAR_Y_CORRER.bat    ← modo completo
├── SOLO_FRONTEND.bat        ← modo demo
├── README_CLASE.md          ← este archivo
├── SPEC.md                  ← spec del proyecto (16 secciones)
├── SPEC_EMPRESARIAL.md      ← hoja de ruta a producto empresarial (9 fases)
├── backend/
│   ├── app/
│   │   ├── main.py           ← FastAPI
│   │   ├── config.py         ← config por variable de entorno
│   │   ├── database.py       ← SQLite + PostgreSQL
│   │   ├── models.py         ← 8 modelos ORM
│   │   ├── schemas.py        ← validación Pydantic
│   │   ├── core/logging.py   ← logging estructurado JSON
│   │   ├── ml/               ← Prophet: trainer, predictor, metrics
│   │   ├── routers/          ← 5 routers (32 endpoints)
│   │   └── services/
│   ├── sql/
│   │   ├── 01_schema.sql     ← schema de referencia PostgreSQL
│   │   ├── triggers.postgres.sql
│   │   ├── triggers.sqlite.sql
│   │   └── 02_festivos.sql   ← 39 festivos 2025-2026
│   ├── scripts/
│   │   ├── inicializar_db.py ← crea tablas + triggers + festivos
│   │   ├── generar_datos_sinteticos.py
│   │   ├── verificar_ml.py   ← comprueba que Prophet entrena (MAPE)
│   │   └── probar_triggers.py
│   ├── tests/                ← 10 tests (pytest)
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── pages/            ← 9 páginas funcionales
    │   ├── components/
    │   │   ├── ui/           ← 21 componentes shadcn/ui
    │   │   └── layout/
    │   │       ├── dashboard-chatbot.tsx   ← Don Pancracio
    │   │       └── chatbot-knowledge.ts    ← 25+ respuestas
    │   ├── data/mock.ts      ← datos realistas
    │   ├── services/api.ts
    │   ├── types/
    │   └── lib/
    ├── electron/             ← app de escritorio
    └── package.json
```

### Comandos de calidad (backend)

```powershell
cd backend
.\venv\Scripts\activate

ruff check .          # lint (0 errores)
black . --check      # formato
mypy app             # tipos (0 errores)
pytest -q            # 10 tests
python scripts\verificar_ml.py    # MAPE del modelo
python scripts\probar_triggers.py # triggers de inventario
```

### Comandos de calidad (frontend)

```powershell
cd frontend
npm run typecheck    # tsc --noEmit (0 errores)
npm run lint         # eslint (0 errores)
npm run build        # build de producción
```

### Verificar que el modelo de ML funciona

```powershell
python scripts\verificar_ml.py
```
Entrena un Prophet real sobre 365 días de datos y mide el error.
Resultado esperado: **MAPE ≈ 10%** (objetivo < 15%).

---

## ❓ Si algo no funciona (troubleshooting)

### "Node.js NO está instalado"
Descargá Node 18 LTS de https://nodejs.org/. Instalalo y volvé a correr el `.bat`.

### "Python NO está instalado"
Descargá Python 3.11+ de https://www.python.org/downloads/. **Marcá "Add Python to PATH"** durante la instalación.

### "No se pudo crear el entorno virtual"
```bash
cd backend
python -m pip install --user virtualenv
python -m virtualenv venv
```
Si sigue fallando, ejecutá la terminal como administrador.

### "npm install falla"
- Verificá tu conexión a internet
- Si estás en un equipo corporativo puede haber un proxy: `npm config set proxy http://proxy.tuempresa.com:8080`
- Desactivá el antivirus temporalmente

### "El frontend carga pero los datos están vacíos"
Refrescá con **F5**. Si sigue vacío, abrí la consola del navegador (F12) y mirá los errores.

### "El backend no arranca"
- Verificá que el puerto 8000 esté libre: `netstat -ano | findstr :8000`
- Si está ocupado, cambiá el puerto en `INSTALAR_Y_CORRER.bat`
- Borrá `backend/data/sigprov.db` y volvé a correr el instalador

### Error de "permission denied" al instalar
Antivirus bloqueando archivos, o OneDrive sincronizando la carpeta (sacalo de OneDrive).

---

## 🔐 Nota de seguridad

Los secretos (password de la DB, clave de firma JWT) viven en `backend/.env`, que está en `.gitignore` y **no se versiona**. `backend/.env.example` es la plantilla con valores de ejemplo.

En un entorno de producción hay que:
1. Generar una clave nueva: `python -c "import secrets; print(secrets.token_urlsafe(48))"`
2. Cambiar el password de PostgreSQL
3. Configurar `SIGPROV_DB_DRIVER=postgres`

---

## 🎓 Sobre el proyecto

**Carrera:** Ingeniería de Sistemas — Universidad San Mateo
**Director de proyecto:** [nombre del director]
**Año:** 2025-2026

**Resumen técnico:**
- Backend FastAPI: 32 endpoints, 8 modelos ORM, 8 tablas con triggers de inventario
- Frontend React + TypeScript: 9 páginas, 21 componentes shadcn/ui, dark mode, exportación PDF/Excel
- ML con Prophet (Meta): predicción 7 días, MAPE ~10%, 39 festivos colombianos (Ley Emiliani)
- Base de datos dual: SQLite (dev/test, sin Docker) + PostgreSQL (producción)
- Calidad: ruff + mypy + black + ESLint + Prettier + pytest, 0 errores
- Electron: instalador NSIS + versión portable

**Tecnologías que NO se usaron (y por qué):**
- ❌ Fairlearn: fairness en ML no aplica a inventario
- ❌ Embeddings / pgvector: overkill para una panadería
- ❌ Docker obligatorio: se ofrece como opcional, SQLite cubre el 90% de los casos

---

## 📞 Contacto

**Ronald Steven Marín** · rsmarinr@sanmateo.edu.co

Cualquier duda durante la presentación, mandame un mensaje.

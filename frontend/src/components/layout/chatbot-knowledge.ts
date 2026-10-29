// Knowledge base del Chatbot "Don Pancracio"
// Respuestas embebidas sobre el sistema SIGPROV.
// Sin internet, sin LLM, sin API keys, listo para clase.

export interface ChatMessage {
  id: string
  role: 'bot' | 'user'
  content: string
  timestamp: number
}

interface Answer {
  id: string
  triggers: string[] // substring match (lowercase)
  response: string
}

export interface SuggestedTopic {
  id: string
  label: string
  question: string
  icon: string // emoji
}

export const suggestedTopics: SuggestedTopic[] = [
  { id: 'que-es', label: '¿Qué es SIGPROV?', question: '¿Qué es SIGPROV?', icon: '📋' },
  { id: 'kpi-ventas', label: 'Ventas de hoy', question: '¿Qué son las ventas de hoy?', icon: '💰' },
  { id: 'ticket', label: 'Ticket promedio', question: '¿Qué es el ticket promedio?', icon: '🧾' },
  { id: 'ml', label: 'Predicción ML', question: '¿Cómo funciona la predicción ML?', icon: '🤖' },
  { id: 'mesa', label: 'Crear mesa', question: '¿Cómo creo una mesa?', icon: '🪑' },
  { id: 'cobrar', label: 'Cobrar mesa', question: '¿Cómo cobro una mesa?', icon: '💳' },
  { id: 'caja', label: 'Cierre de caja', question: '¿Cómo se hace el cierre de caja?', icon: '💵' },
  { id: 'proveedor', label: 'Pedir proveedor', question: '¿Cómo pedir materia prima?', icon: '🚚' },
  { id: 'receta', label: 'Receta y BOM', question: '¿Qué es una receta?', icon: '📦' },
  { id: 'festivos', label: 'Festivos en la predicción', question: '¿Cómo afectan los festivos?', icon: '📅' },
]

export const answers: Answer[] = [
  {
    id: 'greeting',
    triggers: ['hola', 'buenos dias', 'buenas tardes', 'buenas noches', 'que tal', 'saludos', 'hey'],
    response: `¡Hola! 👋 Soy **Don Pancracio**, tu guía en SIGPROV.

Puedo explicarte cualquier parte del dashboard:
- Qué significa cada KPI
- Cómo funciona la predicción ML
- Cómo operar el salón, el POS, el cierre de caja
- Cómo pedirle a los proveedores

Preguntame lo que quieras o tocá uno de los botones de abajo 👇`,
  },
  {
    id: 'thanks',
    triggers: ['gracias', 'muchas gracias', 'thanks', 'te luciste', 'buenisimo'],
    response: `¡De nada! 🤝 Si te surge otra duda durante la presentación, acá estoy.

Tip: cuando los profes pregunten algo técnico, mi respuestas están armadas con datos concretos — no estoy alucinando, hablo de las mismas pantallas que ves.`,
  },
  {
    id: 'sigprov',
    triggers: ['que es sigprov', 'sobre el sistema', 'sobre el proyecto', 'acerca de', 'que hace el sistema', 'para que sirve'],
    response: `📋 **SIGPROV** = **SIG**stema de **PROV**isión para panaderías.

Es un sistema de **inventario + predicción ML + POS** para panaderías colombianas. Tiene 9 módulos:

🏠 **Inicio** — KPIs del día, salón en vivo, alertas
🪑 **Salón** — 12 mesas distribuidas en 4 zonas con pedidos en tiempo real
🛒 **Nueva venta** — POS con 38 productos y 8 combos colombianos
📦 **Productos** — catálogo con terminados, materia prima y combos
🚚 **Proveedores** — directorio + pedidos + stock crítico
💵 **Cierre de caja** — conteo de billetes/monedas + cuadre
📅 **Predicción ML** — cuánto hornear y qué materia prima comprar
🔔 **Alertas** — stock crítico, picos, inconsistencias
⚙️ **Configuración** — parámetros del negocio

Proyecto Integrador — Universidad San Mateo (Ronald Steven Marín).`,
  },
  {
    id: 'ventas-hoy',
    triggers: ['que son las ventas de hoy', 'ventas de hoy', 'ventas del dia', 'kpi de ventas', 'que son las ventas'],
    response: `💰 **Ventas de hoy** = suma total de ingresos del día en pesos colombianos.

**Cómo se calcula:**
1. Cada vez que cobrás una venta (mesa o mostrador), se registra con su total
2. Al final del día, SIGPROV suma TODAS las ventas con estado = 'pagada'
3. Incluye: combos, productos individuales, domicilios

**Qué incluye el número:**
- Subtotal de productos
- IVA (8% si aplica, 0% para productos de la canasta básica)
- Excluye propinas

Si ves un número bajo un domingo festivo, es porque la predicción también lo refleja — los domingos se vende ~70% menos.`,
  },
  {
    id: 'ticket',
    triggers: ['ticket promedio', 'que es el ticket', 'promedio de venta'],
    response: `🧾 **Ticket promedio** = Ventas totales ÷ Número de órdenes.

**Ejemplo:** $1.500.000 COP en 100 órdenes → ticket promedio = **$15.000 COP**.

En panadería colombiana típica: $8.000 - $15.000 COP por ticket.

**Para qué sirve:**
- Saber si los combos empujan el ticket hacia arriba (porque el ticket promedio con combos sube)
- Medir el efecto de promociones: si baja el ticket es porque hay menos combos vendidos

**Dato curioso del modelo:** los combos mueven ticket ~25% arriba vs. productos sueltos.`,
  },
  {
    id: 'productos-vendidos',
    triggers: ['productos vendidos', 'cuantos vendido', 'cuantos productos', 'unidades vendidas'],
    response: `📦 **Productos vendidos** = suma de UNIDADES, no órdenes.

Si vendiste 3 combos Desayuno Completo y 2 Café Americano → **5 productos vendidos**.

**Diferencia con ventas de hoy:**
- Ventas de hoy → mide dinero
- Productos vendidos → mide volumen

Sirve para saber qué tanto rotan los productos del mostrador. Si Café Americano vende 200 unidades/día y Croissant solo 30, tenés que reforzar Croissant con combos o promo.`,
  },
  {
    id: 'mesas-activas',
    triggers: ['mesas activas', 'mesa activa', 'salon', 'salon en vivo', 'como funciona el salon'],
    response: `🪑 **Mesas activas** = mesas con clientes sentados o cuenta abierta.

**Topología del salón:**
- **Interior** — 5 mesas (4 personas c/u)
- **Exterior** — 3 mesas (terraza)
- **Barra** — 2 puestos individuales
- **VIP** — 2 mesas (eventos, reuniones)

**Estados:**
- 🟢 **Libre** — disponible para sentar
- 🟡 **Ocupada** — clientes sentados, pidiendo
- 🔵 **Reservada** — apartada para hora específica
- ⚪ **Limpieza** — pendiente de recoger

Click en cualquier mesa del plano para ver su detalle: items pedidos, tiempo de permanencia, total.`,
  },
  {
    id: 'margen',
    triggers: ['margen', 'utilidad', 'ganancia', 'rentabilidad'],
    response: `📊 **Margen** = (Precio de venta - Costo) / Precio de venta × 100.

**Cómo se calcula el costo:**
SIGPROV arma una **receta (BOM)** por cada producto terminado. Por ejemplo, un Croissant tiene:
- 80g de harina → $200
- 30g de mantequilla → $450
- 1 huevo → $600
- otros → $150
- **Total costo: $1.400**

Si vendés el Croissant a $4.500, el margen es **69%** (excelente).

**Margen típico panadería:**
- Panadería tradicional: 50-65%
- Cafetería: 65-75% (café tiene alto margen)
- Combos: 60-80% (al comprar combo, el cliente cree ahorrar)`,
  },
  {
    id: 'ml-general',
    triggers: ['prediccion', 'ml', 'prophet', 'machine learning', 'como funciona la prediccion', 'inteligencia artificial'],
    response: `🤖 **Predicción ML** usa Prophet (de Facebook / Meta).

**Cómo funciona:**
1. Toma los últimos **90+ días** de ventas de CADA producto
2. Prophet detecta **estacionalidad semanal** (Lun-Dom) y **anual** (Navidad, festivos)
3. Identifica **festivos colombianos** (Ley Emiliani) y reduce la predicción ~30%
4. Predice los próximos **7 días** con bandas de confianza (95%)
5. Para cada producto calcula:
   - **Unidades a producir** (cuánto hornear)
   - **Materia prima necesaria** (cantidad × unidades)
   - **Costo total** (suma de insumos)
   - **Margen esperado**

**Precisión esperada:**
- MAPE (error medio absoluto porcentual) < 15%
- En productos con histórico sólido (Bocadillo, Pan Francés): MAPE ~8%
- En productos nuevos (sin 60 días de data): usa promedio simple

**Importante:** SIGPROV predice, no decide. El dueño decide.`,
  },
  {
    id: 'festivos',
    triggers: ['festivo', 'emiliani', 'puente', 'domingo festivo', 'que festivos'],
    response: `📅 **Festivos colombianos** por la **Ley Emiliani de 1983**:

Si un festivo cae martes a viernes → se mueve al lunes anterior.
Si cae sábado o domingo → se mueve al lunes siguiente.
Si cae lunes → se queda igual.

**SIGPROV tiene hardcodeados los 39 festivos:**
- 2025: Año Nuevo, Reyes, San José, Día del Trabajo, Ascensión, Corpus, San Pedro, Independencia, Batalla de Boyacá, Asunción, Día de la Raza, Todos los Santos, Cartagena, Inmaculada, Navidad...
- 2026: Igual patrón.

**Efecto en la predicción:**
- Festivo en lunes → ventas x 0.7 (bajan al ser "puente")
- Festivo en martes-viernes que se corrió al lunes → depende del día de semana del festivo original

**Por qué importa:**
La predicción por día de la semana es distinta: un lunes festivo NO es igual a un lunes normal ni a un domingo (la gente está en casa pero muchas panaderías cierran).`,
  },
  {
    id: 'crear-mesa',
    triggers: ['como creo una mesa', 'agregar mesa', 'crear mesa', 'nueva mesa', 'mesa nueva'],
    response: `🪑 **Cómo agregar una mesa nueva al salón:**

1. Andá a **Salón** en el menú lateral
2. Click en el botón **+ Mesa** (esquina superior derecha del plano)
3. Te aparece un diálogo con campos:
   - **Número** (ej. 13, 14) — no se puede repetir
   - **Capacidad** (1-12 personas)
   - **Zona** (Interior, Exterior, Barra, VIP)
4. Click en **Crear mesa**

✅ Aparece al instante en el plano del salón, lista para recibir clientes.

**Para eliminarla:** seleccionála → botón de papelera en el detalle.
**Para sentar clientes:** click en la mesa libre → "Sentar clientes".`,
  },
  {
    id: 'sentar-clientes',
    triggers: ['sentar clientes', 'abrir mesa', 'como abro una mesa', 'ocupar mesa'],
    response: `👥 **Cómo sentar clientes en una mesa:**

1. Andá a **Salón**
2. Buscá la mesa libre (gris, badge "libre")
3. Click en ella → panel de detalle
4. Click **Sentar clientes** (badge verde)
5. Ingresá cantidad de personas
6. La mesa cambia a estado **🟡 Ocupada** y empieza a correr el timer

A partir de ahí podés agregar items desde el mismo panel — son como los pedidos que se van sumando al total.`,
  },
  {
    id: 'cobrar',
    triggers: ['como cobro', 'cobrar', 'cerrar cuenta', 'pagar una mesa', 'pago de mesa'],
    response: `💳 **Cómo cobrar una mesa paso a paso:**

1. Andá a **Salón** → click en la mesa ocupada
2. En el panel de detalle, click **Cerrar cuenta**
3. Te aparece el resumen:
   - Lista de items
   - Subtotal, IVA, Total
   - Métodos de pago disponibles
4. Elegí método:
   - **Efectivo** → marcá cuánto paga el cliente → ves el cambio
   - **Tarjeta** → número de voucher
   - **Transferencia** → referencia
   - **Mixto** → combinás métodos
5. Click **Confirmar cobro**

✅ La mesa queda **libre**, el cobro se suma a **Ventas del día** y el efectivo entra al conteo del cierre de caja.`,
  },
  {
    id: 'cierre-caja',
    triggers: ['cierre de caja', 'cierre caja', 'como cerrar', 'cerrar la caja', 'arqueo', 'como se cuenta la plata'],
    response: `💵 **Cierre de caja paso a paso:**

1. Andá a **Cierre de caja** en el menú lateral (icono de calculadora)
2. Arriba ves el resumen del día:
   - **Ventas totales**
   - **Esperado en caja** (efectivo teórico)
   - **Tarjeta, transferencia, otros**
3. En la grilla de denominaciones, contá cada billete/moneda:
   - $100k, $50k, $20k, $10k, $5k, $2k, $1k (billetes)
   - $1.000, $500, $200, $100, $50 (monedas)
4. Cada fila suma automáticamente
5. Al final, mirá la **diferencia**:
   - 🟢 **Cuadre perfecto** — coincide exacto
   - 🟡 **Sobrante** — hay más plata de la esperada (revisa si te dieron cambio mal)
   - 🔴 **Faltante** — falta plata (puede ser un robo hormiga, error en cobro)
6. Click **Cerrar caja ahora** para registrar el arqueo

**Tip:** el conteo se guarda local aunque recargues la página.`,
  },
  {
    id: 'proveedor',
    triggers: ['como pedir materia', 'proveedor', 'pedir a proveedor', 'pedido proveedor', 'stock critico'],
    response: `🚚 **Cómo pedir materia prima al proveedor:**

1. Andá a **Proveedores** en el menú
2. Tenés 3 pestañas:
   - **Directorio** — 7 proveedores con teléfono, email, días de entrega
   - **Pedidos** — pedidos en curso (Borrador → Enviado → Confirmado → Recibido)
   - **Stock crítico** — productos con menos de 3 días de cobertura
3. En la pestaña **Stock crítico**, ves una lista con el producto, stock actual, días de cobertura y proveedor sugerido
4. Click **Pedir** en el producto que te interesa
5. Te abre un diálogo con:
   - Cantidad sugerida (cubre 7 días)
   - Editor de cantidades por línea
   - Total del pedido
6. Click **Enviar pedido** → queda registrado

**Recibir pedido:** andá a **Pedidos** → "Marcar recibido" cuando llegue el camión.`,
  },
  {
    id: 'receta',
    triggers: ['que es una receta', 'receta', 'bom', 'lista de materiales', 'materia prima por producto'],
    response: `📦 **Receta (BOM — Bill of Materials):**

Cada producto terminado tiene una lista de materia prima con cantidades. Por ejemplo:

**Croissant (10 unidades):**
- 800g harina de trigo → $2.000
- 300g mantequilla → $4.500
- 10 huevos → $6.000
- 100g azúcar → $400
- 20g sal → $50
- 50g levadura → $900
- **Costo total:** $13.850 → $1.385 por croissant

**Combo Desayuno Completo:**
- 1 Croissant → $1.385 costo
- 1 Café Americano → $700 costo
- 1 Jugo de naranja → $1.200 costo
- **Costo total:** $3.285
- **Precio combo:** $13.500 (margen 76%)

**Para qué sirve:**
- Calcular margen automáticamente
- Saber qué materia prima comprar según predicción
- Detectar variabilidad de costos (harina subió → margen cae)`,
  },
  {
    id: 'stock-critico',
    triggers: ['stock critico', 'cuanto comprar', 'alerta stock', 'cuando comprar materia prima'],
response: `🔴 **Stock crítico** = materia prima con cobertura < 3 días.

**Cómo lo calcula SIGPROV:**
**Cobertura (días) = Stock actual / Consumo promedio diario**

Si tenés 50kg de harina y consumís 8kg/día → cobertura = 6.25 días ✅
Si te queda para 2 días → stock crítico 🔴

**Aparece en 2 lados:**
- En **Inicio**: badge rojo si hay stock crítico
- En **Alertas**: con prioridad ALTA
- En **Proveedores → Stock crítico**: con sugerencia de pedido

**Lógica de sugerencia de pedido:**
SIGPROV busca al proveedor con:
1. Mejor precio unitario
2. Entrega más rápida (mínimo de días)
3. Cumpla el pedido mínimo

Y sugiere cantidad para cubrir **7 días** más un buffer del 15%.`,
  },
  {
    id: 'alertas',
    triggers: ['alerta', 'notificacion', 'que alertas hay', 'tipos de alertas'],
    response: `🔔 **Tipos de alertas en SIGPROV:**

🟡 **Stock crítico** (PRIORIDAD ALTA)
- Materia prima con cobertura < 3 días
- Click → te lleva al módulo Proveedores para hacer pedido

🔴 **Predicción pico** (PRIORIDAD MEDIA)
- Pico inusual de demanda en próximos 7 días (festivo, evento local)
- Sugiere producir X% más que el promedio

🔵 **Inconsistencia** (PRIORIDAD BAJA)
- Ventas registradas sin cierre de caja
- Conteo de caja sin cuadrar

**Dónde verlas:**
- Badge rojo en el menú lateral (icono campana)
- Página **Alertas** completa con descripción y acciones`,
  },
  {
    id: 'prediccion-detalle',
    triggers: ['cuanto hornear', 'cuanta materia prima', 'que significa produccion', 'unidades a producir'],
    response: `🛒 **Cómo se calcula "unidades a producir" en la predicción:**

1. Por cada producto, Prophet predice unidades vendidas para los próximos 7 días
2. SIGPROV multiplica por un **factor de merma** (~5% para panadería)
3. Compara con el stock actual en **inventario**
4. Lo que falta → **unidades a producir**
5. Para cada producto, busca su **receta (BOM)**
6. Multiplica cantidad de cada insumo × unidades a producir
7. Suma el costo de cada insumo → **costo total**
8. Calcula margen esperado = (precio × unidades) - costo

**Ejemplo real:**
- Pan Francés: predicción 7 días = 350 unidades
- Stock actual = 50 unidades
- Merma 5% = +18 unidades
- A producir = **318 unidades**
- Cada Pan Francés usa 80g harina → 25.4kg harina necesaria
- Costo harina × 25.4kg = costo total para materia prima de Pan Francés`,
  },
  {
    id: 'pagina-home',
    triggers: ['que muestra inicio', 'que hay en inicio', 'pagina principal'],
    response: `🏠 **Página de Inicio (Home):**

1. **Hero card** — Ventas de hoy en grande ($1.523.450 COP)
2. **4 mini-KPIs** con sparklines de 7 días:
   - Ticket promedio
   - Productos vendidos
   - Mesas activas
   - Margen del día
3. **Gráfico de barras** — Ventas de los últimos 7 días con día destacado
4. **Salón en vivo** — 4 mesas más activas, click para ver detalle
5. **Top productos** — 6 más vendidos del día
6. **Combos populares** — los 3 más pedidos
7. **Alertas recientes** — últimas 3 alertas

**Actualización:** cada vez que cobrás una mesa, los KPIs se actualizan sin recargar.`,
  },
  {
    id: 'prediccion-pagina',
    triggers: ['pagina prediccion', 'que muestra prediccion', 'pestañas semana'],
    response: `📅 **Página Predicción ML (semana):**

Tiene 3 pestañas:

**Vista general:**
- Hero card con predicción total de la semana
- Gráfico de tendencia por día (línea con banda de confianza)
- Recomendaciones automáticas
- Festivos próximos con icono

**Por producto:**
- Tabla con: producto, predicción 7 días, stock actual, a producir, materia prima, costo, margen
- Filtros por categoría

**Por día:**
- Heatmap 7×16 (días × horas pico)
- Distribución por categoría (donut)
- Predicción detallada para cada día de la semana`,
  },
  {
    id: 'pos',
    triggers: ['pos', 'como vender', 'nueva venta', 'como registro una venta', 'mostrador'],
    response: `🛒 **Cómo registrar una venta rápida (POS / mostrador):**

1. Andá a **Nueva venta** (icono carrito)
2. Elegí el destino:
   - **En mesa** → si es para consumir en el salón, elegí la mesa
   - **Para llevar** → empaquetado
   - **Domicilio** → con dirección del cliente
3. Buscá el producto o combo:
   - Filtrá por categoría (chips arriba)
   - Click en el producto → se suma al carrito
4. El carrito muestra: subtotal, IVA, total
5. Click en **Cobrar** → elegí método de pago → confirmá

**Combos vs individuales:**
- Los combos vienen prearmados y muestran el ahorro vs precio individual
- Click en el combo te lo agrega al carrito entero`,
  },
  {
    id: 'modo-demo',
    triggers: ['modo demo', 'datos de prueba', 'mock', 'es real o prueba'],
    response: `🎭 **Modo demo (mock) — TODOS los datos son sintéticos.**

SIGPROV viene con **mocks realistas** precargados:
- 38 productos (panes, cafés, bebidas Postobón, combos)
- 13 materia prima (harinas, levadura, mantequilla, huevos…)
- 23 recetas con costos calculados
- 8 combos colombianos (Desayuno Completo, Tamal con Chocolate…)
- 12 mesas en 4 zonas
- 7 proveedores con datos de contacto (Bogotá/Medellín reales)
- **30 días de historial de ventas** generado

**¿Se conecta a PostgreSQL real?**
Sí, el backend FastAPI está listo con SQLAlchemy y migraciones. Solo hay que levantar Docker (Postgres + Backend) y cambia automáticamente.

**Para la clase:**
Corre el frontend solo (sin backend) y todo funciona con mocks. Si alguien quiere ver el backend, hay script de carga de fixtures.`,
  },
  {
    id: 'instalacion',
    triggers: ['como instalar', 'como correr', 'como ejecuto', 'requisitos', 'que necesito'],
    response: `⚙️ **Cómo correr SIGPROV en clase (sin instalar nada raro):**

**Opción A — la más rápida (5 minutos):**
1. Asegurate de tener Node.js 18+ instalado
2. Abrí una terminal en la carpeta del proyecto
3. Andá a la carpeta **frontend/** y ejecutá:

   **npm install**
   **npm run dev**

4. Abrí el navegador en **http://localhost:5173**

Todo funciona con datos mock. **No necesitás ni Python ni base de datos**.

**Opción B — completa (con backend + ML):**
1. Ejecutá **INSTALAR_Y_CORRER.bat** que verifica Python + Node, instala todo, y levanta backend y frontend en ventanas separadas

**¿Y si no tengo Node?**
- Descargá Node 18 LTS de https://nodejs.org`,
  },
  {
    id: 'tech-stack',
    triggers: ['stack', 'tecnologias', 'que tecnologias', 'frontend', 'backend', 'lenguaje'],
    response: `🛠️ **Stack técnico de SIGPROV:**

**Frontend:**
- React 18 + TypeScript (strict)
- Vite como bundler
- TailwindCSS + shadcn/ui (componentes)
- TanStack Query (data fetching)
- Recharts (gráficos)
- lucide-react (iconos)
- React Router v6

**Backend (opcional):**
- Python 3.11 + FastAPI
- SQLAlchemy + Alembic (ORM + migraciones)
- PostgreSQL 15 (Docker)
- Pydantic (validación)

**ML:**
- Prophet 1.1.5 (de Meta, fork de Facebook)
- Pandas + NumPy
- scikit-learn (métricas: MAPE, RMSE, MAE)

**Infraestructura:**
- Docker Compose
- venv o pipenv para Python
- npm para Node

**Lo corrés en cualquier PC con 4GB RAM, Windows/Mac/Linux.**`,
  },
  {
    id: 'universidad',
    triggers: ['universidad', 'san mateo', 'proyecto integrador', 'director', 'profe'],
    response: `🎓 **Universidad San Mateo — Proyecto Integrador.**

**Estudiante:** Ronald Steven Marín
**Email:** rsmarinr@sanmateo.edu.co
**Carrera:** Ingeniería de Sistemas

**Directora de proyecto:**
El enfoque cambió 1 vez: inicialmente era gestión de proveedores OC (órdenes de compra) con ML, pero la dirección pivoteó a inventario + predicción para panadería porque el ML de cumplimiento OC no tenía data histórica suficiente.

**Stack del proyecto (resumido):**
- Backend FastAPI con SQLAlchemy
- Frontend React + Vite + TypeScript
- ML Prophet de Meta
- Docker para desarrollo

**Para defender:**
Andá a la página de **Predicción ML** y mostrá cómo una predicción horneada sugerida ↓ materia prima necesaria. Es lo más visual.`,
  },
  {
    id: 'help',
    triggers: ['no entiendo', 'como funciona esto', 'help', 'ayuda', 'donde estoy'],
    response: `ℹ️ **No te preocupes, te guío:**

📍 **Estás en SIGPROV** — sistema de inventario + predicción para panadería.

**Las pantallas principales son:**
- 🏠 **Inicio** — KPIs del día
- 🪑 **Salón** — mesas y pedidos
- 🛒 **Nueva venta** — POS
- 🚚 **Proveedores** — pedidos a proveedores
- 💵 **Cierre de caja** — cuadre de efectivo
- 📅 **Predicción ML** — pronósticos de cuánto hornear

**Si te perdés:** el menú lateral siempre está visible (se puede colapsar).

**Si querés saber más de algo específico:** escribí lo que querés saber, por ejemplo "explícame la predicción" o "qué es un combo".`,
  },
]

/**
 * Busca respuesta para una pregunta libre usando fuzzy matching de triggers.
 */
export function findAnswer(query: string): string {
  const q = query.toLowerCase().trim()

  if (!q) return 'Escribí tu pregunta o elegí una opción de abajo 👇'

  // Priorizar coincidencias más largas (más específicas)
  const sortedAnswers = [...answers].sort(
    (a, b) =>
      Math.max(...b.triggers.map((t) => t.length)) -
      Math.max(...a.triggers.map((t) => t.length)),
  )

  for (const a of sortedAnswers) {
    if (a.triggers.some((trigger) => q.includes(trigger))) {
      return a.response
    }
  }

  return `🤔 **No encontré respuesta exacta** para "${query}".

Puedo explicarte bien estos temas (probá estos):
- "¿Qué es SIGPROV?" → descripción general
- "¿Cómo funciona la predicción ML?" → Prophet
- "¿Cómo cobrar una mesa?" → POS
- "¿Cómo se hace el cierre de caja?" → caja
- "¿Cómo pedir materia prima?" → proveedores
- "¿Qué afecta los festivos?" → Ley Emiliani
- "Necesito ayuda" → tour del sistema

O tocá uno de los botones de abajo 👇`
}

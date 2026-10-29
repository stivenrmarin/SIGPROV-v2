-- ===========================================================================
-- SIGPROV — Sistema de Inventario + Predicción de Ventas
-- Schema principal (v2.0)
--
-- Este archivo es la FUENTE DE VERDAD de la base de datos.
-- Cualquier cambio en la estructura DEBE reflejarse primero en SPEC.md.
--
-- Tablas:
--   1. productos
--   2. stock_materia_prima
--   3. recetas (BOM)
--   4. movimientos_inventario (kardex)
--   5. ventas
--   6. detalle_ventas
--   7. predicciones (log ML)
--   8. calendario_festivos
-- ===========================================================================

-- Limpiar si existe (solo dev)
DROP TABLE IF EXISTS predicciones       CASCADE;
DROP TABLE IF EXISTS detalle_ventas     CASCADE;
DROP TABLE IF EXISTS ventas             CASCADE;
DROP TABLE IF EXISTS movimientos_inventario CASCADE;
DROP TABLE IF EXISTS recetas            CASCADE;
DROP TABLE IF EXISTS stock_materia_prima CASCADE;
DROP TABLE IF EXISTS productos          CASCADE;
DROP TABLE IF EXISTS calendario_festivos CASCADE;

DROP FUNCTION IF EXISTS actualizar_stock_producto() CASCADE;
DROP FUNCTION IF EXISTS descontar_stock_por_venta() CASCADE;
DROP FUNCTION IF EXISTS descontar_materia_prima_por_venta() CASCADE;

-- ===========================================================================
-- 1. PRODUCTOS
-- ===========================================================================
CREATE TABLE productos (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(120) UNIQUE NOT NULL,
    tipo            VARCHAR(20)  NOT NULL CHECK (tipo IN ('terminado', 'materia_prima')),
    categoria       VARCHAR(60)  NOT NULL,
    precio_venta    NUMERIC(12,2),
    costo_unitario  NUMERIC(12,2) NOT NULL CHECK (costo_unitario >= 0),
    unidad          VARCHAR(20)  NOT NULL DEFAULT 'unidad',
    stock_actual    INTEGER      NOT NULL DEFAULT 0 CHECK (stock_actual >= 0),
    stock_minimo    INTEGER      NOT NULL DEFAULT 5 CHECK (stock_minimo >= 0),
    activo          BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_productos_tipo     ON productos(tipo);
CREATE INDEX idx_productos_categoria ON productos(categoria);
CREATE INDEX idx_productos_activo   ON productos(activo);

-- ===========================================================================
-- 2. STOCK MATERIA PRIMA
-- ===========================================================================
-- La materia prima maneja cantidades fraccionarias (kg, litros) por eso va
-- separada. Los productos terminados usan stock_actual de `productos`.
CREATE TABLE stock_materia_prima (
    producto_id       INTEGER PRIMARY KEY REFERENCES productos(id) ON DELETE CASCADE,
    cantidad_actual   NUMERIC(10,3) NOT NULL DEFAULT 0 CHECK (cantidad_actual >= 0),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ===========================================================================
-- 3. RECETAS (BOM — Bill of Materials)
-- ===========================================================================
-- Solo productos terminados HECHOS EN CASA tienen receta.
-- Los productos comprados (ej. Postobón) NO tienen receta.
CREATE TABLE recetas (
    id                      SERIAL PRIMARY KEY,
    producto_terminado_id   INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    materia_prima_id        INTEGER NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
    cantidad_necesaria      NUMERIC(10,3) NOT NULL CHECK (cantidad_necesaria > 0),
    UNIQUE (producto_terminado_id, materia_prima_id),
    CHECK (producto_terminado_id <> materia_prima_id)
);

CREATE INDEX idx_recetas_producto ON recetas(producto_terminado_id);

-- ===========================================================================
-- 4. MOVIMIENTOS INVENTARIO (KARDEX)
-- ===========================================================================
CREATE TABLE movimientos_inventario (
    id              SERIAL PRIMARY KEY,
    producto_id     INTEGER NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
    tipo_movimiento VARCHAR(20) NOT NULL CHECK (
                        tipo_movimiento IN (
                            'entrada', 'salida', 'ajuste',
                            'merma', 'consumo_produccion'
                        )
                    ),
    cantidad        NUMERIC(10,3) NOT NULL CHECK (cantidad > 0),
    unidad          VARCHAR(20) NOT NULL,
    motivo          VARCHAR(200),
    referencia      VARCHAR(60),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mov_producto    ON movimientos_inventario(producto_id);
CREATE INDEX idx_mov_tipo        ON movimientos_inventario(tipo_movimiento);
CREATE INDEX idx_mov_created     ON movimientos_inventario(created_at);
CREATE INDEX idx_mov_referencia  ON movimientos_inventario(referencia);

-- Trigger: actualiza stock_actual (productos terminados) o
--          cantidad_actual (stock_materia_prima) segun tipo del producto.
CREATE OR REPLACE FUNCTION actualizar_stock_producto() RETURNS TRIGGER AS $$
DECLARE
    v_tipo VARCHAR(20);
    v_unidad VARCHAR(20);
BEGIN
    SELECT tipo, unidad INTO v_tipo, v_unidad
    FROM productos WHERE id = NEW.producto_id;

    -- Determinar signo
    IF NEW.tipo_movimiento IN ('entrada') THEN
        -- productos terminados (integer)
        IF v_tipo = 'terminado' THEN
            UPDATE productos
            SET stock_actual = stock_actual + NEW.cantidad,
                updated_at = NOW()
            WHERE id = NEW.producto_id;
        ELSE
            UPDATE stock_materia_prima
            SET cantidad_actual = cantidad_actual + NEW.cantidad,
                updated_at = NOW()
            WHERE producto_id = NEW.producto_id;
        END IF;

    ELSIF NEW.tipo_movimiento IN ('salida', 'merma', 'consumo_produccion') THEN
        IF v_tipo = 'terminado' THEN
            UPDATE productos
            SET stock_actual = stock_actual - NEW.cantidad,
                updated_at = NOW()
            WHERE id = NEW.producto_id;
        ELSE
            UPDATE stock_materia_prima
            SET cantidad_actual = cantidad_actual - NEW.cantidad,
                updated_at = NOW()
            WHERE producto_id = NEW.producto_id;
        END IF;

    ELSIF NEW.tipo_movimiento = 'ajuste' THEN
        -- Ajuste fijo al valor de NEW.cantidad (conteo físico)
        IF v_tipo = 'terminado' THEN
            UPDATE productos
            SET stock_actual = NEW.cantidad,
                updated_at = NOW()
            WHERE id = NEW.producto_id;
        ELSE
            UPDATE stock_materia_prima
            SET cantidad_actual = NEW.cantidad,
                updated_at = NOW()
            WHERE producto_id = NEW.producto_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_actualizar_stock
    AFTER INSERT ON movimientos_inventario
    FOR EACH ROW EXECUTE FUNCTION actualizar_stock_producto();

-- ===========================================================================
-- 5. VENTAS
-- ===========================================================================
CREATE TABLE ventas (
    id          SERIAL PRIMARY KEY,
    fecha       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    total       NUMERIC(12,2) NOT NULL CHECK (total >= 0),
    metodo_pago VARCHAR(20) NOT NULL DEFAULT 'efectivo'
                    CHECK (metodo_pago IN ('efectivo', 'transferencia', 'datáfono', 'mixto')),
    notas       VARCHAR(200),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ventas_fecha ON ventas(fecha);

-- ===========================================================================
-- 6. DETALLE VENTAS
-- ===========================================================================
CREATE TABLE detalle_ventas (
    id               SERIAL PRIMARY KEY,
    venta_id         INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    producto_id      INTEGER NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
    cantidad         INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario  NUMERIC(12,2) NOT NULL CHECK (precio_unitario >= 0),
    subtotal         NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0)
);

CREATE INDEX idx_detalle_venta    ON detalle_ventas(venta_id);
CREATE INDEX idx_detalle_producto ON detalle_ventas(producto_id);

-- Trigger 1: descontar stock del producto terminado vendido
CREATE OR REPLACE FUNCTION descontar_stock_por_venta() RETURNS TRIGGER AS $$
DECLARE
    v_nombre   VARCHAR(120);
    v_unidad   VARCHAR(20);
    v_stock    INTEGER;
BEGIN
    SELECT nombre, unidad, stock_actual
    INTO v_nombre, v_unidad, v_stock
    FROM productos WHERE id = NEW.producto_id;

    IF v_stock < NEW.cantidad THEN
        RAISE EXCEPTION 'Stock insuficiente para %: hay % pero se venden %',
            v_nombre, v_stock, NEW.cantidad;
    END IF;

    INSERT INTO movimientos_inventario (
        producto_id, tipo_movimiento, cantidad, unidad,
        motivo, referencia
    ) VALUES (
        NEW.producto_id, 'salida', NEW.cantidad, v_unidad,
        'Venta automática', 'venta #' || NEW.venta_id
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_descontar_stock_venta
    BEFORE INSERT ON detalle_ventas
    FOR EACH ROW EXECUTE FUNCTION descontar_stock_por_venta();

-- Trigger 2: descontar materia prima segun receta
CREATE OR REPLACE FUNCTION descontar_materia_prima_por_venta() RETURNS TRIGGER AS $$
DECLARE
    v_cantidad_total NUMERIC(10,3);
    v_stock_mp       NUMERIC(10,3);
    v_nombre_mp      VARCHAR(120);
    r                RECORD;
BEGIN
    FOR r IN
        SELECT mpr.id AS receta_id,
               mpr.materia_prima_id,
               mpr.cantidad_necesaria,
               mp.nombre,
               mp.unidad,
               smp.cantidad_actual
        FROM recetas mpr
        JOIN productos mp ON mp.id = mpr.materia_prima_id
        LEFT JOIN stock_materia_prima smp ON smp.producto_id = mp.id
        WHERE mpr.producto_terminado_id = NEW.producto_id
    LOOP
        v_cantidad_total := r.cantidad_necesaria * NEW.cantidad;
        v_stock_mp       := COALESCE(r.cantidad_actual, 0);

        IF v_stock_mp < v_cantidad_total THEN
            RAISE EXCEPTION 'Materia prima insuficiente para producir: % (necesita %.3f %s, hay %.3f %s)',
                r.nombre, v_cantidad_total, r.unidad, v_stock_mp, r.unidad;
        END IF;

        INSERT INTO movimientos_inventario (
            producto_id, tipo_movimiento, cantidad, unidad,
            motivo, referencia
        ) VALUES (
            r.materia_prima_id, 'consumo_produccion', v_cantidad_total, r.unidad,
            'Consumo por venta #' || NEW.venta_id || ' (' || NEW.cantidad || ' un.)',
            'venta #' || NEW.venta_id
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_descontar_materia_prima_venta
    AFTER INSERT ON detalle_ventas
    FOR EACH ROW EXECUTE FUNCTION descontar_materia_prima_por_venta();

-- ===========================================================================
-- 7. PREDICCIONES (log de predicciones servidas)
-- ===========================================================================
CREATE TABLE predicciones (
    id                  SERIAL PRIMARY KEY,
    fecha_prediccion    DATE NOT NULL,
    producto_id         INTEGER REFERENCES productos(id) ON DELETE CASCADE,
    cantidad_predicha   NUMERIC(12,2) NOT NULL,
    limite_inferior     NUMERIC(12,2) NOT NULL,
    limite_superior     NUMERIC(12,2) NOT NULL,
    cantidad_real       NUMERIC(12,2),
    error_pct           NUMERIC(6,2),
    modelo_version      VARCHAR(30) NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pred_fecha     ON predicciones(fecha_prediccion);
CREATE INDEX idx_pred_producto  ON predicciones(producto_id);

-- ===========================================================================
-- 8. CALENDARIO FESTIVOS COLOMBIANOS
-- ===========================================================================
-- Cargado en 02_festivos.sql con los festivos 2025-2026 reales
-- (Ley Emiliani incluidos).
CREATE TABLE calendario_festivos (
    fecha          DATE PRIMARY KEY,
    nombre         VARCHAR(60) NOT NULL,
    tipo           VARCHAR(15) NOT NULL CHECK (
                      tipo IN ('festivo', 'puente', 'semana_santa',
                               'navidad', 'fin_anio')
                  ),
    efecto_venta   NUMERIC(4,2) NOT NULL DEFAULT -0.30
    -- -0.30 = vende 30% menos; 0.40 = vende 40% más
);

CREATE INDEX idx_festivos_tipo ON calendario_festivos(tipo);

-- ===========================================================================
-- Trigger updated_at automático
-- ===========================================================================
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_touch_productos
    BEFORE UPDATE ON productos
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER trg_touch_stock_mp
    BEFORE UPDATE ON stock_materia_prima
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ===========================================================================
-- Comentarios para documentación
-- ===========================================================================
COMMENT ON TABLE  productos               IS 'Productos: panes, bebidas, materia prima';
COMMENT ON TABLE  stock_materia_prima     IS 'Stock fraccionario de materia prima (kg, litros)';
COMMENT ON TABLE  recetas                 IS 'Bill of Materials: que necesita cada producto';
COMMENT ON TABLE  movimientos_inventario  IS 'Kardex unificado de todos los movimientos';
COMMENT ON TABLE  ventas                  IS 'Cabecera de ventas';
COMMENT ON TABLE  detalle_ventas          IS 'Detalle de cada venta (productos vendidos)';
COMMENT ON TABLE  predicciones             IS 'Log de predicciones servidas por el modelo ML';
COMMENT ON TABLE  calendario_festivos     IS 'Festivos colombianos con efecto en ventas';

COMMENT ON COLUMN productos.tipo          IS 'terminado = se vende al cliente; materia_prima = insumo';
COMMENT ON COLUMN movimientos_inventario.tipo_movimiento IS 'entrada/salida/ajuste/merma/consumo_produccion';
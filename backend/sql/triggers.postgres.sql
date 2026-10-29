-- ===========================================================================
-- SIGPROV - Triggers de PostgreSQL
-- ===========================================================================
-- Se aplican DESPUES de crear las tablas (ver scripts/inicializar_db.py).
-- Las tablas se crean desde los modelos ORM (app/models.py), que son la
-- fuente de verdad de la estructura.
--
-- Trigger 1: actualiza el stock cuando se registra un movimiento
-- Trigger 2: descuenta stock al vender un producto terminado
-- Trigger 3: descuenta materia prima segun la receta al vender
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Trigger 1: stock <- movimientos_inventario
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION actualizar_stock_producto() RETURNS TRIGGER AS $$
DECLARE
    v_tipo VARCHAR(20);
BEGIN
    SELECT tipo INTO v_tipo FROM productos WHERE id = NEW.producto_id;

    IF NEW.tipo_movimiento = 'entrada' THEN
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
        -- Ajuste a valor absoluto (conteo fisico)
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

DROP TRIGGER IF EXISTS trg_actualizar_stock ON movimientos_inventario;
CREATE TRIGGER trg_actualizar_stock
    AFTER INSERT ON movimientos_inventario
    FOR EACH ROW EXECUTE FUNCTION actualizar_stock_producto();

-- ---------------------------------------------------------------------------
-- Trigger 2: descontar stock del producto terminado al vender
-- ---------------------------------------------------------------------------
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

DROP TRIGGER IF EXISTS trg_descontar_stock_venta ON detalle_ventas;
CREATE TRIGGER trg_descontar_stock_venta
    BEFORE INSERT ON detalle_ventas
    FOR EACH ROW EXECUTE FUNCTION descontar_stock_por_venta();

-- ---------------------------------------------------------------------------
-- Trigger 3: descontar materia prima segun receta (BOM)
-- ---------------------------------------------------------------------------
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

DROP TRIGGER IF EXISTS trg_descontar_materia_prima_venta ON detalle_ventas;
CREATE TRIGGER trg_descontar_materia_prima_venta
    BEFORE INSERT ON detalle_ventas
    FOR EACH ROW EXECUTE FUNCTION descontar_materia_prima_por_venta();

-- ---------------------------------------------------------------------------
-- Triggers de updated_at
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_productos ON productos;
CREATE TRIGGER trg_touch_productos
    BEFORE UPDATE ON productos
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_touch_stock_mp ON stock_materia_prima;
CREATE TRIGGER trg_touch_stock_mp
    BEFORE UPDATE ON stock_materia_prima
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

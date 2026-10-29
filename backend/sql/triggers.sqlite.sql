-- ===========================================================================
-- SIGPROV - Triggers de SQLite (desarrollo y tests)
-- ===========================================================================
-- Equivalente funcional de triggers.postgres.sql.
-- SQLite no tiene plpgsql ni loops, asi que la logica se resuelve con
-- INSERT ... SELECT y validaciones mediante RAISE(ABORT, ...).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Trigger 1: stock <- movimientos_inventario
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_actualizar_stock;

CREATE TRIGGER trg_actualizar_stock
AFTER INSERT ON movimientos_inventario
BEGIN
    -- entrada: suma stock al producto terminado
    UPDATE productos
    SET stock_actual = stock_actual + NEW.cantidad,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.producto_id
      AND NEW.tipo_movimiento = 'entrada'
      AND (SELECT tipo FROM productos WHERE id = NEW.producto_id) = 'terminado';

    -- entrada: suma stock a la materia prima
    UPDATE stock_materia_prima
    SET cantidad_actual = cantidad_actual + NEW.cantidad,
        updated_at = CURRENT_TIMESTAMP
    WHERE producto_id = NEW.producto_id
      AND NEW.tipo_movimiento = 'entrada'
      AND (SELECT tipo FROM productos WHERE id = NEW.producto_id) <> 'terminado';

    -- salida / merma / consumo: resta stock del producto terminado
    UPDATE productos
    SET stock_actual = stock_actual - NEW.cantidad,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.producto_id
      AND NEW.tipo_movimiento IN ('salida', 'merma', 'consumo_produccion')
      AND (SELECT tipo FROM productos WHERE id = NEW.producto_id) = 'terminado';

    -- salida / merma / consumo: resta stock de la materia prima
    UPDATE stock_materia_prima
    SET cantidad_actual = cantidad_actual - NEW.cantidad,
        updated_at = CURRENT_TIMESTAMP
    WHERE producto_id = NEW.producto_id
      AND NEW.tipo_movimiento IN ('salida', 'merma', 'consumo_produccion')
      AND (SELECT tipo FROM productos WHERE id = NEW.producto_id) <> 'terminado';

    -- ajuste: valor absoluto (conteo fisico) del producto terminado
    UPDATE productos
    SET stock_actual = NEW.cantidad,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.producto_id
      AND NEW.tipo_movimiento = 'ajuste'
      AND (SELECT tipo FROM productos WHERE id = NEW.producto_id) = 'terminado';

    -- ajuste: valor absoluto de la materia prima
    UPDATE stock_materia_prima
    SET cantidad_actual = NEW.cantidad,
        updated_at = CURRENT_TIMESTAMP
    WHERE producto_id = NEW.producto_id
      AND NEW.tipo_movimiento = 'ajuste'
      AND (SELECT tipo FROM productos WHERE id = NEW.producto_id) <> 'terminado';
END;

-- ---------------------------------------------------------------------------
-- Trigger 2: descontar stock del producto terminado al vender
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_descontar_stock_venta;

CREATE TRIGGER trg_descontar_stock_venta
BEFORE INSERT ON detalle_ventas
BEGIN
    -- Validar stock suficiente (ABORT revierte el INSERT en curso)
    SELECT CASE
        WHEN stock_actual < NEW.cantidad THEN
            RAISE(ABORT, 'Stock insuficiente: hay ' || stock_actual || ' y se venden ' || NEW.cantidad)
    END
    FROM productos
    WHERE id = NEW.producto_id;

    -- Registrar la salida en el kardex
    INSERT INTO movimientos_inventario (
        producto_id, tipo_movimiento, cantidad, unidad, motivo, referencia
    )
    SELECT id, 'salida', NEW.cantidad, unidad, 'Venta automática', 'venta #' || NEW.venta_id
    FROM productos
    WHERE id = NEW.producto_id;
END;

-- ---------------------------------------------------------------------------
-- Trigger 3: descontar materia prima segun receta (BOM)
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_descontar_materia_prima_venta;

CREATE TRIGGER trg_descontar_materia_prima_venta
BEFORE INSERT ON detalle_ventas
BEGIN
    -- Validar que TODA la materia prima necesaria esté disponible
    SELECT CASE
        WHEN EXISTS (
            SELECT 1
            FROM recetas mpr
            JOIN productos mp ON mp.id = mpr.materia_prima_id
            LEFT JOIN stock_materia_prima smp ON smp.producto_id = mp.id
            WHERE mpr.producto_terminado_id = NEW.producto_id
              AND COALESCE(smp.cantidad_actual, 0) < (mpr.cantidad_necesaria * NEW.cantidad)
        ) THEN
            RAISE(ABORT, 'Materia prima insuficiente para producir el producto vendido')
    END;

    -- Registrar el consumo de TODOS los insumos de la receta
    INSERT INTO movimientos_inventario (
        producto_id, tipo_movimiento, cantidad, unidad, motivo, referencia
    )
    SELECT mpr.materia_prima_id,
           'consumo_produccion',
           mpr.cantidad_necesaria * NEW.cantidad,
           mp.unidad,
           'Consumo por venta #' || NEW.venta_id,
           'venta #' || NEW.venta_id
    FROM recetas mpr
    JOIN productos mp ON mp.id = mpr.materia_prima_id
    WHERE mpr.producto_terminado_id = NEW.producto_id;
END;

-- ---------------------------------------------------------------------------
-- Triggers de updated_at
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_touch_productos;

CREATE TRIGGER trg_touch_productos
AFTER UPDATE ON productos
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE productos
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

DROP TRIGGER IF EXISTS trg_touch_stock_mp;

CREATE TRIGGER trg_touch_stock_mp
AFTER UPDATE ON stock_materia_prima
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE stock_materia_prima
    SET updated_at = CURRENT_TIMESTAMP
    WHERE producto_id = NEW.producto_id;
END;

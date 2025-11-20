-- ====================================================================
-- MIGRACION: Sistema de múltiples formas de pago
-- Fecha: 2025-11-20
-- Descripción: La tabla 'pagos' ya soporta múltiples registros por venta.
--              Solo necesitamos verificar que la estructura esté correcta.
-- ====================================================================

USE negocio_db;

-- Verificar estructura de la tabla pagos (solo para referencia)
-- La tabla ya existe y permite múltiples pagos por venta mediante venta_id

-- Mostrar estructura actual
DESCRIBE pagos;

-- Nota: No se requieren cambios en la base de datos.
-- La tabla 'pagos' ya está diseñada para soportar múltiples formas de pago
-- mediante registros individuales con el mismo venta_id.

-- Ejemplo de consulta para ver múltiples pagos de una venta:
-- SELECT * FROM pagos WHERE venta_id = 1;

-- ====================================================================
-- IMPORTANTE:
-- ====================================================================
-- 1. La tabla 'pagos' ya soporta múltiples registros por venta
-- 2. Los cambios realizados son principalmente en el código frontend/backend
-- 3. No se requiere ejecutar ningún ALTER TABLE
-- 4. Reinicia el servidor Node.js para aplicar los cambios del código
-- ====================================================================

-- Consulta útil para ver ventas con sus múltiples pagos:
/*
SELECT 
  v.id as venta_id,
  v.fecha,
  v.total,
  GROUP_CONCAT(DISTINCT pg.tipo_pago ORDER BY pg.id SEPARATOR ', ') as tipos_pago,
  GROUP_CONCAT(DISTINCT pg.monto ORDER BY pg.id SEPARATOR ', ') as montos_pago
FROM ventas v
LEFT JOIN pagos pg ON v.id = pg.venta_id
GROUP BY v.id
ORDER BY v.fecha DESC;
*/

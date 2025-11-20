-- ====================================================================
-- MIGRACION: Agregar columna estado a productos, clientes y proveedores
-- Fecha: 2025-11-20
-- Descripción: Permitir gestión de estados en lugar de eliminación física
-- ====================================================================

USE negocio_db;

-- Agregar columna estado a productos
ALTER TABLE productos 
ADD COLUMN IF NOT EXISTS estado ENUM('activo', 'inactivo') DEFAULT 'activo' AFTER stock;

-- Actualizar productos existentes para que tengan estado activo
UPDATE productos SET estado = 'activo' WHERE estado IS NULL;

-- Agregar columna estado a clientes
ALTER TABLE clientes 
ADD COLUMN IF NOT EXISTS estado ENUM('activo', 'inactivo', 'deudor') DEFAULT 'activo' AFTER direccion;

-- Actualizar clientes existentes para que tengan estado activo
UPDATE clientes SET estado = 'activo' WHERE estado IS NULL;

-- Agregar columna estado a proveedores
ALTER TABLE proveedores 
ADD COLUMN IF NOT EXISTS estado ENUM('activo', 'inactivo') DEFAULT 'activo' AFTER direccion;

-- Actualizar proveedores existentes para que tengan estado activo
UPDATE proveedores SET estado = 'activo' WHERE estado IS NULL;

-- ====================================================================
-- Verificar cambios
-- ====================================================================
DESCRIBE productos;
DESCRIBE clientes;
DESCRIBE proveedores;

-- ====================================================================
-- Consultas útiles para verificar estados
-- ====================================================================

-- Ver productos activos/inactivos
SELECT 
  id, nombre, precio, stock, estado
FROM productos
ORDER BY estado, nombre;

-- Ver clientes por estado
SELECT 
  id, nombre, telefono, estado
FROM clientes
ORDER BY estado, nombre;

-- Ver proveedores activos/inactivos
SELECT 
  id, nombre, contacto, telefono, estado
FROM proveedores
ORDER BY estado, nombre;

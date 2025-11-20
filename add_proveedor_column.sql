-- Script para agregar la columna proveedor_id a la tabla productos
USE negocio_db;

-- Agregar columna proveedor_id si no existe
ALTER TABLE productos ADD COLUMN IF NOT EXISTS proveedor_id INT NULL;

-- Agregar foreign key constraint
ALTER TABLE productos ADD CONSTRAINT fk_productos_proveedor 
  FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE SET NULL;

-- Verificar que la columna se agregó correctamente
DESCRIBE productos;

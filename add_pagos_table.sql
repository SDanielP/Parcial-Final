-- Script para agregar tabla de pagos y vincularla con ventas
USE negocio_db;

-- Crear tabla de pagos
CREATE TABLE IF NOT EXISTS pagos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  venta_id INT NOT NULL,
  tipo_pago ENUM('efectivo', 'tarjeta', 'qr', 'transferencia') NOT NULL,
  monto DECIMAL(10,2) NOT NULL,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notas TEXT,
  FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE
);

-- Verificar que la tabla se creó correctamente
DESCRIBE pagos;

-- Nota: Puedes tener múltiples pagos por venta (pago dividido)
-- Por ejemplo: $500 en efectivo + $300 en tarjeta = $800 total

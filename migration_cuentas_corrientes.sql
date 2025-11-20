-- Migración: Sistema de Cuentas Corrientes
USE negocio_db;

-- Agregar límite de cuenta corriente a clientes
ALTER TABLE clientes 
ADD COLUMN limite_cuenta_corriente DECIMAL(10,2) DEFAULT 0.00 AFTER direccion;

-- Tabla de cuentas corrientes (registra cada venta a crédito)
CREATE TABLE IF NOT EXISTS cuentas_corrientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  venta_id INT NOT NULL,
  cliente_id INT NOT NULL,
  monto DECIMAL(10,2) NOT NULL,
  saldo_pendiente DECIMAL(10,2) NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  estado ENUM('pendiente', 'pagada', 'vencida') DEFAULT 'pendiente',
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
  INDEX idx_cliente (cliente_id),
  INDEX idx_estado (estado),
  INDEX idx_vencimiento (fecha_vencimiento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de pagos de cuentas corrientes
CREATE TABLE IF NOT EXISTS pagos_cuenta_corriente (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cuenta_corriente_id INT NOT NULL,
  monto_pagado DECIMAL(10,2) NOT NULL,
  fecha_pago TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  usuario_id INT,
  notas TEXT,
  FOREIGN KEY (cuenta_corriente_id) REFERENCES cuentas_corrientes(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_cuenta (cuenta_corriente_id),
  INDEX idx_fecha (fecha_pago)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

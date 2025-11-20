-- Migración: Sistema de Alquiler de Dispensers
USE negocio_db;

-- Tabla de dispensers (inventario de equipos)
CREATE TABLE IF NOT EXISTS dispensers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(50) UNIQUE NOT NULL,
  marca VARCHAR(100),
  modelo VARCHAR(100),
  numero_serie VARCHAR(100) UNIQUE,
  estado ENUM('disponible', 'alquilado', 'mantenimiento', 'baja') DEFAULT 'disponible',
  precio_alquiler_mensual DECIMAL(10,2) NOT NULL,
  fecha_compra DATE,
  notas TEXT,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_estado (estado),
  INDEX idx_codigo (codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de alquileres (contratos activos)
CREATE TABLE IF NOT EXISTS alquileres_dispenser (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dispenser_id INT NOT NULL,
  cliente_id INT NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NULL,
  precio_mensual DECIMAL(10,2) NOT NULL,
  dia_cobro INT DEFAULT 15 COMMENT 'Día del mes para cobro (1-31)',
  estado ENUM('activo', 'finalizado', 'suspendido') DEFAULT 'activo',
  deposito_garantia DECIMAL(10,2) DEFAULT 0.00,
  direccion_instalacion TEXT NOT NULL,
  notas TEXT,
  usuario_registro_id INT,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dispenser_id) REFERENCES dispensers(id) ON DELETE RESTRICT,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE RESTRICT,
  FOREIGN KEY (usuario_registro_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_cliente (cliente_id),
  INDEX idx_dispenser (dispenser_id),
  INDEX idx_estado (estado),
  INDEX idx_fecha_inicio (fecha_inicio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de pagos de alquiler
CREATE TABLE IF NOT EXISTS pagos_alquiler (
  id INT AUTO_INCREMENT PRIMARY KEY,
  alquiler_id INT NOT NULL,
  mes_cobro DATE NOT NULL COMMENT 'Primer día del mes cobrado (YYYY-MM-01)',
  monto DECIMAL(10,2) NOT NULL,
  fecha_pago TIMESTAMP NULL,
  tipo_pago ENUM('efectivo', 'tarjeta', 'qr', 'transferencia', 'cuenta_corriente') NULL,
  estado ENUM('pendiente', 'pagado', 'vencido', 'cancelado') DEFAULT 'pendiente',
  fecha_vencimiento DATE NOT NULL,
  usuario_cobro_id INT NULL,
  notas TEXT,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (alquiler_id) REFERENCES alquileres_dispenser(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_cobro_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_alquiler (alquiler_id),
  INDEX idx_estado (estado),
  INDEX idx_mes_cobro (mes_cobro),
  INDEX idx_fecha_vencimiento (fecha_vencimiento),
  UNIQUE KEY unique_alquiler_mes (alquiler_id, mes_cobro)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de historial de mantenimientos (opcional pero recomendado)
CREATE TABLE IF NOT EXISTS mantenimientos_dispenser (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dispenser_id INT NOT NULL,
  fecha_mantenimiento DATE NOT NULL,
  tipo ENUM('preventivo', 'correctivo', 'instalacion', 'retiro') NOT NULL,
  descripcion TEXT NOT NULL,
  costo DECIMAL(10,2) DEFAULT 0.00,
  realizado_por VARCHAR(100),
  usuario_registro_id INT,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dispenser_id) REFERENCES dispensers(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_registro_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_dispenser (dispenser_id),
  INDEX idx_fecha (fecha_mantenimiento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar algunos dispensers de ejemplo
INSERT INTO dispensers (codigo, marca, modelo, numero_serie, estado, precio_alquiler_mensual, fecha_compra, notas) VALUES
('DISP-001', 'Drago', 'Classic', 'SN001234', 'disponible', 500.00, '2024-01-15', 'Dispenser blanco con filtro'),
('DISP-002', 'Drago', 'Premium', 'SN001235', 'disponible', 700.00, '2024-01-15', 'Dispenser con frio y calor'),
('DISP-003', 'Drago', 'Classic', 'SN001236', 'disponible', 500.00, '2024-02-10', 'Dispenser negro');

-- Comentarios sobre el diseño:
-- 1. dispensers.estado: controla si está disponible, alquilado, en mantenimiento o dado de baja
-- 2. alquileres_dispenser: un dispenser solo puede tener UN alquiler activo a la vez
-- 3. pagos_alquiler: se genera un registro por mes que se cobra (puede generarse automáticamente)
-- 4. dia_cobro: permite personalizar el día de cobro por cliente (por defecto 15)
-- 5. deposito_garantia: registro del depósito inicial que se devuelve al finalizar

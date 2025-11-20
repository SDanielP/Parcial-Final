-- Tabla para registrar historial de cambios en productos
CREATE TABLE IF NOT EXISTS historico_productos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  producto_id INT NOT NULL,
  usuario_id INT NOT NULL,
  nombre_anterior VARCHAR(255),
  descripcion_anterior TEXT,
  precio_anterior DECIMAL(10,2),
  stock_anterior INT,
  nombre_nuevo VARCHAR(255),
  descripcion_nueva TEXT,
  precio_nuevo DECIMAL(10,2),
  stock_nuevo INT,
  fecha_cambio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_producto (producto_id),
  INDEX idx_usuario (usuario_id),
  INDEX idx_fecha (fecha_cambio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

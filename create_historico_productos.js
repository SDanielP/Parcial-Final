// Script para crear tabla historico_productos
require('dotenv').config();
const pool = require('./src/db');
const util = require('util');
const query = util.promisify(pool.query).bind(pool);

const createTableQuery = `
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`;

async function runMigration() {
  console.log('🚀 Creando tabla historico_productos...\n');
  
  try {
    await query(createTableQuery);
    console.log('✅ Tabla historico_productos creada exitosamente\n');
    
    // Verificar estructura
    const describe = await query('DESCRIBE historico_productos');
    console.log('📋 Estructura de la tabla:');
    console.table(describe);
    
    console.log('\n🎉 Migración completada!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

runMigration();

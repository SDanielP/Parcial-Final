// Script para ejecutar migración de estados directamente desde Node.js
require('dotenv').config();
const pool = require('./src/db');

const queries = [
  // Agregar columna estado a productos
  "ALTER TABLE productos ADD COLUMN estado ENUM('activo', 'inactivo') DEFAULT 'activo' AFTER stock",
  
  // Actualizar productos existentes
  "UPDATE productos SET estado = 'activo' WHERE estado IS NULL",
  
  // Agregar columna estado a clientes
  "ALTER TABLE clientes ADD COLUMN estado ENUM('activo', 'inactivo', 'deudor') DEFAULT 'activo' AFTER direccion",
  
  // Actualizar clientes existentes
  "UPDATE clientes SET estado = 'activo' WHERE estado IS NULL",
  
  // Agregar columna estado a proveedores
  "ALTER TABLE proveedores ADD COLUMN estado ENUM('activo', 'inactivo') DEFAULT 'activo' AFTER direccion",
  
  // Actualizar proveedores existentes
  "UPDATE proveedores SET estado = 'activo' WHERE estado IS NULL",

  // Agregar columna estado a pagos
  "ALTER TABLE pagos ADD COLUMN estado ENUM('pendiente','procesado','cancelado','anulado') DEFAULT 'procesado' AFTER monto",

  // Agregar columna pago_id a movimientos_caja (sin FK por ahora)
  "ALTER TABLE movimientos_caja ADD COLUMN pago_id INT NULL AFTER caja_id"
];

console.log('🚀 Iniciando migración de estados...\n');

async function runMigration() {
  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    console.log(`📝 Ejecutando query ${i + 1}/${queries.length}...`);
    
    try {
      await new Promise((resolve, reject) => {
        pool.query(query, (error, results) => {
          if (error) {
            // Ignorar errores comunes de migración
            if (error.code === 'ER_DUP_FIELDNAME' || 
                error.message.includes('Duplicate column') ||
                error.code === 'ER_DUP_KEYNAME' ||
                error.message.includes('Duplicate key name') ||
                error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
              console.log(`   ⚠️  Ya existe, continuando...`);
              resolve();
            } else {
              reject(error);
            }
          } else {
            console.log(`   ✅ Completado`);
            resolve();
          }
        });
      });
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      pool.end();
      process.exit(1);
    }
  }
  
  console.log('\n✨ Migración completada exitosamente!\n');
  console.log('Verificando cambios...\n');
  
  // Verificar cambios
  pool.query('DESCRIBE pagos', (err, results) => {
    if (!err) {
      const estadoCol = results.find(r => r.Field === 'estado');
      if (estadoCol) {
        console.log('✅ pagos.estado:', estadoCol.Type);
      } else {
        console.log('❌ pagos.estado: NO ENCONTRADA');
      }
    } else {
      console.log('❌ Error al verificar pagos:', err.message);
    }
  });
  
  pool.query('DESCRIBE movimientos_caja', (err, results) => {
    if (!err) {
      const pagoIdCol = results.find(r => r.Field === 'pago_id');
      if (pagoIdCol) {
        console.log('✅ movimientos_caja.pago_id:', pagoIdCol.Type);
      } else {
        console.log('❌ movimientos_caja.pago_id: NO ENCONTRADA');
      }
    } else {
      console.log('❌ Error al verificar movimientos_caja:', err.message);
    }
    
    setTimeout(() => {
      pool.end();
      console.log('\n🎉 Todo listo! Reinicia el servidor Node.js\n');
      process.exit(0);
    }, 1000);
  });
}

runMigration();

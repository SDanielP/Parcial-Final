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
  "UPDATE proveedores SET estado = 'activo' WHERE estado IS NULL"
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
            // Ignorar error si la columna ya existe
            if (error.code === 'ER_DUP_FIELDNAME' || error.message.includes('Duplicate column')) {
              console.log(`   ⚠️  Columna ya existe, continuando...`);
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
  pool.query('DESCRIBE productos', (err, results) => {
    if (!err) {
      const estadoCol = results.find(r => r.Field === 'estado');
      if (estadoCol) {
        console.log('✅ productos.estado:', estadoCol.Type);
      }
    }
  });
  
  pool.query('DESCRIBE clientes', (err, results) => {
    if (!err) {
      const estadoCol = results.find(r => r.Field === 'estado');
      if (estadoCol) {
        console.log('✅ clientes.estado:', estadoCol.Type);
      }
    }
  });
  
  pool.query('DESCRIBE proveedores', (err, results) => {
    if (!err) {
      const estadoCol = results.find(r => r.Field === 'estado');
      if (estadoCol) {
        console.log('✅ proveedores.estado:', estadoCol.Type);
      }
    }
    
    setTimeout(() => {
      pool.end();
      console.log('\n🎉 Todo listo! Reinicia el servidor Node.js\n');
      process.exit(0);
    }, 1000);
  });
}

runMigration();

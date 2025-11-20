const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function ejecutarMigracion() {
  console.log('🌊 Iniciando migración de Alquileres de Dispensers...\n');

  try {
    // Crear conexión
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'negocio_db',
      multipleStatements: true
    });

    console.log('✅ Conexión a base de datos establecida');

    // Leer archivo SQL
    const sqlPath = path.join(__dirname, 'migration_alquiler_dispensers.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📄 Archivo SQL cargado');

    // Ejecutar SQL
    await connection.query(sql);

    console.log('✅ Migración ejecutada exitosamente\n');

    // Verificar tablas creadas
    const [tables] = await connection.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
        AND table_name IN ('dispensers', 'alquileres_dispenser', 'pagos_alquiler', 'mantenimientos_dispenser')
      ORDER BY table_name
    `);

    console.log('📊 Tablas creadas:');
    tables.forEach(t => console.log(`   ✓ ${t.table_name || t.TABLE_NAME}`));

    // Contar dispensers de ejemplo
    const [dispensers] = await connection.query('SELECT COUNT(*) as count FROM dispensers');
    console.log(`\n🌊 Dispensers de ejemplo: ${dispensers[0].count}`);

    await connection.end();
    console.log('\n✅ ¡Migración completada con éxito!');
    console.log('\n🚀 Pasos siguientes:');
    console.log('   1. Reiniciar el servidor: node src/app.js');
    console.log('   2. Abrir navegador: http://localhost:3000');
    console.log('   3. Ir a: Utilidades → Alquileres');

  } catch (error) {
    console.error('\n❌ Error durante la migración:');
    console.error(error.message);
    console.error('\n💡 Soluciones:');
    console.error('   1. Verifica que MySQL esté corriendo (XAMPP)');
    console.error('   2. Verifica las credenciales en .env');
    console.error('   3. Intenta ejecutar manualmente desde phpMyAdmin');
    process.exit(1);
  }
}

ejecutarMigracion();

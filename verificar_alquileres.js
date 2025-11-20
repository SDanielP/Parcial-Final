const mysql = require('mysql2/promise');
require('dotenv').config();

async function verificarTablas() {
  console.log('🔍 Verificando tablas de alquileres...\n');

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'negocio_db'
    });

    console.log('✅ Conexión establecida\n');

    // Verificar tablas
    const [tables] = await connection.query(`
      SELECT table_name, 
             (SELECT COUNT(*) 
              FROM information_schema.columns 
              WHERE table_name = t.table_name 
                AND table_schema = DATABASE()) as columnas
      FROM information_schema.tables t
      WHERE table_schema = DATABASE() 
        AND table_name IN ('dispensers', 'alquileres_dispenser', 'pagos_alquiler', 'mantenimientos_dispenser')
      ORDER BY table_name
    `);

    if (tables.length === 0) {
      console.log('❌ No se encontraron tablas de alquileres');
      console.log('\n💡 Ejecuta la migración manualmente desde phpMyAdmin');
      await connection.end();
      return;
    }

    console.log('📊 Tablas encontradas:');
    tables.forEach(t => {
      const name = t.table_name || t.TABLE_NAME;
      const cols = t.columnas || t.COLUMNAS;
      console.log(`   ✓ ${name} (${cols} columnas)`);
    });

    // Contar registros
    console.log('\n📈 Datos en tablas:');
    
    const [dispensers] = await connection.query('SELECT COUNT(*) as count FROM dispensers');
    console.log(`   🌊 Dispensers: ${dispensers[0].count}`);
    
    const [alquileres] = await connection.query('SELECT COUNT(*) as count FROM alquileres_dispenser');
    console.log(`   📋 Alquileres: ${alquileres[0].count}`);
    
    const [pagos] = await connection.query('SELECT COUNT(*) as count FROM pagos_alquiler');
    console.log(`   💰 Pagos: ${pagos[0].count}`);
    
    const [mantenimientos] = await connection.query('SELECT COUNT(*) as count FROM mantenimientos_dispenser');
    console.log(`   🔧 Mantenimientos: ${mantenimientos[0].count}`);

    console.log('\n✅ ¡Sistema de alquileres instalado correctamente!');
    console.log('\n🚀 Ya puedes usar el módulo:');
    console.log('   1. Abre: http://localhost:3000');
    console.log('   2. Login como moderador o admin');
    console.log('   3. Ve a: Utilidades → Alquileres');

    await connection.end();

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

verificarTablas();

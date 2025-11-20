const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'negocio_db',
  multipleStatements: true
});

const fs = require('fs');
const path = require('path');

connection.connect((err) => {
  if (err) {
    console.error('Error conectando a la base de datos:', err);
    process.exit(1);
  }
  
  console.log('Conectado a la base de datos');
  
  const sql = fs.readFileSync(path.join(__dirname, 'migration_add_cuenta_corriente_pago.sql'), 'utf8');
  
  connection.query(sql, (err, results) => {
    if (err) {
      console.error('Error ejecutando migración:', err);
      connection.end();
      process.exit(1);
    }
    
    console.log('✓ ENUM tipo_pago actualizado exitosamente');
    console.log('✓ Ahora incluye: efectivo, tarjeta, qr, transferencia, cuenta_corriente');
    
    connection.end();
    process.exit(0);
  });
});

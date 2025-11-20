-- Agregar 'cuenta_corriente' al ENUM de tipo_pago en la tabla pagos
USE negocio_db;

ALTER TABLE pagos 
MODIFY COLUMN tipo_pago ENUM('efectivo', 'tarjeta', 'qr', 'transferencia', 'cuenta_corriente') NOT NULL;

-- Add estado column to pagos and pago_id to movimientos_caja
ALTER TABLE pagos 
  ADD COLUMN estado ENUM('pendiente','procesado','cancelado','anulado') DEFAULT 'procesado' AFTER monto;

ALTER TABLE movimientos_caja 
  ADD COLUMN pago_id INT NULL AFTER caja_id,
  ADD CONSTRAINT fk_mov_pago FOREIGN KEY (pago_id) REFERENCES pagos(id) ON DELETE SET NULL;
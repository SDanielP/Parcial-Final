# Sistema de Múltiples Formas de Pago - Guía de Implementación

## 📋 Resumen de Cambios

Se ha modificado el sistema para permitir que una venta pueda tener **hasta 2 formas de pago diferentes**, útil cuando un cliente paga parcialmente con efectivo y el resto con tarjeta, por ejemplo.

## 🗄️ Base de Datos

**Buenas noticias:** No se requieren cambios en la base de datos. La tabla `pagos` ya está diseñada para soportar múltiples registros por venta mediante la clave foránea `venta_id`.

### Estructura actual de la tabla pagos:
```sql
CREATE TABLE pagos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  venta_id INT NOT NULL,
  tipo_pago ENUM('efectivo', 'tarjeta', 'qr', 'transferencia') NOT NULL,
  monto DECIMAL(10,2) NOT NULL,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notas TEXT,
  FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE
);
```

Esto permite múltiples registros con el mismo `venta_id`, cada uno con su `tipo_pago` y `monto`.

## 🔧 Cambios en el Código

### Backend (`src/routes/index.js`)

1. **POST /api/ventas** ahora recibe:
   ```json
   {
     "usuario_id": 1,
     "items": [...],
     "pagos": [
       { "tipo_pago": "efectivo", "monto": 50.00 },
       { "tipo_pago": "tarjeta", "monto": 30.00 }
     ],
     "envio": {...}
   }
   ```

2. **GET /api/ventas** ahora devuelve:
   ```json
   {
     "ventas": [
       {
         "id": 1,
         "fecha": "2025-11-20",
         "total": 80.00,
         "tipos_pago": "efectivo, tarjeta",
         "montos_pago": "50.00, 30.00",
         "estado_entrega": "pendiente",
         "vendedor": "admin"
       }
     ]
   }
   ```

### Frontend

1. **Nueva Venta (`index.html`):**
   - Se reemplazó el select único de tipo de pago por un contenedor dinámico
   - Botón "+ Agregar Pago" para añadir hasta 2 formas de pago
   - Cada forma de pago tiene: tipo (select) + monto (input) + botón eliminar

2. **JavaScript (`script.js`):**
   - Nueva función `addPaymentRow()`: crea una fila de pago
   - Nueva función `updatePaymentButton()`: controla el límite de 2 pagos
   - Nueva función `initPaymentSystem()`: inicializa el sistema (se llama al abrir nueva venta)
   - `handleNewSale()`: 
     - Valida que exista al menos 1 pago
     - Valida que la suma de pagos coincida con el total de la venta
     - Envía array de pagos al backend

3. **Historial de Ventas:**
   - Columna "Tipo Pago" ahora muestra múltiples formas de pago con iconos y montos
   - Ejemplo: 
     ```
     💵 Efectivo $50.00
     💳 Tarjeta $30.00
     ```

## 🚀 Cómo Usar

### Crear una venta con múltiples pagos:

1. Ir a **Ventas → Nueva Venta**
2. Agregar productos al carrito
3. Click en **"+ Agregar Pago"** (aparece automáticamente el primero)
4. Seleccionar primer tipo de pago y su monto
5. Si se necesita, click **"+ Agregar Pago"** nuevamente para el segundo pago
6. El sistema valida que: 
   - Suma de pagos = Total de la venta
   - Máximo 2 formas de pago
7. Click en **"Registrar Venta"**

### Ver ventas con múltiples pagos:

1. Ir a **Ventas → Historial**
2. La columna **"Tipo Pago"** mostrará:
   - Un solo pago: `💵 Efectivo $80.00`
   - Múltiples pagos: 
     ```
     💵 Efectivo $50.00
     💳 Tarjeta $30.00
     ```

## 🧪 Pruebas Sugeridas

```bash
# 1. Reiniciar el servidor
node src/app.js
```

Luego en el navegador:

1. **Venta con 1 pago:**
   - Producto: $80
   - Pago: Efectivo $80
   - ✅ Debe registrarse correctamente

2. **Venta con 2 pagos:**
   - Producto: $100
   - Pago 1: Efectivo $60
   - Pago 2: Tarjeta $40
   - ✅ Debe registrarse correctamente

3. **Validación de monto:**
   - Producto: $100
   - Pago: Efectivo $50
   - ❌ Debe mostrar error: "El total de pagos no coincide..."

4. **Límite de pagos:**
   - Intentar agregar un 3er pago
   - ❌ Debe mostrar: "Máximo 2 formas de pago permitidas"

5. **Historial:**
   - Verificar que se muestren correctamente los pagos múltiples con iconos y montos

## 📊 Consultas SQL Útiles

```sql
-- Ver todas las ventas con sus pagos
SELECT 
  v.id,
  v.total,
  GROUP_CONCAT(pg.tipo_pago ORDER BY pg.id) as tipos,
  GROUP_CONCAT(pg.monto ORDER BY pg.id) as montos
FROM ventas v
LEFT JOIN pagos pg ON v.id = pg.venta_id
GROUP BY v.id;

-- Ver detalle de pagos de una venta específica
SELECT * FROM pagos WHERE venta_id = 1;

-- Verificar que la suma de pagos coincida con el total
SELECT 
  v.id,
  v.total,
  SUM(pg.monto) as total_pagos,
  CASE 
    WHEN v.total = SUM(pg.monto) THEN 'OK'
    ELSE 'ERROR'
  END as validacion
FROM ventas v
LEFT JOIN pagos pg ON v.id = pg.venta_id
GROUP BY v.id;
```

## ⚠️ Notas Importantes

1. La suma de los montos de pago DEBE ser igual al total de la venta
2. Se valida en frontend antes de enviar
3. El backend inserta múltiples registros en la tabla `pagos`
4. El historial usa `GROUP_CONCAT` para mostrar todos los pagos de una venta
5. Si solo hay 1 pago, el sistema funciona igual que antes (retrocompatible)

## 🐛 Solución de Problemas

**Error: "El total de pagos no coincide con el total de la venta"**
- Verificar que la suma de los montos de pago sea exactamente igual al total
- El sistema permite una diferencia de $0.01 por redondeo

**No puedo agregar un segundo pago**
- Verificar que el botón "+ Agregar Pago" no esté deshabilitado
- Solo se permiten máximo 2 formas de pago

**En el historial no se ven los pagos**
- Verificar que el servidor esté actualizado y reiniciado
- Revisar la consola del navegador por errores de JavaScript

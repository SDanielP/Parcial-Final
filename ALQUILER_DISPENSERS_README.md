# 🌊 Sistema de Alquiler de Dispensers - Guía Completa

## 📋 Resumen

Sistema completo para gestionar el alquiler de dispensers electrónicos, integrado con el sistema de distribuidora "El Negrito".

## 🗄️ Base de Datos

### Tablas Nuevas

#### 1. **`dispensers`** - Inventario de Equipos
Registra todos los dispensers de la empresa.

**Campos:**
- `id`: Identificador único
- `codigo`: Código interno (ej: DISP-001) - único
- `marca`: Marca del dispenser (ej: Drago)
- `modelo`: Modelo (ej: Classic, Premium)
- `numero_serie`: Número de serie del fabricante - único
- `estado`: Estado actual
  - `disponible`: Listo para alquilar
  - `alquilado`: Actualmente en uso por cliente
  - `mantenimiento`: En reparación o servicio
  - `baja`: Fuera de servicio permanente
- `precio_alquiler_mensual`: Precio mensual estándar
- `fecha_compra`: Fecha de adquisición
- `notas`: Observaciones adicionales

#### 2. **`alquileres_dispenser`** - Contratos de Alquiler
Registra cada contrato de alquiler con un cliente.

**Campos:**
- `id`: Identificador único
- `dispenser_id`: Dispenser alquilado (FK)
- `cliente_id`: Cliente que alquila (FK)
- `fecha_inicio`: Fecha inicio del contrato
- `fecha_fin`: Fecha fin (NULL si está activo)
- `precio_mensual`: Precio acordado (puede diferir del precio estándar)
- `dia_cobro`: Día del mes para generar cobros (1-31, default 15)
- `estado`: Estado del contrato
  - `activo`: Alquiler vigente
  - `finalizado`: Contrato terminado
  - `suspendido`: Temporalmente suspendido
- `deposito_garantia`: Monto de depósito en garantía
- `direccion_instalacion`: Dirección donde está instalado
- `notas`: Observaciones del contrato
- `usuario_registro_id`: Usuario que creó el alquiler

**Reglas:**
- Un dispenser solo puede tener UN alquiler activo a la vez
- No se puede alquilar a clientes en estado "deudor"
- Al crear alquiler, el dispenser pasa a estado "alquilado"
- Al finalizar, el dispenser vuelve a "disponible"

#### 3. **`pagos_alquiler`** - Pagos Mensuales
Registra cada mes a cobrar y su pago.

**Campos:**
- `id`: Identificador único
- `alquiler_id`: Alquiler asociado (FK)
- `mes_cobro`: Mes que se cobra (formato: YYYY-MM-01)
- `monto`: Monto a cobrar
- `fecha_pago`: Cuándo se pagó (NULL si pendiente)
- `tipo_pago`: Forma de pago (efectivo, tarjeta, etc.)
- `estado`: Estado del pago
  - `pendiente`: No pagado aún
  - `pagado`: Ya cobrado
  - `vencido`: Pendiente y pasado fecha de vencimiento
  - `cancelado`: Anulado (ej: por finalizar contrato)
- `fecha_vencimiento`: Fecha límite de pago
- `usuario_cobro_id`: Usuario que registró el cobro
- `notas`: Observaciones del pago

**Reglas:**
- Un alquiler + mes = UN solo registro (unique key)
- Se generan automáticamente cada mes
- Al pagar, se registra movimiento en caja (excepto cuenta corriente)

#### 4. **`mantenimientos_dispenser`** - Historial de Mantenimientos
Registra servicios técnicos realizados.

**Campos:**
- `id`: Identificador único
- `dispenser_id`: Dispenser mantenido (FK)
- `fecha_mantenimiento`: Fecha del servicio
- `tipo`: Tipo de mantenimiento
  - `preventivo`: Servicio programado
  - `correctivo`: Reparación por falla
  - `instalacion`: Al instalar en cliente
  - `retiro`: Al retirar de cliente
- `descripcion`: Detalle del trabajo realizado
- `costo`: Costo del mantenimiento
- `realizado_por`: Nombre del técnico
- `usuario_registro_id`: Usuario que registró

## 🔧 Instalación

### 1. Ejecutar Migración

```bash
mysql -u root -p negocio_db < migration_alquiler_dispensers.sql
```

### 2. Agregar Endpoints al Backend

Copiar el contenido de `dispenser_endpoints.js` al final de `src/routes/index.js` (antes de `module.exports = router;`)

### 3. Reiniciar Servidor

```bash
node src/app.js
```

## 🚀 Uso del Sistema

### Flujo Básico

#### 1. **Agregar Dispensers al Inventario**

```http
POST /api/dispensers
Content-Type: application/json

{
  "codigo": "DISP-001",
  "marca": "Drago",
  "modelo": "Classic",
  "numero_serie": "SN001234",
  "precio_alquiler_mensual": 500.00,
  "fecha_compra": "2024-01-15",
  "notas": "Dispenser con filtro incluido"
}
```

#### 2. **Crear Alquiler**

```http
POST /api/alquileres
Content-Type: application/json

{
  "dispenser_id": 1,
  "cliente_id": 5,
  "fecha_inicio": "2025-11-01",
  "precio_mensual": 500.00,
  "dia_cobro": 15,
  "deposito_garantia": 1000.00,
  "direccion_instalacion": "Av. Mate de Luna 1234, Tucumán",
  "notas": "Cliente prefiere cobro el día 15",
  "usuario_registro_id": 1
}
```

**Resultado automático:**
- Dispenser cambia a estado "alquilado"
- Se genera el primer pago pendiente para el mes actual
- Fecha de vencimiento según `dia_cobro`

#### 3. **Generar Pagos Mensuales (Ejecutar 1 vez al mes)**

```http
POST /api/pagos-alquiler/generar-mensuales
Content-Type: application/json

{
  "mes": "2025-12"
}
```

Esto crea pagos pendientes para todos los alquileres activos del mes especificado.

#### 4. **Registrar Pago de Cliente**

```http
POST /api/pagos-alquiler/5/registrar
Content-Type: application/json

{
  "tipo_pago": "efectivo",
  "usuario_cobro_id": 1,
  "notas": "Pago completo mes diciembre"
}
```

**Resultado automático:**
- Pago cambia a estado "pagado"
- Se registra fecha_pago actual
- Si es efectivo/tarjeta/qr/transferencia: crea movimiento en caja

#### 5. **Finalizar Alquiler**

```http
PUT /api/alquileres/1/finalizar
Content-Type: application/json

{
  "fecha_fin": "2025-12-31",
  "notas": "Cliente devuelve equipo en buen estado"
}
```

**Validaciones:**
- No puede finalizar si hay pagos pendientes
- Al finalizar: dispenser vuelve a "disponible"
- Estado cambia a "finalizado"

## 📊 Endpoints Disponibles

### Dispensers

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/dispensers` | Listar todos (filtro opcional: `?estado=disponible`) |
| GET | `/api/dispensers/:id` | Detalle con historial |
| POST | `/api/dispensers` | Crear dispenser |
| PUT | `/api/dispensers/:id` | Actualizar datos |
| PUT | `/api/dispensers/:id/estado` | Cambiar estado |

### Alquileres

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/alquileres` | Listar todos (filtros: `?estado=activo&cliente_id=5`) |
| GET | `/api/alquileres/:id` | Detalle con pagos |
| POST | `/api/alquileres` | Crear alquiler |
| PUT | `/api/alquileres/:id/finalizar` | Finalizar contrato |
| PUT | `/api/alquileres/:id/estado` | Suspender/reactivar |

### Pagos de Alquiler

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/pagos-alquiler` | Listar pagos (filtros: `?estado=pendiente&mes=2025-12`) |
| POST | `/api/pagos-alquiler/:id/registrar` | Registrar pago |
| POST | `/api/pagos-alquiler/generar-mensuales` | Generar pagos mes (automatizar) |

### Mantenimientos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/mantenimientos` | Listar mantenimientos (`?dispenser_id=1`) |
| POST | `/api/mantenimientos` | Registrar mantenimiento |

### Reportes

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/alquileres/reporte/resumen` | Dashboard con totales |

## 💡 Casos de Uso

### Caso 1: Cliente Nuevo Quiere Alquilar

1. Verificar si el cliente existe: `GET /api/clientes?q=Juan`
2. Si no existe, crearlo: `POST /api/clientes`
3. Ver dispensers disponibles: `GET /api/dispensers?estado=disponible`
4. Crear alquiler: `POST /api/alquileres`
5. Cobrar depósito en garantía (opcional en caja)

### Caso 2: Cobro Mensual Regular

1. Listar pagos pendientes del mes: `GET /api/pagos-alquiler?estado=pendiente&mes=2025-11`
2. Para cada pago del cliente que llega:
   - Registrar pago: `POST /api/pagos-alquiler/:id/registrar`
   - Automáticamente se registra en caja

### Caso 3: Cliente Finaliza Alquiler

1. Ver detalle del alquiler: `GET /api/alquileres/:id`
2. Verificar pagos pendientes (debe estar todo pagado)
3. Finalizar alquiler: `PUT /api/alquileres/:id/finalizar`
4. Devolver depósito en garantía (registrar como salida de caja)

### Caso 4: Dispenser Requiere Mantenimiento

1. Cambiar estado: `PUT /api/dispensers/:id/estado` → "mantenimiento"
2. Registrar mantenimiento: `POST /api/mantenimientos`
3. Al terminar, volver a: `PUT /api/dispensers/:id/estado` → "disponible"

### Caso 5: Dashboard Gerencial

1. Obtener resumen: `GET /api/alquileres/reporte/resumen`

Respuesta ejemplo:
```json
{
  "dispensers": {
    "total": 10,
    "disponibles": 3,
    "alquilados": 6,
    "en_mantenimiento": 1
  },
  "alquileres": {
    "activos": 6
  },
  "pagos": {
    "pendientes_count": 4,
    "pendientes_monto": 2000.00,
    "vencidos_count": 1,
    "vencidos_monto": 500.00
  },
  "ingresos": {
    "mes_actual": 3000.00
  }
}
```

## 🔄 Automatización Recomendada

### Script Mensual para Generar Pagos

Crear un cron job o tarea programada para ejecutar el 1° de cada mes:

```javascript
// script: generar_pagos_mensuales.js
const axios = require('axios');

async function generarPagosMes() {
  const fecha = new Date();
  const mes = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
  
  try {
    const response = await axios.post('http://localhost:3000/api/pagos-alquiler/generar-mensuales', { mes });
    console.log(`✅ Pagos generados para ${mes}:`, response.data);
  } catch (error) {
    console.error('❌ Error generando pagos:', error.message);
  }
}

generarPagosMes();
```

Ejecutar con:
```bash
node generar_pagos_mensuales.js
```

### Script para Marcar Vencidos

Ejecutar diariamente para actualizar pagos vencidos:

```sql
UPDATE pagos_alquiler 
SET estado = 'vencido' 
WHERE estado = 'pendiente' 
  AND fecha_vencimiento < CURDATE();
```

## 📊 Consultas SQL Útiles

### Ver alquileres activos con datos completos
```sql
SELECT 
  a.id,
  d.codigo as dispenser,
  c.nombre as cliente,
  a.fecha_inicio,
  a.precio_mensual,
  a.dia_cobro,
  a.direccion_instalacion
FROM alquileres_dispenser a
JOIN dispensers d ON a.dispenser_id = d.id
JOIN clientes c ON a.cliente_id = c.id
WHERE a.estado = 'activo'
ORDER BY c.nombre;
```

### Ver pagos pendientes con cliente y dispenser
```sql
SELECT 
  pa.id,
  c.nombre as cliente,
  d.codigo as dispenser,
  pa.mes_cobro,
  pa.monto,
  pa.fecha_vencimiento,
  DATEDIFF(pa.fecha_vencimiento, CURDATE()) as dias_hasta_vencer
FROM pagos_alquiler pa
JOIN alquileres_dispenser a ON pa.alquiler_id = a.id
JOIN clientes c ON a.cliente_id = c.id
JOIN dispensers d ON a.dispenser_id = d.id
WHERE pa.estado = 'pendiente'
ORDER BY pa.fecha_vencimiento;
```

### Historial completo de un dispenser
```sql
SELECT 
  a.id as alquiler_id,
  c.nombre as cliente,
  a.fecha_inicio,
  a.fecha_fin,
  a.precio_mensual,
  COUNT(pa.id) as meses_cobrados,
  SUM(CASE WHEN pa.estado = 'pagado' THEN pa.monto ELSE 0 END) as total_cobrado
FROM alquileres_dispenser a
JOIN clientes c ON a.cliente_id = c.id
LEFT JOIN pagos_alquiler pa ON a.id = pa.alquiler_id
WHERE a.dispenser_id = 1
GROUP BY a.id
ORDER BY a.fecha_inicio DESC;
```

### Ingresos por mes
```sql
SELECT 
  DATE_FORMAT(fecha_pago, '%Y-%m') as mes,
  COUNT(*) as pagos_cobrados,
  SUM(monto) as total_ingreso
FROM pagos_alquiler
WHERE estado = 'pagado'
GROUP BY DATE_FORMAT(fecha_pago, '%Y-%m')
ORDER BY mes DESC;
```

## ⚠️ Validaciones Importantes

### Al Crear Alquiler:
✅ Dispenser debe estar en estado "disponible"  
✅ Cliente NO debe ser "deudor"  
✅ No puede haber otro alquiler activo del mismo dispenser  

### Al Finalizar Alquiler:
✅ No debe haber pagos pendientes  
✅ Dispenser vuelve a "disponible" automáticamente  

### Al Registrar Pago:
✅ Pago debe estar en estado "pendiente"  
✅ Si es efectivo/tarjeta/qr/transferencia → registra en caja  
✅ Si es cuenta corriente → NO registra en caja  

### Al Cambiar Estado de Dispenser:
✅ No se puede poner "disponible" si tiene alquiler activo  
✅ Si está "alquilado", debe existir un alquiler activo  

## 🎨 Integración con Frontend

### Ejemplo: Lista de Alquileres Activos

```javascript
async function cargarAlquileresActivos() {
  try {
    const response = await fetch('http://localhost:3000/api/alquileres?estado=activo');
    const data = await response.json();
    
    const tbody = document.getElementById('tabla-alquileres');
    tbody.innerHTML = '';
    
    data.alquileres.forEach(alq => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${alq.dispenser_codigo}</td>
        <td>${alq.cliente_nombre}</td>
        <td>${alq.direccion_instalacion}</td>
        <td>$${parseFloat(alq.precio_mensual).toFixed(2)}</td>
        <td>${alq.fecha_inicio}</td>
        <td>
          <button onclick="verDetalle(${alq.id})">Ver</button>
          <button onclick="finalizarAlquiler(${alq.id})">Finalizar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error('Error:', error);
  }
}
```

### Ejemplo: Registrar Pago

```javascript
async function registrarPago(pagoId, tipoPago) {
  try {
    const response = await fetch(`http://localhost:3000/api/pagos-alquiler/${pagoId}/registrar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo_pago: tipoPago,
        usuario_cobro_id: usuarioActualId,
        notas: `Pago registrado vía sistema web`
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      alert('✅ ' + data.message);
      cargarPagosPendientes(); // recargar lista
    } else {
      alert('❌ Error: ' + data.error);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error al registrar pago');
  }
}
```

## 📝 Notas Adicionales

### Precios Personalizados
El campo `precio_mensual` en la tabla `alquileres_dispenser` permite establecer un precio diferente al estándar por cliente (descuentos, promociones, etc.)

### Día de Cobro Flexible
El campo `dia_cobro` permite personalizar el día del mes que se genera el pago para cada cliente (útil para alinear con fechas de cobro de sueldos)

### Depósito en Garantía
El `deposito_garantia` se registra pero NO se maneja automáticamente. Al finalizar el alquiler, debe registrarse manualmente la devolución como salida de caja.

### Múltiples Alquileres por Cliente
Un cliente puede tener múltiples alquileres activos (varios dispensers en diferentes direcciones).

### Historial Completo
Nunca se eliminan registros. Los alquileres finalizados quedan con `estado='finalizado'` y `fecha_fin` completada.

## 🐛 Solución de Problemas

**Error: "El dispenser no está disponible"**
→ Verificar que `dispensers.estado = 'disponible'` y que no tenga alquileres activos

**Error: "No se puede finalizar: hay pagos pendientes"**
→ Registrar todos los pagos pendientes antes de finalizar

**No se generan pagos automáticos**
→ Ejecutar manualmente `POST /api/pagos-alquiler/generar-mensuales` con el mes correspondiente

**Pago no registra en caja**
→ Verificar que haya una caja abierta (`caja.cierre IS NULL`)

## 📈 Próximas Mejoras

1. **Notificaciones automáticas** de pagos próximos a vencer
2. **Recordatorios** de mantenimientos preventivos
3. **Reportes avanzados** (rentabilidad por dispenser, rotación, etc.)
4. **Integración con WhatsApp** para avisos a clientes
5. **Dashboard visual** con gráficos de ocupación
6. **App móvil** para técnicos (registrar mantenimientos in-situ)

---

**Sistema desarrollado para Distribuidora "El Negrito"**  
**UTN FRT - Tecnicatura en Programación - 2025**

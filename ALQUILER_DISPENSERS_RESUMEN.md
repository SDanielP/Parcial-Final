# 🌊 Sistema de Alquiler de Dispensers - Resumen Ejecutivo

## 📊 Estructura de Datos

```
┌─────────────────┐
│   DISPENSERS    │ ← Inventario de equipos
│  (id, codigo)   │
└────────┬────────┘
         │
         │ 1 dispenser tiene
         │ muchos alquileres (historial)
         ↓
┌─────────────────────┐
│ ALQUILERES_DISPENSER│ ← Contratos con clientes
│  (id, estado)       │
└────────┬────────────┘
         │
         │ 1 alquiler tiene
         │ muchos pagos mensuales
         ↓
┌─────────────────┐
│ PAGOS_ALQUILER  │ ← Cobros por mes
│ (id, mes_cobro) │
└─────────────────┘
```

## 🔄 Flujo Completo

### 1️⃣ Alta de Dispenser
```
Compra dispenser → Registrar en sistema → Estado: DISPONIBLE
```

### 2️⃣ Alquilar a Cliente
```
Cliente solicita → Verificar disponibilidad → Crear contrato
                                            ↓
                                Dispenser: ALQUILADO
                                Generar 1er pago pendiente
```

### 3️⃣ Cobro Mensual (Automático)
```
Día 1 del mes → Script genera pagos → Pagos: PENDIENTE
                para alquileres activos
```

### 4️⃣ Cliente Paga
```
Cliente llega → Buscar pago pendiente → Registrar pago
                                       ↓
                              Estado: PAGADO
                              Movimiento en CAJA
```

### 5️⃣ Finalizar Alquiler
```
Cliente devuelve → Verificar pagos → Finalizar contrato
                   al día            ↓
                            Dispenser: DISPONIBLE
                            Alquiler: FINALIZADO
```

## 📋 Tablas Necesarias (4 nuevas)

| Tabla | Propósito | Registros |
|-------|-----------|-----------|
| `dispensers` | Inventario de equipos | 1 por equipo físico |
| `alquileres_dispenser` | Contratos activos/finalizados | 1 por contrato |
| `pagos_alquiler` | Cobros mensuales | 1 por mes por alquiler |
| `mantenimientos_dispenser` | Historial técnico | 1 por servicio |

## 🎯 Reglas Clave

### Estados de Dispenser
- ✅ **DISPONIBLE**: Puede alquilarse
- 🔵 **ALQUILADO**: En uso por cliente
- 🔧 **MANTENIMIENTO**: En reparación
- ❌ **BAJA**: Fuera de servicio

### Estados de Alquiler
- ✅ **ACTIVO**: Contrato vigente
- ⏸️ **SUSPENDIDO**: Temporalmente pausado
- ✔️ **FINALIZADO**: Contrato terminado

### Estados de Pago
- ⏳ **PENDIENTE**: No pagado
- ✅ **PAGADO**: Cobrado
- ⚠️ **VENCIDO**: Pasó fecha límite
- ❌ **CANCELADO**: Anulado

## 💰 Integración con Sistema Actual

### Con Clientes
```sql
alquileres_dispenser.cliente_id → clientes.id
```
- Usa la tabla de clientes existente
- Valida que no sea "deudor"
- Aplica límites de cuenta corriente (opcional)

### Con Caja
```javascript
Al registrar pago → crea movimiento_caja (entrada)
Tipo: efectivo/tarjeta/qr/transferencia
```
- Se integra con caja diaria
- Cuenta corriente NO genera movimiento inmediato

### Con Usuarios
```sql
alquileres_dispenser.usuario_registro_id → usuarios.id
pagos_alquiler.usuario_cobro_id → usuarios.id
```
- Auditoría de quién creó el alquiler
- Quién cobró cada pago

## 📱 Endpoints Principales

### Operaciones Diarias
```
GET  /api/alquileres?estado=activo         ← Ver alquileres vigentes
GET  /api/pagos-alquiler?estado=pendiente  ← Pagos por cobrar
POST /api/pagos-alquiler/:id/registrar     ← Registrar cobro
```

### Gestión de Equipos
```
GET  /api/dispensers?estado=disponible     ← Ver disponibles
POST /api/alquileres                       ← Crear alquiler
PUT  /api/alquileres/:id/finalizar         ← Terminar contrato
```

### Automatización
```
POST /api/pagos-alquiler/generar-mensuales ← Generar cobros mes
     Body: { "mes": "2025-12" }
```

### Reportes
```
GET /api/alquileres/reporte/resumen        ← Dashboard completo
```

## 🚀 Pasos para Implementar

### Paso 1: Base de Datos
```bash
mysql -u root -p negocio_db < migration_alquiler_dispensers.sql
```

### Paso 2: Backend
1. Abrir `src/routes/index.js`
2. Copiar contenido de `dispenser_endpoints.js`
3. Pegar ANTES de `module.exports = router;`

### Paso 3: Probar
```bash
node src/app.js
```

### Paso 4: Crear Dispensers de Prueba
Ya incluidos en la migración (DISP-001, DISP-002, DISP-003)

### Paso 5: Crear Primer Alquiler
```bash
curl -X POST http://localhost:3000/api/alquileres \
  -H "Content-Type: application/json" \
  -d '{
    "dispenser_id": 1,
    "cliente_id": 1,
    "fecha_inicio": "2025-11-01",
    "precio_mensual": 500.00,
    "direccion_instalacion": "Test 123",
    "usuario_registro_id": 1
  }'
```

## 📊 Ejemplo de Datos

### Dispensers
| ID | Código | Marca | Estado | Precio Mensual |
|----|--------|-------|--------|----------------|
| 1 | DISP-001 | Drago | disponible | $500.00 |
| 2 | DISP-002 | Drago | alquilado | $700.00 |
| 3 | DISP-003 | Drago | mantenimiento | $500.00 |

### Alquileres Activos
| ID | Dispenser | Cliente | Inicio | Precio | Día Cobro |
|----|-----------|---------|--------|--------|-----------|
| 1 | DISP-002 | Juan Pérez | 2025-10-01 | $700.00 | 15 |
| 2 | DISP-004 | María Gómez | 2025-11-15 | $500.00 | 10 |

### Pagos Pendientes
| ID | Alquiler | Mes Cobro | Monto | Vencimiento | Estado |
|----|----------|-----------|-------|-------------|--------|
| 5 | 1 | 2025-11 | $700.00 | 2025-11-15 | pendiente |
| 6 | 2 | 2025-11 | $500.00 | 2025-11-10 | pendiente |

## 💡 Ventajas del Sistema

### Automatización
- ✅ Genera pagos mensuales automáticamente
- ✅ Registra en caja al cobrar
- ✅ Controla disponibilidad de equipos

### Control
- ✅ Historial completo por dispenser
- ✅ Seguimiento de mantenimientos
- ✅ Alertas de pagos vencidos

### Trazabilidad
- ✅ Quién creó cada alquiler
- ✅ Quién cobró cada pago
- ✅ Historial de cambios de estado

### Integración
- ✅ Usa clientes existentes
- ✅ Integra con caja diaria
- ✅ Valida deudores automáticamente

## ⚙️ Configuración Recomendada

### Script Cron (Mensual)
Ejecutar el día 1 de cada mes a las 00:01:
```bash
0 1 1 * * node /ruta/generar_pagos_mensuales.js
```

### Script Cron (Diario)
Marcar pagos vencidos cada día a las 00:30:
```sql
UPDATE pagos_alquiler 
SET estado = 'vencido' 
WHERE estado = 'pendiente' 
  AND fecha_vencimiento < CURDATE();
```

## 🎓 Conceptos Clave

### Depósito en Garantía
- Se registra al crear alquiler
- NO se maneja automáticamente
- Al finalizar: registrar devolución manual en caja

### Día de Cobro Personalizado
- Cada alquiler puede tener su propio día (1-31)
- Útil para alinear con fechas de cobro del cliente
- Default: 15 (día 15 de cada mes)

### Precio Personalizado
- `dispensers.precio_alquiler_mensual` = precio estándar
- `alquileres_dispenser.precio_mensual` = precio acordado
- Permite descuentos/promociones por cliente

### Múltiples Alquileres
- Un cliente puede tener varios dispensers
- Cada uno en diferente dirección
- Se gestionan independientemente

## 📚 Documentación Completa

Ver archivo completo: `ALQUILER_DISPENSERS_README.md`

---

**¿Listo para implementar? Sigue los 5 pasos de "Pasos para Implementar" ⬆️**

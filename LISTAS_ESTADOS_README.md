# Sistema de Gestión con Estados - Guía Completa

## 📋 Resumen de Cambios

Se ha reorganizado el menú principal y agregado un nuevo sistema de gestión de estados para Productos, Clientes y Proveedores, eliminando la opción de borrado físico.

## 🗂️ Nueva Estructura de Menú

### Menú Principal:
1. **Ventas** ▾
   - Nueva venta
   - Historial
   - Hoja de ruta

2. **Stock** ▾ (reubicado)
   - Ingresar producto
   - Reportes
   - Pedidos Proveedores

3. **Caja** ▾
   - Apertura
   - Cierre
   - Movimientos

4. **Listas** ▾ (NUEVO)
   - Productos
   - Clientes
   - Proveedores

5. **Cerrar Sesión**

## 🗄️ Cambios en Base de Datos

### Ejecutar Migración:

```bash
mysql -u tu_usuario -p negocio_db < migration_estados.sql
```

### Columnas Agregadas:

1. **productos.estado**: `ENUM('activo', 'inactivo')` DEFAULT 'activo'
2. **clientes.estado**: `ENUM('activo', 'inactivo', 'deudor')` DEFAULT 'activo'
3. **proveedores.estado**: `ENUM('activo', 'inactivo')` DEFAULT 'activo'

## 🎯 Funcionalidades Implementadas

### 1. Lista de Productos (Listas → Productos)

**Tabla muestra:**
- ID, Nombre, Descripción, Precio, Stock, **Estado**, Acciones

**Estados disponibles:**
- ✓ **Activo** (verde): Aparece en ventas y pedidos
- ✕ **Inactivo** (rojo): NO aparece en ventas/pedidos

**Acciones:**
- Dropdown para cambiar estado (sin eliminar)
- NO se puede borrar el producto

**Comportamiento:**
- Productos inactivos **NO aparecen** al crear una venta
- Productos inactivos **NO aparecen** al crear pedido a proveedor
- Se mantiene el historial completo

### 2. Lista de Clientes (Listas → Clientes)

**Tabla muestra:**
- ID, Nombre, Teléfono, Dirección, **Estado**, Acciones

**Estados disponibles:**
- ✓ **Activo** (verde): Cliente regular
- ⚠ **Deudor** (naranja): Cliente con deuda pendiente
- ✕ **Inactivo** (rojo): Cliente deshabilitado

**Acciones:**
- Dropdown para cambiar estado
- NO se puede borrar el cliente

**Lógica de deudor:**
- Se marcará manualmente por ahora
- Lógica automática se implementará posteriormente

### 3. Lista de Proveedores (Listas → Proveedores)

**Tabla muestra:**
- ID, Nombre, Contacto, Teléfono, Email, **Estado**, Acciones

**Estados disponibles:**
- ✓ **Activo** (verde): Aparece en pedidos
- ✕ **Inactivo** (rojo): NO aparece en pedidos

**Acciones:**
- Dropdown para cambiar estado
- NO se puede borrar el proveedor

**Comportamiento:**
- Proveedores inactivos **NO aparecen** en selector al crear pedido
- Se mantiene historial de pedidos anteriores

## 🔧 Endpoints API Nuevos

### Cambio de Estados:

```javascript
// Productos
PUT /api/productos/:id/estado
Body: { "estado": "activo" | "inactivo" }

// Clientes
PUT /api/clientes/:id/estado
Body: { "estado": "activo" | "inactivo" | "deudor" }

// Proveedores
PUT /api/proveedores/:id/estado
Body: { "estado": "activo" | "inactivo" }
```

### Consultas:

```javascript
// Listar todos (incluye estado)
GET /api/productos
GET /api/clientes
GET /api/proveedores

// Listar solo activos (para ventas/pedidos)
GET /api/productos/activos
GET /api/proveedores/activos
```

## 🚀 Flujo de Uso

### Desactivar un Producto:

1. Ir a **Listas → Productos**
2. Buscar el producto en la tabla
3. En la columna "Acciones", cambiar dropdown a **"Inactivo"**
4. El sistema guarda automáticamente
5. El producto ya NO aparece en Nueva Venta

### Marcar Cliente como Deudor:

1. Ir a **Listas → Clientes**
2. Buscar el cliente
3. Cambiar estado a **"Deudor"**
4. El badge cambia a ⚠ naranja
5. (Lógica de restricción se implementará después)

### Desactivar Proveedor:

1. Ir a **Listas → Proveedores**
2. Cambiar estado a **"Inactivo"**
3. Ya NO aparece en Stock → Pedidos Proveedores

## 📊 Verificación en Base de Datos

```sql
-- Ver productos por estado
SELECT nombre, precio, stock, estado 
FROM productos 
ORDER BY estado, nombre;

-- Ver clientes por estado
SELECT nombre, telefono, estado 
FROM clientes 
ORDER BY estado, nombre;

-- Ver proveedores por estado
SELECT nombre, contacto, estado 
FROM proveedores 
ORDER BY estado, nombre;

-- Verificar que productos inactivos no afecten ventas antiguas
SELECT v.id, v.fecha, v.total, p.nombre, dv.cantidad
FROM ventas v
JOIN detalle_venta dv ON v.id = dv.venta_id
JOIN productos p ON dv.producto_id = p.id
WHERE p.estado = 'inactivo'
ORDER BY v.fecha DESC;
```

## ⚠️ Notas Importantes

### Productos:
- Los productos inactivos **NO se pueden vender**
- Se mantienen en el historial de ventas antiguas
- Seguirán apareciendo en reportes históricos
- Para reactivar: cambiar estado a "Activo"

### Clientes:
- Estado "deudor" es informativo por ahora
- Todos los estados pueden buscar y seleccionar en envíos
- Lógica de restricción de deudores pendiente

### Proveedores:
- Proveedores inactivos NO aparecen en nuevos pedidos
- Pedidos anteriores se mantienen intactos
- Historial completo preservado

### General:
- **NO hay borrado físico** de registros
- Todo se maneja con estados
- Los dropdowns guardan automáticamente al cambiar
- Los cambios son instantáneos

## 🐛 Solución de Problemas

**Error: "Unknown column 'estado'"**
```bash
# Ejecutar migración:
mysql -u tu_usuario -p negocio_db < migration_estados.sql
```

**Producto inactivo sigue apareciendo en ventas**
```bash
# Verificar que el frontend cargue correctamente:
# Abrir consola del navegador (F12)
# Buscar errores de JavaScript
# Refrescar la página (Ctrl+Shift+R)
```

**El dropdown de estado no guarda**
```bash
# Verificar que el servidor esté corriendo
# Revisar consola del servidor por errores
# Verificar que los endpoints PUT estén respondiendo
```

**No veo el menú "Listas"**
```bash
# Refrescar página completamente (Ctrl+Shift+R)
# Verificar que estés logueado
# Revisar rol de usuario (debe tener permisos)
```

## 📝 Próximas Mejoras

1. **Lógica de Clientes Deudores:**
   - Restricción automática para crear ventas
   - Alertas visuales al seleccionar cliente deudor
   - Cálculo automático de deuda pendiente

2. **Auditoria:**
   - Log de cambios de estado
   - Quién y cuándo cambió el estado
   - Historial de estados anteriores

3. **Reactivación Masiva:**
   - Botón para reactivar múltiples productos
   - Filtros avanzados en las tablas
   - Exportar listas a Excel

4. **Reportes:**
   - Productos inactivos con stock
   - Clientes deudores con montos
   - Proveedores sin pedidos recientes

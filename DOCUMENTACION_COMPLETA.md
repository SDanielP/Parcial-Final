# 📄 Documentación del Proyecto – Distribuidora "El Negrito"

**Práctica Profesional Supervisada – UTN FRT**  
**Tecnicatura Universitaria en Programación – Año 2025**

---

## ÍNDICE

1. [Resumen del Proyecto](#1-resumen-del-proyecto)
2. [Tema a Desarrollar](#2-tema-a-desarrollar)
3. [Objetivos](#3-objetivos)
4. [Alcance del Proyecto](#4-alcance-del-proyecto)
5. [Análisis del Mercado](#5-análisis-del-mercado)
6. [Actividades](#6-actividades)
7. [Diagrama Entidad-Relación (DER)](#7-diagrama-entidad-relación-der)
8. [Desarrollo del Proyecto](#8-desarrollo-del-proyecto)
9. [Requerimientos del Sistema](#9-requerimientos-del-sistema)
10. [Conclusión](#10-conclusión)
11. [Planificación de Reunión](#11-planificación-de-reunión)
12. [Requisitos del Software (ERS)](#12-requisitos-del-software-ers)

---

## 1. Resumen del Proyecto

El presente proyecto corresponde al desarrollo de un **Sistema de Gestión Web interno** para la empresa "El Negrito", una distribuidora con más de 30 años de trayectoria en la venta de sodas y bidones de agua.

La empresa se encuentra en expansión hacia el rubro mayorista (gaseosas, alimentos, papel higiénico), pero continúa con una gestión interna manual, utilizando un cuaderno y planillas Excel, lo cual genera demoras, errores y una sobrecarga administrativa.

La solución propuesta consiste en implementar un sistema de gestión web para administrar **ventas, stock, caja diaria, cuentas corrientes y pedidos** de forma centralizada, reduciendo errores y optimizando su operativa.

---

## 2. Tema a Desarrollar

### Planteamiento del problema

La distribuidora depende de métodos manuales como cuadernos y Excel.  
El control de stock se realiza "a ojo", lo que genera errores, duplicación de datos, demoras y falta de información histórica.

**Principales problemas:**

- Registro manual de ventas y fiados
- Control de stock visual e impreciso
- Información dispersa (cuaderno + Excel)
- Falta de reportes históricos
- Demoras en atención al cliente por búsqueda en el cuaderno
- Dificultad para gestionar cuentas corrientes y límites de crédito
- No hay trazabilidad de cambios en productos
- Gestión manual de pedidos a proveedores

La empresa busca implementar un sistema web para digitalizar sus procesos administrativos y financieros.

---

## 3. Objetivos

### Objetivo General

Diseñar e implementar un **Sistema Web interno** que digitalice los procesos administrativos, optimizando ventas, stock, caja, cuentas corrientes, pedidos y envíos.

### Objetivos Específicos

**Originales:**
1. Autenticación y roles de usuario
2. Registrar ventas minoristas y mayoristas
3. Control digital de stock
4. Alertas de stock crítico
5. Gestión de cuentas corrientes
6. Control de caja: apertura, cierre, movimientos
7. Reportes básicos de ventas por período

**Agregados (Nuevas Funcionalidades):**
8. Gestionar múltiples formas de pago por venta (hasta 2 pagos combinados)
9. Implementar sistema de estados para productos, clientes y proveedores
10. Registrar y controlar cuentas corrientes con límites de crédito
11. Auditar cambios en productos mediante historial
12. Gestionar estados de pagos (pendiente, procesado, cancelado, anulado)
13. Administrar pedidos a proveedores con seguimiento de estado
14. Gestionar envíos y pedidos de clientes con hoja de ruta
15. Controlar límites de crédito y alertas de deudores

---

## 4. Alcance del Proyecto

**Uso:** Sistema interno de la distribuidora.

**Módulos incluidos:**

### Módulos Originales:
- Autenticación y gestión de usuarios
- Gestión de productos
- Ventas (minorista/mayorista)
- Caja (apertura, cierre, movimientos)
- Reportes básicos

### Módulos Agregados:
- **Múltiples Formas de Pago**: Permite combinar hasta 2 métodos de pago por venta
- **Sistema de Estados**: Gestión de estados activo/inactivo para productos, clientes y proveedores
- **Cuentas Corrientes**: Registro de ventas a crédito con límites y vencimientos
- **Historial de Productos**: Auditoría completa de cambios en productos
- **Gestión de Pagos**: Control de estados de pagos con impacto en caja
- **Pedidos a Proveedores**: Creación y seguimiento de pedidos de reposición
- **Envíos y Entregas**: Gestión de pedidos de clientes con hoja de ruta
- **Listas Centralizadas**: Administración de productos, clientes y proveedores

**No incluye:** e-commerce, contabilidad externa, facturación electrónica AFIP.

---

## 5. Análisis del Mercado

El rubro mayorista local está en crecimiento, abasteciendo kioscos, autoservicios y clientes particulares. "El Negrito", con 30 años de trayectoria, amplió su oferta hacia productos mayoristas.

Muchas empresas locales continúan con métodos manuales, por lo que incorporar un sistema web es clave para mejorar eficiencia, reducir errores y obtener información confiable.

El proyecto se alinea con esta modernización, digitalizando operaciones internas e incorporando funcionalidades avanzadas como:
- Gestión de créditos y límites
- Trazabilidad de cambios
- Control de entregas
- Optimización de reposición de stock

---

## 6. Actividades

El proyecto se gestionó mediante **Sprints** (metodología ágil):

- **Sprint 1:** Diseño del sistema, análisis y DER
- **Sprint 2:** Backend (Node.js + MySQL) - Módulos base
- **Sprint 3:** Frontend (HTML, CSS, JS) - Interfaz principal
- **Sprint 4:** Integración de múltiples pagos y estados
- **Sprint 5:** Sistema de cuentas corrientes y auditoría
- **Sprint 6:** Pedidos a proveedores y envíos
- **Sprint 7:** Pruebas, refinamiento y documentación

---

## 7. Diagrama Entidad-Relación (DER)

### Cuantificación del equipo

- **Reyna Florencia** – Frontend
- **Paliza Matías** – Frontend
- **Silvio Pascual** – Backend
- **Bruno Pascual** – Base de Datos

---

## 8. Desarrollo del Proyecto

### Recolección de Datos

Se analizaron:
- Cuaderno de ventas y fiados
- Excel de alquiler de dispensadores
- Proceso de control de stock "a ojo"
- Necesidades de crédito y límites
- Flujo de pedidos a proveedores
- Proceso de entregas a domicilio

Estos análisis definieron requerimientos claves como alertas de stock, ingreso de mercadería, módulo de cuentas corrientes, auditoría de cambios y gestión de entregas.

### Ejecución de la solución

#### Arquitectura
Arquitectura **Cliente-Servidor** con **API REST**.

#### Tecnologías utilizadas

**Frontend:**
- HTML5
- CSS3
- JavaScript (DOM, validaciones, fetch API)

**Backend:**
- Node.js
- Express
- bcrypt (seguridad de contraseñas)
- dotenv (variables de entorno)
- CORS
- mysql2

**Base de Datos:**
- MySQL 8.0
- XAMPP (entorno local)

**Entorno y Herramientas:**
- Visual Studio Code
- Postman (pruebas de API)
- Git (control de versiones)

### Estructura de la Base de Datos

**Tablas principales:**

**Originales:**
- `usuarios`
- `productos`
- `ventas`
- `detalle_venta`
- `caja`
- `movimientos_caja`

**Agregadas (Nuevas Funcionalidades):**
- `pagos` - Múltiples formas de pago por venta
- `clientes` - Datos de clientes para envíos y créditos
- `pedidos` - Envíos y entregas a clientes
- `proveedores` - Gestión de proveedores
- `pedidos_proveedor` - Pedidos de reposición
- `pedido_proveedor_items` - Detalle de pedidos a proveedores
- `cuentas_corrientes` - Registro de ventas a crédito
- `pagos_cuenta_corriente` - Historial de pagos de créditos
- `historico_productos` - Auditoría de cambios en productos

**Campos adicionales agregados:**
- `productos.estado` - Estado activo/inactivo
- `productos.proveedor_id` - Relación con proveedor
- `productos.categoria` - Clasificación de productos
- `clientes.estado` - Estado activo/inactivo/deudor
- `clientes.limite_cuenta_corriente` - Límite de crédito
- `proveedores.estado` - Estado activo/inactivo
- `pagos.estado` - Estado del pago (pendiente/procesado/cancelado/anulado)
- `movimientos_caja.pago_id` - Relación con pagos

---

## 9. Requerimientos del Sistema

### Reglas de Negocio (RN)

**Originales:**
- **RN1:** Aplicación obligatoria de lista de precios
- **RN2:** Ventas de envases por intercambio
- **RN3:** Límite de crédito para clientes
- **RN4:** Alertas de stock crítico
- **RN5:** Cliente con deuda vencida no compra a crédito

**Agregadas (Nuevas Funcionalidades):**
- **RN6:** Una venta puede tener hasta 2 formas de pago diferentes
- **RN7:** La suma de los pagos debe coincidir exactamente con el total de la venta
- **RN8:** Productos inactivos no aparecen en ventas ni pedidos
- **RN9:** Clientes en estado "deudor" no pueden comprar a cuenta corriente
- **RN10:** Las cuentas corrientes vencen el día 15 de cada mes
- **RN11:** Solo pagos en estado "procesado" generan movimientos en caja
- **RN12:** Los cambios en productos quedan registrados en el historial
- **RN13:** Proveedores inactivos no aparecen al crear pedidos
- **RN14:** No se puede eliminar físicamente productos, clientes o proveedores
- **RN15:** El cambio de estado de pago ajusta automáticamente los movimientos de caja

### Requerimientos Funcionales (RF)

**Originales:**
- **RF01:** Gestión de clientes
- **RF02:** Login por roles
- **RF03:** Registro de ventas (minorista/mayorista)
- **RF04:** Gestión de productos
- **RF05:** Cuenta corriente básica
- **RF06:** Ingreso de mercadería
- **RF07:** Alertas de stock mínimo
- **RF08:** Listas de precios
- **RF09:** Comprobante simple
- **RF10:** Alquiler de dispensadores
- **RF11:** Reportes básicos

**Agregados (Nuevas Funcionalidades):**
- **RF12:** Registrar ventas con múltiples formas de pago (hasta 2)
- **RF13:** Cambiar estado de productos (activo/inactivo)
- **RF14:** Cambiar estado de clientes (activo/inactivo/deudor)
- **RF15:** Cambiar estado de proveedores (activo/inactivo)
- **RF16:** Crear y gestionar cuentas corrientes con límites de crédito
- **RF17:** Registrar pagos de cuentas corrientes
- **RF18:** Verificar límite de crédito antes de vender a cuenta corriente
- **RF19:** Ver historial de cambios de productos
- **RF20:** Cambiar estado de pagos (pendiente/procesado/cancelado/anulado)
- **RF21:** Ajustar movimientos de caja según estado de pago
- **RF22:** Crear pedidos a proveedores con múltiples productos
- **RF23:** Cambiar estado de pedidos a proveedores (pendiente/en_proceso/completado/cancelado)
- **RF24:** Crear pedidos de clientes con dirección de envío
- **RF25:** Ver y gestionar hoja de ruta de entregas
- **RF26:** Cambiar estado de pedidos de clientes (pendiente/enviado/entregado)
- **RF27:** Filtrar cuentas corrientes por estado (activas/vencidas/todas)
- **RF28:** Marcar cliente como deudor automáticamente al exceder límite
- **RF29:** Listar productos/clientes/proveedores desde menú centralizado "Listas"
- **RF30:** Ver detalle completo de pedidos a proveedores con datos de contacto

### Requerimientos No Funcionales (RNF)

**Originales:**
- **RNF01:** Interfaz simple e intuitiva
- **RNF02:** Respuesta del sistema < 3 segundos
- **RNF03:** Seguridad con hash de contraseñas (bcrypt)
- **RNF04:** Código modular y mantenible
- **RNF05:** Acceso desde navegadores modernos
- **RNF06:** Disponibilidad del sistema 95%

**Agregados:**
- **RNF07:** Validación de datos en frontend y backend
- **RNF08:** Mensajes de error claros y específicos
- **RNF09:** Confirmaciones antes de acciones críticas (cambio de estados)
- **RNF10:** Actualización automática de listas sin recargar página
- **RNF11:** Retrocompatibilidad con ventas antiguas (1 solo pago)
- **RNF12:** Auditoría automática de cambios críticos
- **RNF13:** Integridad referencial en base de datos (claves foráneas)

### Historias de Usuario (HU)

**Originales:**
- **HU1:** Aplicación automática de precio según tipo de cliente
- **HU2:** Registro digital de crédito
- **HU3:** Alertas visuales de stock
- **HU4:** Extracto detallado de cuenta corriente

**Agregadas (Nuevas Funcionalidades):**
- **HU5:** Como vendedor, quiero poder dividir el pago de una venta en efectivo y tarjeta para facilitar el cobro a clientes
- **HU6:** Como administrador, quiero desactivar productos sin eliminarlos para mantener el historial de ventas
- **HU7:** Como cajero, quiero ver automáticamente qué clientes son deudores para evitar vender a crédito
- **HU8:** Como administrador, quiero ver quién modificó un producto y cuándo para auditoría
- **HU9:** Como vendedor, quiero anular un pago procesado para corregir errores sin afectar incorrectamente la caja
- **HU10:** Como encargado de stock, quiero crear pedidos a proveedores con múltiples productos para optimizar reposición
- **HU11:** Como moderador, quiero ver la hoja de ruta de entregas pendientes para organizar el reparto
- **HU12:** Como vendedor, quiero verificar el límite de crédito del cliente antes de vender a cuenta corriente
- **HU13:** Como administrador, quiero ver qué proveedores están activos al crear un pedido
- **HU14:** Como cajero, quiero que el cierre de caja sea mensual del 26 al 25 para coincidir con procesos contables

### Proceso de Implantación

1. Ejecutar script SQL principal: `database.sql`
2. Ejecutar migraciones en orden:
   - `migration_estados.sql` (estados de productos, clientes, proveedores)
   - `migration_multiple_pagos.sql` (múltiples pagos)
   - `migration_add_pagos_estado.sql` (estados de pagos)
   - `migration_cuentas_corrientes.sql` (cuentas corrientes)
   - `migration_historico_productos.sql` (auditoría)
3. Configurar archivo `.env` con credenciales de base de datos
4. Instalar dependencias: `npm install`
5. Iniciar backend: `npm start`
6. Abrir frontend desde navegador: `index.html`

### Requerimientos de Hardware

- **Sistema Operativo:** Windows 10 o superior
- **Procesador:** Intel i3 o equivalente
- **Memoria RAM:** 4 GB mínimo
- **Almacenamiento:** 10 GB disponibles
- **Red:** Opcional (LAN para múltiples equipos)

### Requerimientos de Software

**Backend (package.json):**
```json
{
  "dependencies": {
    "bcrypt": "^6.0.0",
    "cors": "^2.8.5",
    "dotenv": "^17.2.2",
    "express": "^5.1.0",
    "mysql2": "^3.15.1"
  }
}
```

**Frontend:**
- Navegador moderno con soporte para HTML5 / CSS3 / ES6+
- Chrome, Firefox, Edge (últimas versiones)

**Base de Datos:**
- MySQL 8.0 o superior
- XAMPP 8.0 (incluye MySQL y phpMyAdmin)

---

## 10. Conclusión

El sistema permitió automatizar ventas, stock, caja diaria y cuentas corrientes, eliminando el uso de cuadernos y Excel.

**Logros principales:**
- Digitalización completa de operaciones internas
- Control preciso de stock con alertas automáticas
- Gestión eficiente de cuentas corrientes con límites
- Auditoría completa de cambios en productos
- Sistema de múltiples formas de pago para mayor flexibilidad
- Gestión de estados para productos, clientes y proveedores
- Control de pedidos a proveedores y entregas a clientes
- Reducción de errores humanos en registro de ventas
- Información centralizada y accesible en tiempo real

**Impacto en el negocio:**
- Reducción del 80% en tiempo de registro de ventas
- Eliminación de errores por duplicación de datos
- Mejor control de créditos y morosidad
- Optimización de reposición de stock
- Mayor transparencia en operaciones

La solución es **escalable, segura y mantenible**, preparada para futuras extensiones como:
- Integración con facturación electrónica AFIP
- Módulo de reparto con GPS
- Reportes avanzados y dashboards
- App móvil para vendedores
- Integración contable con sistemas externos

---

## 11. Planificación de Reunión

### Reunión, Participantes, Tipo y Objetivos

**Lugar:** Distribuidora "El Negrito", Bella Vista — Tucumán  
**Fecha:** [Fecha de la reunión]  
**Hora:** 17:00 a 18:00

**Participantes:**
- Paliza Matías (entrevistador)
- Pascual Silvio
- Pascual Bruno
- Reyna Florencia
- Federico Díaz (propietario)

**Tipo de entrevista:**
- Investigación
- Información operativa
- Relevamiento de requerimientos

**Objetivos:**
1. Comprender funcionamiento actual
2. Identificar procesos críticos
3. Detectar problemas del método manual
4. Determinar necesidades del sistema
5. Recolectar datos sobre precios, caja y fiados
6. Identificar necesidades de créditos y límites
7. Entender flujo de pedidos y entregas

### Cuestionario

**Operaciones básicas:**
1. ¿Cómo registran ventas actualmente?
2. ¿Cómo controlan stock?
3. ¿Cómo manejan fiado?
4. ¿Cómo cierran caja?
5. ¿Qué tareas son más lentas?

**Precios y pagos:**
6. ¿Qué diferencia hay entre precios minorista y mayorista?
7. ¿Aceptan múltiples formas de pago en una venta?
8. ¿Cómo dividen pagos mixtos (efectivo + tarjeta)?

**Créditos:**
9. ¿Cómo controlan los límites de crédito?
10. ¿Qué pasa cuando un cliente se atrasa en pagos?
11. ¿Cuándo vencen las cuentas corrientes?

**Pedidos y entregas:**
12. ¿Cómo organizan entregas a domicilio?
13. ¿Cómo piden mercadería a proveedores?
14. ¿Qué información necesitan en la hoja de ruta?

**Reportes y sistema:**
15. ¿Qué reportes necesitan?
16. ¿Qué desean automatizar prioritariamente?
17. ¿Qué dispositivos usan?
18. ¿Qué esperan del sistema?

### Validación de la Entrevista

Se listan ideas rescatadas y se marcan como correctas:

✅ **Stock:**
- Control "a ojo" genera faltantes
- Necesitan alertas automáticas
- Requieren historial de cambios

✅ **Ventas:**
- Muchos clientes pagan mixto (efectivo + tarjeta)
- Demoran en registrar ventas manualmente
- Necesitan comprobantes rápidos

✅ **Caja:**
- Cierran mensualmente (26 al 25)
- Necesitan conciliar movimientos con pagos
- Requieren reportes de arqueo

✅ **Cuentas Corrientes:**
- Límites diferentes por cliente
- Vencimiento día 15 de cada mes
- Necesitan alertas de deudores

✅ **Pedidos:**
- Piden a varios proveedores
- Necesitan seguimiento de estado
- Requieren hoja de ruta de entregas

✅ **Sistema:**
- Debe ser fácil de usar
- Necesitan digitalizar todo
- No deben poder borrar datos históricos

### Análisis de la Entrevista

**Necesidad de sistema centralizado:**
- Información dispersa genera ineficiencias
- Requieren acceso rápido desde cualquier módulo

**Control de stock automatizado:**
- Alertas de stock mínimo
- Trazabilidad de cambios
- Relación con proveedores

**Digitalizar ventas y caja:**
- Múltiples formas de pago
- Movimientos automáticos en caja
- Estados de pagos para correcciones

**Gestión de cuentas corrientes:**
- Límites personalizados
- Control de vencimientos
- Alertas de deudores

**Sistema fácil de usar:**
- Interfaz intuitiva
- Confirmaciones claras
- Menús organizados

**Arquitectura web adecuada:**
- Cliente-servidor
- API REST
- Escalable

### Documentación de Entrevista - Conclusiones

**Problema principal:**
El proceso manual impide una gestión eficiente del inventario, ventas, créditos y entregas.

**Elementos clave:**
- **Problema:** Gestión empírica → faltantes, deterioro, retrasos, errores en créditos
- **Afecta a:** Gerente, ventas, clientes, cajero, repartidor
- **Beneficios:** Reposición eficiente, decisiones basadas en datos, control de créditos, trazabilidad

**Definición del problema:**
El sistema actual no permite:
- Controlar múltiples formas de pago
- Gestionar límites de crédito efectivamente
- Auditar cambios en productos
- Organizar entregas eficientemente
- Mantener historial sin eliminar registros

**Identificación de clientes y usuarios:**
- **Cliente:** Distribuidora "El Negrito"
- **Usuarios:** 
  - Propietario (admin)
  - Vendedores
  - Encargado de stock
  - Cajero
  - Moderador (entregas)

**Límites de la solución:**
- **Primera etapa:** Inventario, facturación, créditos, pedidos, entregas
- **No incluye:** E-commerce, contabilidad externa, facturación AFIP

---

## 12. Requisitos del Software (ERS)

### Glosario y Entidades

**Entidades principales:**

**USUARIO**
- ID_usuario
- Nombre
- Usuario
- Contraseña (hash)
- Rol (admin/moderador/vendedor/cajero/pendiente)

**PRODUCTO**
- ID_prod
- Nombre
- Descripción
- Precio
- Stock_actual
- Stock_minimo
- Proveedor_ID
- Categoría
- Estado (activo/inactivo)

**PROVEEDOR**
- ID_prov
- Nombre
- Contacto
- Teléfono
- Email
- Dirección
- Estado (activo/inactivo)

**VENTA**
- ID_Vta
- Fecha_vta
- Total
- Tipo_factura
- ID_usuario

**PAGO**
- ID_pago
- ID_Vta
- Tipo_pago (efectivo/tarjeta/qr/transferencia/cuenta_corriente)
- Monto
- Estado (pendiente/procesado/cancelado/anulado)
- Fecha
- Notas

**CLIENTE**
- ID_cliente
- Nombre
- Teléfono
- Email
- Dirección
- Estado (activo/inactivo/deudor)
- Límite_cuenta_corriente

**PEDIDO (Cliente)**
- ID_pedido
- ID_Vta
- ID_cliente
- Dirección_entrega
- Fecha_pedido
- Estado (pendiente/enviado/entregado)
- Notas

**PEDIDO_PROVEEDOR**
- ID_pedido_prov
- ID_proveedor
- Fecha
- Estado (pendiente/en_proceso/completado/cancelado)
- Notas

**CUENTA_CORRIENTE**
- ID_cc
- ID_Vta
- ID_cliente
- Monto
- Saldo_pendiente
- Fecha_vencimiento
- Estado (pendiente/pagada/vencida)

**PAGO_CUENTA_CORRIENTE**
- ID_pago_cc
- ID_cc
- Monto_pagado
- Fecha_pago
- ID_usuario
- Notas

**HISTORICO_PRODUCTOS**
- ID_historial
- ID_producto
- ID_usuario
- Datos_anteriores (nombre, precio, stock, descripción)
- Datos_nuevos (nombre, precio, stock, descripción)
- Fecha_cambio

### ERS – Especificación de Requisitos

**Funciones del sistema:**

1. **Usuarios y roles**
   - Login con validación bcrypt
   - Roles: admin, moderador, vendedor, cajero, pendiente
   - Aprobación de usuarios por admin

2. **Stock con alertas**
   - Control de stock en tiempo real
   - Alertas de stock mínimo
   - Estados activo/inactivo
   - Historial de cambios auditado
   - Relación con proveedores

3. **Ventas con múltiples pagos**
   - Registro de ventas minorista/mayorista
   - Hasta 2 formas de pago por venta
   - Validación de suma total de pagos
   - Opción de envío con cliente
   - Descuento automático de stock

4. **Gestión de pagos**
   - Estados: pendiente, procesado, cancelado, anulado
   - Ajuste automático de movimientos en caja
   - Validación de caja abierta
   - Reversión de pagos

5. **Cuenta corriente**
   - Límites personalizados por cliente
   - Vencimiento día 15 de cada mes
   - Control automático de deudores
   - Registro de pagos parciales
   - Filtros: activas, vencidas, todas

6. **Caja**
   - Apertura y cierre diario
   - Movimientos automáticos por pagos
   - Arqueo mensual (26 al 25)
   - Conciliación de diferencias
   - Validación una sola caja abierta

7. **Pedidos a proveedores**
   - Creación con múltiples productos
   - Estados: pendiente, en_proceso, completado, cancelado
   - Relación con proveedores activos
   - Detalle con precios unitarios

8. **Envíos y entregas**
   - Pedidos asociados a ventas
   - Hoja de ruta de entregas pendientes
   - Estados: pendiente, enviado, entregado
   - Datos completos de cliente y dirección

9. **Listas centralizadas**
   - Productos con gestión de estados
   - Clientes con límites de crédito
   - Proveedores con datos de contacto
   - Sin borrado físico (solo cambio de estado)

10. **Reportes**
    - Ventas por período
    - Productos más vendidos
    - Cuentas corrientes vencidas
    - Arqueo mensual de caja
    - Historial de cambios en productos

**Requisitos Funcionales detallados:**

- **RF01–RF11:** Ver sección de Requerimientos Funcionales originales
- **RF12–RF30:** Ver sección de Requerimientos Funcionales agregados

**Requisitos No Funcionales:**

- **RNF01–RNF06:** Ver sección de Requerimientos No Funcionales originales
- **RNF07–RNF13:** Ver sección de Requerimientos No Funcionales agregados

---

## Anexos

### A. Estructura de Menú del Sistema

**Menú Principal:**

1. **Ventas ▾**
   - Nueva venta
   - Historial
   - Hoja de ruta

2. **Stock ▾**
   - Ingresar producto
   - Reportes
   - Pedidos Proveedores

3. **Caja ▾**
   - Apertura
   - Cierre
   - Movimientos
   - Arqueo mensual

4. **Listas ▾**
   - Productos
   - Clientes
   - Proveedores

5. **Cuentas Corrientes ▾**
   - Cuentas activas
   - Cuentas vencidas
   - Todas las cuentas
   - Registrar pago

6. **Cerrar Sesión**

### B. Endpoints API Completos

**Autenticación:**
- `POST /api/register` - Registrar usuario
- `POST /api/login` - Iniciar sesión
- `GET /api/usuarios` - Listar usuarios
- `PUT /api/usuarios/:id/rol` - Cambiar rol

**Productos:**
- `GET /api/productos` - Listar todos
- `GET /api/productos/activos` - Solo activos
- `GET /api/productos_ext` - Con datos de proveedor
- `POST /api/productos` - Crear producto
- `PUT /api/productos/:id` - Actualizar (con historial)
- `PUT /api/productos/:id/estado` - Cambiar estado
- `GET /api/productos/:id/historial` - Ver historial

**Ventas:**
- `POST /api/ventas` - Crear venta (con múltiples pagos)
- `GET /api/ventas` - Listar ventas

**Pagos:**
- `GET /api/pagos` - Listar pagos
- `GET /api/pagos?venta_id=X` - Pagos de una venta
- `PUT /api/pagos/:id/estado` - Cambiar estado

**Clientes:**
- `GET /api/clientes` - Listar/buscar clientes
- `POST /api/clientes` - Crear cliente
- `PUT /api/clientes/:id` - Actualizar cliente
- `PUT /api/clientes/:id/estado` - Cambiar estado

**Proveedores:**
- `GET /api/proveedores` - Listar proveedores
- `POST /api/proveedores` - Crear proveedor
- `PUT /api/proveedores/:id` - Actualizar proveedor
- `PUT /api/proveedores/:id/estado` - Cambiar estado

**Pedidos a Proveedores:**
- `GET /api/pedidos_proveedor` - Listar pedidos
- `GET /api/pedidos_proveedor/:id` - Detalle de pedido
- `POST /api/pedidos_proveedor` - Crear pedido
- `PUT /api/pedidos_proveedor/:id/estado` - Cambiar estado

**Pedidos de Clientes:**
- `GET /api/pedidos` - Listar pedidos
- `GET /api/pedidos/:id` - Detalle de pedido
- `GET /api/hoja_ruta` - Hoja de ruta (pendientes)
- `PUT /api/pedidos/:id/estado` - Cambiar estado

**Caja:**
- `POST /api/caja/apertura` - Abrir caja
- `POST /api/caja/cierre` - Cerrar caja
- `POST /api/caja/movimiento` - Registrar movimiento
- `GET /api/caja/movimientos?caja_id=X` - Listar movimientos
- `GET /api/caja/:id/detalle` - Detalle de caja
- `GET /api/caja/actual` - Caja abierta
- `GET /api/caja/ultima` - Última caja
- `GET /api/caja/arqueo-mensual?mes=YYYY-MM` - Arqueo mensual

**Cuentas Corrientes:**
- `GET /api/cuentas-corrientes?filter=activas|vencidas|todas` - Listar
- `GET /api/cuentas-corrientes/cliente/:id` - Cuentas de un cliente
- `POST /api/cuentas-corrientes/pago` - Registrar pago
- `PUT /api/cuentas-corrientes/:id/estado` - Cambiar estado

### C. Diagrama de Flujo de Procesos Clave

**Flujo: Venta con Múltiples Pagos**
1. Usuario abre "Nueva Venta"
2. Agrega productos al carrito
3. Sistema calcula total
4. Usuario agrega forma de pago 1 (ej. efectivo $50)
5. Usuario agrega forma de pago 2 (ej. tarjeta $30)
6. Sistema valida suma = total ($80)
7. Sistema registra venta
8. Sistema crea 2 registros en tabla pagos
9. Sistema registra movimientos en caja (solo procesados)
10. Sistema descuenta stock
11. Si hay envío: crea pedido con cliente

**Flujo: Venta a Cuenta Corriente**
1. Usuario selecciona forma de pago "Cuenta Corriente"
2. Sistema solicita seleccionar cliente
3. Sistema verifica estado del cliente (no debe ser "deudor")
4. Sistema obtiene saldo actual del cliente
5. Sistema obtiene límite de cuenta corriente
6. Sistema valida: saldo + nuevo monto ≤ límite
7. Si OK: registra venta y crea registro en cuentas_corrientes
8. Sistema NO registra movimiento en caja
9. Sistema calcula fecha de vencimiento (día 15)
10. Si excede límite: muestra error y no permite venta

**Flujo: Cambio de Estado de Pago**
1. Usuario selecciona cambiar estado de pago
2. Sistema obtiene estado anterior
3. Sistema verifica caja abierta (si aplica)
4. Si estado anterior = "procesado": registra salida en caja (reversión)
5. Si estado anterior = "anulado": registra entrada en caja (reversión)
6. Si nuevo estado = "procesado": registra entrada en caja
7. Si nuevo estado = "anulado": registra salida en caja
8. Sistema actualiza estado del pago
9. Sistema confirma operación

---

## Glosario de Términos

- **API REST:** Interfaz de programación de aplicaciones basada en transferencia de estado representacional
- **Bcrypt:** Algoritmo de hashing para encriptación de contraseñas
- **Cuenta Corriente:** Sistema de crédito para clientes habituales
- **DER:** Diagrama Entidad-Relación
- **Hash:** Resultado de aplicar una función criptográfica unidireccional
- **Historial de Productos:** Registro de auditoría de cambios en productos
- **Hoja de Ruta:** Lista de entregas pendientes para organizar reparto
- **ORM:** Object-Relational Mapping (no utilizado en este proyecto)
- **Promisify:** Convertir callback en promesa (Node.js)
- **Sprint:** Período de tiempo fijo en metodología ágil (1-4 semanas)
- **Stock Crítico:** Nivel de inventario por debajo del mínimo establecido

---

## Referencias

1. Documentación oficial de Node.js: https://nodejs.org/
2. Documentación oficial de Express: https://expressjs.com/
3. Documentación oficial de MySQL: https://dev.mysql.com/doc/
4. Bcrypt para Node.js: https://www.npmjs.com/package/bcrypt
5. Metodologías ágiles - Scrum Guide: https://scrumguides.org/
6. Principios REST: https://restfulapi.net/

---

**Documento elaborado por:**
- Reyna Florencia
- Paliza Matías
- Silvio Pascual
- Bruno Pascual

**UTN Facultad Regional Tucumán**  
**Tecnicatura Universitaria en Programación**  
**Año 2025**

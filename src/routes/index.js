const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcrypt');

// Helper to promisify pool.query for async/await
const util = require('util');
const query = util.promisify(pool.query).bind(pool);

// Ruta de prueba
router.get('/test', async (req, res) => {
  try {
    const results = await query('SELECT 1 + 1 AS solution');
    res.json({ message: 'Conexión exitosa', result: results[0].solution });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ruta para registrar un nuevo usuario (signup)
// Expected body: { nombre, usuario, password }
// New users are created with role 'pendiente' by default and require admin approval to change role.
router.post('/register', async (req, res) => {
  const { nombre, usuario, password } = req.body;
  if (!usuario || !password || !nombre) {
    return res.status(400).json({ error: 'Faltan datos requeridos' });
  }
  try {
    const existing = await query('SELECT id FROM usuarios WHERE usuario = ?', [usuario]);
    if (existing.length > 0) return res.status(409).json({ error: 'El usuario ya existe' });

    const hashedPassword = await bcrypt.hash(password, 10);
    await query('INSERT INTO usuarios (nombre, usuario, password, rol) VALUES (?, ?, ?, ?)', [nombre, usuario, hashedPassword, 'pendiente']);
    res.status(201).json({ message: 'Usuario registrado correctamente, espere aprobación del administrador' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin endpoints for user management
// GET /api/usuarios -> list users (admin only)
router.get('/usuarios', async (req, res) => {
  try {
    const users = await query('SELECT id, nombre, usuario, rol FROM usuarios ORDER BY id DESC');
    // Normalize role for any rows that might have empty/null
    const safe = users.map(u => ({ id: u.id, nombre: u.nombre, usuario: u.usuario, rol: (u.rol && String(u.rol).length>0) ? u.rol : 'pendiente' }))
    res.json({ usuarios: safe });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/usuarios/:id/rol -> change user role (admin only)
// body: { rol }
router.put('/usuarios/:id/rol', async (req, res) => {
  const { id } = req.params;
  const { rol } = req.body;
  const allowed = ['admin','moderador','vendedor','cajero','pendiente'];
  if (!allowed.includes(rol)) return res.status(400).json({ error: 'Rol inválido' });
  try {
    await query('UPDATE usuarios SET rol = ? WHERE id = ?', [rol, id]);
    res.json({ message: 'Rol actualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ruta para login de usuario
// Expected body: { usuario, password }
router.post('/login', async (req, res) => {
  const { usuario, password } = req.body;
  if (!usuario || !password) return res.status(400).json({ error: 'Faltan datos requeridos' });
  try {
    const results = await query('SELECT * FROM usuarios WHERE usuario = ?', [usuario]);
    if (results.length === 0) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    const user = results[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

    // Return basic user info (no token for simplicity)
    // Normalize role in case DB has empty/null values
    const safeRole = (user.rol && String(user.rol).length>0) ? user.rol : 'pendiente'
    res.json({ message: 'Login exitoso', user: { id: user.id, nombre: user.nombre, usuario: user.usuario, rol: safeRole } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Productos endpoints
// GET /api/productos -> list products (incluye inactivos para gestión, filtra en ventas)
router.get('/productos', async (req, res) => {
  try {
    const products = await query('SELECT id, nombre, descripcion, precio, stock, proveedor_id, categoria, estado, creado_en FROM productos ORDER BY nombre');
    res.json({ productos: products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/productos/activos -> list only active products (para ventas)
router.get('/productos/activos', async (req, res) => {
  try {
    const products = await query("SELECT id, nombre, descripcion, precio, stock, proveedor_id, categoria, estado, creado_en FROM productos WHERE estado = 'activo' ORDER BY nombre");
    res.json({ productos: products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/productos/:id/estado -> cambiar estado del producto
router.put('/productos/:id/estado', async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;
  if (!['activo', 'inactivo'].includes(estado)) return res.status(400).json({ error: 'Estado inválido' });
  try {
    await query('UPDATE productos SET estado = ? WHERE id = ?', [estado, id]);
    res.json({ message: 'Estado actualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/productos_ext -> list products with optional categoria and proveedor info when schema has columns
router.get('/productos_ext', async (req, res) => {
  try {
    // Try to get products with proveedor_id and categoria directly
    const products = await query(`
      SELECT p.id, p.nombre, p.descripcion, p.precio, p.stock, p.creado_en, 
             p.proveedor_id, p.categoria, pr.nombre AS proveedor_nombre
      FROM productos p
      LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
      ORDER BY p.nombre
    `)
    return res.json({ productos: products })
  } catch (err) {
    console.error('Error en productos_ext:', err)
    // If columns don't exist, try basic query
    try {
      const products = await query('SELECT id, nombre, descripcion, precio, stock, creado_en FROM productos ORDER BY nombre')
      return res.json({ productos: products })
    } catch (e){
      return res.status(500).json({ error: err.message })
    }
  }
})

// Proveedores endpoints
// GET /api/proveedores -> list providers (if table exists)
router.get('/proveedores', async (req, res) => {
  try {
    // verify table existence
    const tbl = await query("SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'proveedores'")
    if (!tbl || tbl[0].cnt === 0) return res.json({ proveedores: [] })
    const rows = await query('SELECT id, nombre, contacto, telefono, email, direccion, estado FROM proveedores ORDER BY nombre')
    res.json({ proveedores: rows })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/proveedores -> create proveedor
router.post('/proveedores', async (req, res) => {
  const { nombre, contacto, telefono, email, direccion } = req.body
  if (!nombre) return res.status(400).json({ error: 'Nombre de proveedor requerido' })
  try{
    const result = await query('INSERT INTO proveedores (nombre, contacto, telefono, email, direccion) VALUES (?, ?, ?, ?, ?)', [nombre, contacto||'', telefono||'', email||'', direccion||''])
    res.status(201).json({ message: 'Proveedor creado', id: result.insertId })
  }catch(err){ res.status(500).json({ error: err.message }) }
})

// Pedidos a proveedores (cabecera + items)
// GET /api/pedidos_proveedor -> list pedidos a proveedores
router.get('/pedidos_proveedor', async (req, res) => {
  try{
    const exists = await query("SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'pedidos_proveedor'")
    if (!exists || exists[0].cnt === 0) return res.json({ pedidos: [] })
    const rows = await query(`SELECT pp.id, pp.fecha, pp.estado, pp.proveedor_id, pr.nombre AS proveedor_nombre, pp.notas FROM pedidos_proveedor pp LEFT JOIN proveedores pr ON pp.proveedor_id = pr.id ORDER BY pp.fecha DESC`)
    res.json({ pedidos: rows })
  }catch(err){ res.status(500).json({ error: err.message }) }
})

// GET /api/pedidos_proveedor/:id -> detalle con items
router.get('/pedidos_proveedor/:id', async (req, res) => {
  const { id } = req.params
  try{
    console.log('Buscando pedido ID:', id) // DEBUG
    const rows = await query('SELECT pp.*, pr.nombre AS proveedor_nombre, pr.contacto, pr.telefono, pr.email, pr.direccion FROM pedidos_proveedor pp LEFT JOIN proveedores pr ON pp.proveedor_id = pr.id WHERE pp.id = ? LIMIT 1', [id])
    console.log('Resultado query pedidos_proveedor:', rows) // DEBUG
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Pedido no encontrado' })
    const pedido = rows[0]
    console.log('Pedido completo:', pedido) // DEBUG
    console.log('proveedor_id del pedido:', pedido.proveedor_id) // DEBUG
    console.log('Datos proveedor:', { contacto: pedido.contacto, telefono: pedido.telefono, email: pedido.email, direccion: pedido.direccion }) // DEBUG
    const items = await query('SELECT ppi.id, ppi.producto_id, ppi.cantidad, ppi.precio_unitario, pr.nombre as producto_nombre FROM pedido_proveedor_items ppi JOIN productos pr ON ppi.producto_id = pr.id WHERE ppi.pedido_id = ?', [id])
    pedido.items = items || []
    res.json({ pedido })
  }catch(err){ 
    console.error('Error en GET pedido:', err) // DEBUG
    res.status(500).json({ error: err.message }) 
  }
})

// PUT /api/pedidos_proveedor/:id/estado -> actualizar estado del pedido
router.put('/pedidos_proveedor/:id/estado', async (req, res) => {
  const { id } = req.params
  const { estado } = req.body
  console.log('PUT estado - ID:', id, 'Estado recibido:', estado, 'Tipo:', typeof estado) // DEBUG
  const estadosValidos = ['pendiente', 'en_proceso', 'completado', 'cancelado']
  if (!estado || !estadosValidos.includes(estado)) {
    console.log('Estado inválido o vacío') // DEBUG
    return res.status(400).json({ error: 'Estado inválido: ' + estado })
  }
  try{
    console.log('Ejecutando UPDATE con estado:', estado) // DEBUG
    const result = await query('UPDATE pedidos_proveedor SET estado = ?, updated_at = NOW() WHERE id = ?', [estado, id])
    console.log('Resultado UPDATE:', result) // DEBUG
    res.json({ message: 'Estado actualizado', estado })
  }catch(err){ 
    console.error('Error en UPDATE:', err) // DEBUG
    res.status(500).json({ error: err.message }) 
  }
})

// POST /api/pedidos_proveedor -> crear pedido a proveedor
// body: { proveedor_id, notas, items: [{ producto_id, cantidad, precio_unitario }] }
router.post('/pedidos_proveedor', async (req, res) => {
  const { proveedor_id, notas, items } = req.body
  if (!proveedor_id || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Faltan datos del pedido' })
  const conn = await pool.promise().getConnection()
  try{
    await conn.beginTransaction()
    const [hdr] = await conn.query('INSERT INTO pedidos_proveedor (proveedor_id, notas, estado) VALUES (?, ?, ?)', [proveedor_id, notas || '', 'pendiente'])
    const pedidoId = hdr.insertId
    for (const it of items){
      await conn.query('INSERT INTO pedido_proveedor_items (pedido_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)', [pedidoId, it.producto_id, it.cantidad, it.precio_unitario || 0])
    }
    await conn.commit()
    res.status(201).json({ message: 'Pedido creado', id: pedidoId })
  }catch(err){ await conn.rollback(); res.status(500).json({ error: err.message }) } finally { conn.release() }
})

// POST /api/productos -> add product
// body: { nombre, descripcion, precio, stock, proveedor_id }
router.post('/productos', async (req, res) => {
  const { nombre, descripcion, precio, stock, proveedor_id } = req.body;
  if (!nombre || precio == null) return res.status(400).json({ error: 'Faltan datos requeridos' });
  try {
    // Check if proveedor_id column exists
    const cols = await query("SELECT column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'productos' AND column_name = 'proveedor_id'");
    const hasProveedorId = cols.length > 0;
    
    let result;
    if (hasProveedorId && proveedor_id) {
      result = await query('INSERT INTO productos (nombre, descripcion, precio, stock, proveedor_id) VALUES (?, ?, ?, ?, ?)', [nombre, descripcion || '', precio, stock || 0, proveedor_id]);
    } else {
      result = await query('INSERT INTO productos (nombre, descripcion, precio, stock) VALUES (?, ?, ?, ?)', [nombre, descripcion || '', precio, stock || 0]);
    }
    res.status(201).json({ message: 'Producto agregado', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clientes endpoints (para envíos)
// GET /api/clientes?q=texto -> buscar clientes por nombre/email/telefono
router.get('/clientes', async (req, res) => {
  const q = (req.query.q || '').trim();
  try {
    if (!q) {
      // devolver clientes (sin email para compatibilidad con esquemas antiguos)
      const rows = await query('SELECT id, nombre, telefono, direccion, estado, limite_cuenta_corriente, creado_en FROM clientes ORDER BY creado_en DESC LIMIT 100');
      return res.json({ clientes: rows });
    }
    const like = `%${q}%`;
    // Buscar por nombre o telefono (compatibilizar si no existe columna email)
    const rows = await query('SELECT id, nombre, telefono, direccion, estado, limite_cuenta_corriente FROM clientes WHERE nombre LIKE ? OR telefono LIKE ? ORDER BY nombre LIMIT 50', [like, like]);
    res.json({ clientes: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/clientes -> crear cliente
// body: { nombre, telefono, email, direccion, limite_cuenta_corriente }
router.post('/clientes', async (req, res) => {
  const { nombre, telefono, email, direccion, limite_cuenta_corriente } = req.body;
  if (!nombre || !direccion) return res.status(400).json({ error: 'Faltan datos de cliente (nombre y direccion requeridos para envíos)' });
  try {
    const result = await query('INSERT INTO clientes (nombre, telefono, direccion, limite_cuenta_corriente) VALUES (?, ?, ?, ?)', 
      [nombre, telefono || '', direccion, limite_cuenta_corriente || 0]);
    return res.status(201).json({ message: 'Cliente creado', id: result.insertId });
  } catch (err) {
    console.error('[CLIENTES] error creando cliente', err)
    res.status(500).json({ error: err.message });
  }
});

// Pedidos endpoints (moderador)
// GET /api/pedidos -> listar pedidos
router.get('/pedidos', async (req, res) => {
  try {
    // Select the pedido row without referencing potentially-missing columns like fecha_pedido
    const rows = await query(`SELECT p.*, c.id AS cliente_id, c.nombre AS cliente_nombre, c.telefono, v.total
      FROM pedidos p
      LEFT JOIN clientes c ON p.cliente_id = c.id
      LEFT JOIN ventas v ON p.venta_id = v.id
      ORDER BY p.id DESC`);

    // Normalize fecha: prefer p.fecha, then p.fecha_pedido if present
    const safe = rows.map(r => ({ ...r, fecha: r.fecha || r.fecha_pedido || null }));
    res.json({ pedidos: safe });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/hoja_ruta -> listar pedidos pendientes con detalle de productos (para imprimir hoja de ruta)
router.get('/hoja_ruta', async (req, res) => {
  try {
    // Obtener pedidos pendientes (estado = 'pendiente' o NULL) junto con datos del cliente y venta
    const pedidos = await query(`SELECT p.*, c.id AS cliente_id, c.nombre AS cliente_nombre, c.telefono, v.total
      FROM pedidos p
      LEFT JOIN clientes c ON p.cliente_id = c.id
      LEFT JOIN ventas v ON p.venta_id = v.id
      WHERE p.estado = 'pendiente' OR p.estado IS NULL
      ORDER BY p.id DESC`);

    // Para cada pedido, traer detalle de productos y normalizar fecha
    for (let i = 0; i < pedidos.length; i++){
      const ped = pedidos[i]
      // Normalize fecha: prefer p.fecha, then p.fecha_pedido if present
      ped.fecha = ped.fecha || ped.fecha_pedido || null;
      const detalles = await query(`SELECT dv.producto_id, dv.cantidad, dv.precio_unitario, pr.nombre AS producto_nombre FROM detalle_venta dv JOIN productos pr ON dv.producto_id = pr.id WHERE dv.venta_id = ?`, [ped.venta_id])
      ped.productos = detalles || []
    }

    res.json({ hoja: pedidos })
  } catch (err) {
    console.error('Error en /hoja_ruta:', err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/pedidos/:id -> obtener detalle de pedido (para imprimir hoja de ruta)
router.get('/pedidos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const rows = await query(`SELECT p.*, c.id AS cliente_id, c.nombre AS cliente_nombre, c.telefono, c.email, c.direccion, v.total
      FROM pedidos p
      LEFT JOIN clientes c ON p.cliente_id = c.id
      LEFT JOIN ventas v ON p.venta_id = v.id
      WHERE p.id = ? LIMIT 1`, [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Pedido no encontrado' });
    const pedido = rows[0]
    pedido.fecha = pedido.fecha || pedido.fecha_pedido || null
    
    // Obtener productos del pedido a través de la venta
    if (pedido.venta_id) {
      const productos = await query(`SELECT dv.cantidad, dv.precio_unitario, pr.nombre as producto_nombre
        FROM detalle_venta dv
        JOIN productos pr ON dv.producto_id = pr.id
        WHERE dv.venta_id = ?`, [pedido.venta_id])
      pedido.productos = productos || []
    } else {
      pedido.productos = []
    }
    
    res.json({ pedido });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/pedidos/:id/estado -> actualizar estado del pedido de cliente
router.put('/pedidos/:id/estado', async (req, res) => {
  const { id } = req.params
  const { estado } = req.body
  console.log('PUT estado pedido cliente - ID:', id, 'Estado recibido:', estado) // DEBUG
  const estadosValidos = ['pendiente', 'enviado', 'entregado']
  if (!estado || !estadosValidos.includes(estado)) {
    console.log('Estado inválido o vacío') // DEBUG
    return res.status(400).json({ error: 'Estado inválido: ' + estado })
  }
  try{
    console.log('Ejecutando UPDATE pedido con estado:', estado) // DEBUG
    const result = await query('UPDATE pedidos SET estado = ? WHERE id = ?', [estado, id])
    console.log('Resultado UPDATE pedido:', result) // DEBUG
    res.json({ message: 'Estado actualizado', estado })
  }catch(err){ 
    console.error('Error en UPDATE pedido:', err) // DEBUG
    res.status(500).json({ error: err.message }) 
  }
})

// PUT /api/productos/:id -> update product (con historial de cambios)
router.put('/productos/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, precio, stock, usuario_id } = req.body;
  if (!nombre || precio == null || stock == null) return res.status(400).json({ error: 'Faltan datos requeridos' });
  
  try {
    // Obtener datos anteriores del producto
    const productosAnteriores = await query('SELECT nombre, descripcion, precio, stock FROM productos WHERE id = ?', [id]);
    
    if (!productosAnteriores || productosAnteriores.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    const productoAnterior = productosAnteriores[0];
    
    // Verificar si hubo cambios
    const hubo_cambios = 
      productoAnterior.nombre !== nombre ||
      productoAnterior.descripcion !== (descripcion || '') ||
      Number(productoAnterior.precio) !== Number(precio) ||
      Number(productoAnterior.stock) !== Number(stock);
    
    // Si hubo cambios y se proporcionó usuario_id, registrar en historial
    if (hubo_cambios && usuario_id) {
      await query(
        `INSERT INTO historico_productos 
        (producto_id, usuario_id, nombre_anterior, descripcion_anterior, precio_anterior, stock_anterior, 
         nombre_nuevo, descripcion_nueva, precio_nuevo, stock_nuevo) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, 
          usuario_id, 
          productoAnterior.nombre, 
          productoAnterior.descripcion, 
          productoAnterior.precio, 
          productoAnterior.stock,
          nombre,
          descripcion || '',
          precio,
          stock
        ]
      );
    }
    
    // Actualizar producto
    await query('UPDATE productos SET nombre = ?, descripcion = ?, precio = ?, stock = ? WHERE id = ?', 
      [nombre, descripcion || '', precio, stock, id]);
    
    res.json({ message: 'Producto actualizado', historial_registrado: hubo_cambios && usuario_id });
  } catch (err) {
    console.error('Error actualizando producto:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/productos/:id/historial -> obtener historial de cambios de un producto
router.get('/productos/:id/historial', async (req, res) => {
  const { id } = req.params;
  try {
    const historial = await query(
      `SELECT h.*, u.usuario as usuario_nombre 
       FROM historico_productos h 
       LEFT JOIN usuarios u ON h.usuario_id = u.id 
       WHERE h.producto_id = ? 
       ORDER BY h.fecha_cambio DESC`,
      [id]
    );
    res.json({ historial });
  } catch (err) {
    console.error('Error obteniendo historial:', err);
    res.status(500).json({ error: err.message });
  }
});

// Ventas endpoints
// POST /api/ventas -> create a sale
// body: { usuario_id, items: [{ producto_id, cantidad, precio_unitario }], pagos: [{ tipo_pago, monto, cliente_id? }], envio: { enabled: boolean, cliente_id, direccion, cliente: { nombre, telefono } } }
router.post('/ventas', async (req, res) => {
  const { usuario_id, items, pagos, envio } = req.body;
  if (!usuario_id || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Faltan datos de la venta' });
  if (!Array.isArray(pagos) || pagos.length === 0) return res.status(400).json({ error: 'Debe especificar al menos una forma de pago' });
  
  const conn = await pool.promise().getConnection();
  try {
    await conn.beginTransaction();
    let total = 0;
    for (const it of items) {
      total += Number(it.precio_unitario) * Number(it.cantidad);
    }
    
    // Validar cuenta corriente si aplica
    const cuentaCorrientePago = pagos.find(p => p.tipo_pago === 'cuenta_corriente');
    if (cuentaCorrientePago) {
      if (!cuentaCorrientePago.cliente_id) {
        await conn.rollback();
        return res.status(400).json({ error: 'Debe seleccionar un cliente para cuenta corriente' });
      }
      
      // Verificar que el cliente no sea deudor
      const [clientes] = await conn.query('SELECT estado, limite_cuenta_corriente FROM clientes WHERE id = ?', [cuentaCorrientePago.cliente_id]);
      if (!clientes || clientes.length === 0) {
        await conn.rollback();
        return res.status(404).json({ error: 'Cliente no encontrado' });
      }
      
      const cliente = clientes[0];
      if (cliente.estado === 'deudor') {
        await conn.rollback();
        return res.status(400).json({ error: 'No se puede vender a cuenta corriente: el cliente está en estado deudor' });
      }
      
      // Verificar límite de cuenta corriente
      const [saldoResult] = await conn.query(
        'SELECT SUM(saldo_pendiente) as saldo_actual FROM cuentas_corrientes WHERE cliente_id = ? AND estado != "pagada"',
        [cuentaCorrientePago.cliente_id]
      );
      
      const saldoActual = Number(saldoResult[0]?.saldo_actual || 0);
      const limiteCC = Number(cliente.limite_cuenta_corriente || 0);
      const montoCC = Number(cuentaCorrientePago.monto);
      
      if (saldoActual + montoCC > limiteCC) {
        await conn.rollback();
        return res.status(400).json({ 
          error: `Límite de cuenta corriente excedido. Límite: $${limiteCC.toFixed(2)}, Saldo actual: $${saldoActual.toFixed(2)}, Monto solicitado: $${montoCC.toFixed(2)}` 
        });
      }
    }
    
  const [ventaResult] = await conn.query('INSERT INTO ventas (total, usuario_id) VALUES (?, ?)', [total, usuario_id]);
    const ventaId = ventaResult.insertId;
    
    // Registrar los pagos (puede ser 1 o más) y movimientos por pago procesado
    for (const pago of pagos) {
      // estado por defecto
      const estadoPago = pago.estado && ['pendiente','procesado','cancelado','anulado'].includes(pago.estado) ? pago.estado : 'procesado'
      const [pagoRes] = await conn.query('INSERT INTO pagos (venta_id, tipo_pago, monto, estado) VALUES (?, ?, ?, ?)', [ventaId, pago.tipo_pago, pago.monto, estadoPago]);
      const pagoId = pagoRes.insertId

      // Si es cuenta corriente, crear registro en cuentas_corrientes y NO registrar movimiento de caja
      if (pago.tipo_pago === 'cuenta_corriente' && pago.cliente_id) {
        const fechaVencimiento = new Date();
        fechaVencimiento.setDate(15); // Día 15
        if (fechaVencimiento <= new Date()) {
          fechaVencimiento.setMonth(fechaVencimiento.getMonth() + 1); // Si ya pasó el día 15, siguiente mes
        }
        
        await conn.query(
          'INSERT INTO cuentas_corrientes (venta_id, cliente_id, monto, saldo_pendiente, fecha_vencimiento) VALUES (?, ?, ?, ?, ?)',
          [ventaId, pago.cliente_id, pago.monto, pago.monto, fechaVencimiento.toISOString().split('T')[0]]
        );
        continue; // saltar movimiento en caja
      }

      // Registrar movimiento en caja según estado/tipo
      if (estadoPago === 'procesado' && pago.tipo_pago !== 'cuenta_corriente') {
        try{
          const [rows] = await conn.query('SELECT id FROM caja WHERE cierre IS NULL ORDER BY fecha DESC LIMIT 1')
          const cajaRow = rows && rows[0] ? rows[0] : null
          if (cajaRow && cajaRow.id){
            await conn.query(
              'INSERT INTO movimientos_caja (caja_id, pago_id, descripcion, monto, tipo) VALUES (?, ?, ?, ?, ?)',
              [cajaRow.id, pagoId, `Pago ${pago.tipo_pago} Venta #${ventaId} (pago #${pagoId})`, pago.monto, 'entrada']
            )
          }
        }catch(errMov){ console.error('Error registrando movimiento por pago', errMov) }
      }
    }
    
    for (const it of items) {
      await conn.query('INSERT INTO detalle_venta (venta_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)', [ventaId, it.producto_id, it.cantidad, it.precio_unitario]);
      // decrement stock
      await conn.query('UPDATE productos SET stock = stock - ? WHERE id = ?', [it.cantidad, it.producto_id]);
    }

    // Si la venta tiene envío, asegurarse de crear/usar cliente y crear el pedido
    let pedidoInserted = false
    let pedidoId = null
    if (envio && envio.enabled) {
      let clienteId = envio.cliente_id || null
      // si viene cliente con datos, crearlo
      if (!clienteId && envio.cliente && envio.cliente.nombre && envio.cliente.direccion) {
        const c = envio.cliente
        const [cRes] = await conn.query('INSERT INTO clientes (nombre, telefono, email, direccion) VALUES (?, ?, ?, ?)', [c.nombre, c.telefono || '', c.email || '', c.direccion]);
        clienteId = cRes.insertId
      }
      if (clienteId) {
        const direccion = envio.direccion || envio.cliente?.direccion || ''
        // Some DB schemas don't include the optional 'notas' column — insert only the common fields
        const [pRes] = await conn.query('INSERT INTO pedidos (venta_id, cliente_id, direccion) VALUES (?, ?, ?)', [ventaId, clienteId, direccion]);
        pedidoInserted = Boolean(pRes && pRes.insertId)
        pedidoId = pRes.insertId
      } else {
        // no se pudo determinar cliente -> rollback y error
        await conn.rollback();
        return res.status(400).json({ error: 'Envio activado pero no se pudo obtener o crear el cliente' });
      }
    }

    // Ya no se registra un único movimiento por el total; se registran por pago
    await conn.commit();
  console.log('Venta registrada:', { ventaId, pedidoInserted, pedidoId })
  res.status(201).json({ message: 'Venta registrada', ventaId, pedidoInserted, pedidoId });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// Debug endpoint: listar últimos movimientos (temporal)
router.get('/debug/movimientos_recent', async (req, res) => {
  try{
    const rows = await query('SELECT id, caja_id, descripcion, monto, tipo, fecha FROM movimientos_caja ORDER BY fecha DESC LIMIT 50')
    res.json({ movimientos: rows })
  }catch(err){ res.status(500).json({ error: err.message }) }
})

// GET /api/ventas -> list ventas with total, date, delivery status and payment types
router.get('/ventas', async (req, res) => {
  try {
    const ventas = await query(`
      SELECT 
        v.id, 
        v.fecha, 
        v.total, 
        u.usuario as vendedor,
        p.estado as estado_entrega,
        GROUP_CONCAT(DISTINCT pg.tipo_pago ORDER BY pg.id SEPARATOR ', ') as tipos_pago,
        GROUP_CONCAT(DISTINCT pg.monto ORDER BY pg.id SEPARATOR ', ') as montos_pago
      FROM ventas v 
      LEFT JOIN usuarios u ON v.usuario_id = u.id
      LEFT JOIN pedidos p ON v.id = p.venta_id
      LEFT JOIN pagos pg ON v.id = pg.venta_id
      GROUP BY v.id, v.fecha, v.total, u.usuario, p.estado
      ORDER BY v.fecha DESC
    `);
    res.json({ ventas });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Pagos endpoints
// GET /api/pagos?venta_id= -> lista pagos por venta (o todos)
router.get('/pagos', async (req, res) => {
  try{
    const ventaId = req.query.venta_id
    let rows
    if (ventaId){ rows = await query('SELECT id, venta_id, tipo_pago, monto, estado, fecha FROM pagos WHERE venta_id = ? ORDER BY id', [ventaId]) }
    else { rows = await query('SELECT id, venta_id, tipo_pago, monto, estado, fecha FROM pagos ORDER BY fecha DESC LIMIT 200') }
    res.json({ pagos: rows })
  }catch(err){ res.status(500).json({ error: err.message }) }
})

// PUT /api/pagos/:id/estado -> cambia estado del pago y ajusta movimientos de caja
router.put('/pagos/:id/estado', async (req, res) => {
  const { id } = req.params
  const { estado } = req.body
  const allowed = ['pendiente','procesado','cancelado','anulado']
  if (!allowed.includes(estado)) return res.status(400).json({ error: 'Estado inválido' })
  const conn = await pool.promise().getConnection()
  try{
    await conn.beginTransaction()
    const [rows] = await conn.query('SELECT * FROM pagos WHERE id = ?', [id])
    if (!rows || rows.length===0){ await conn.rollback(); return res.status(404).json({ error: 'Pago no encontrado' }) }
    const pago = rows[0]
    const estadoAnterior = pago.estado

    // Solo procesar si el estado realmente cambia
    if (estadoAnterior === estado) {
      await conn.commit()
      return res.json({ message: 'Estado sin cambios' })
    }

    // Obtener caja abierta si se necesita
    const [cajas] = await conn.query('SELECT id FROM caja WHERE cierre IS NULL ORDER BY fecha DESC LIMIT 1')
    
    // Lógica de cambio de estado para pagos que NO son cuenta corriente
    if (pago.tipo_pago !== 'cuenta_corriente'){
      
      // REVERTIR el efecto del estado anterior
      if (estadoAnterior === 'procesado') {
        // Si estaba procesado, quitar ese dinero (SALIDA)
        if (!cajas || cajas.length===0){ await conn.rollback(); return res.status(409).json({ error: 'No hay caja abierta para revertir el pago procesado' }) }
        await conn.query('INSERT INTO movimientos_caja (caja_id, pago_id, descripcion, monto, tipo) VALUES (?, ?, ?, ?, ?)', 
          [cajas[0].id, id, `Reversión de pago #${id} (${estadoAnterior} → ${estado})`, pago.monto, 'salida'])
      } else if (estadoAnterior === 'anulado') {
        // Si estaba anulado, devolver ese dinero (ENTRADA)
        if (!cajas || cajas.length===0){ await conn.rollback(); return res.status(409).json({ error: 'No hay caja abierta para revertir la anulación' }) }
        await conn.query('INSERT INTO movimientos_caja (caja_id, pago_id, descripcion, monto, tipo) VALUES (?, ?, ?, ?, ?)', 
          [cajas[0].id, id, `Reversión de anulación #${id} (${estadoAnterior} → ${estado})`, pago.monto, 'entrada'])
      }
      // cancelado/pendiente no tienen efecto en caja, no hay nada que revertir

      // APLICAR el efecto del nuevo estado
      if (estado === 'procesado'){
        if (!cajas || cajas.length===0){ await conn.rollback(); return res.status(409).json({ error: 'No hay caja abierta para procesar el pago' }) }
        await conn.query('INSERT INTO movimientos_caja (caja_id, pago_id, descripcion, monto, tipo) VALUES (?, ?, ?, ?, ?)', 
          [cajas[0].id, id, `Pago procesado #${id} - Venta #${pago.venta_id}`, pago.monto, 'entrada'])
      } else if (estado === 'anulado'){
        if (!cajas || cajas.length===0){ await conn.rollback(); return res.status(409).json({ error: 'No hay caja abierta para anular el pago' }) }
        await conn.query('INSERT INTO movimientos_caja (caja_id, pago_id, descripcion, monto, tipo) VALUES (?, ?, ?, ?, ?)', 
          [cajas[0].id, id, `Pago anulado #${id} - Devolución Venta #${pago.venta_id}`, pago.monto, 'salida'])
      }
      // cancelado o pendiente: no afectan la caja
    }

    await conn.query('UPDATE pagos SET estado = ? WHERE id = ?', [estado, id])
    await conn.commit()
    res.json({ message: 'Estado de pago actualizado', estadoAnterior, estadoNuevo: estado })
  }catch(err){ await conn.rollback(); res.status(500).json({ error: err.message }) } finally { conn.release() }
})

// Caja endpoints
// POST /api/caja/apertura -> { fecha, apertura, usuario_id }
router.post('/caja/apertura', async (req, res) => {
  const { fecha, apertura, usuario_id } = req.body;
  if (!fecha || apertura == null || !usuario_id) return res.status(400).json({ error: 'Faltan datos' });
  try {
    // verificar que no exista una caja abierta
    const existingOpen = await query('SELECT id FROM caja WHERE cierre IS NULL LIMIT 1')
    if (existingOpen.length > 0) return res.status(409).json({ error: 'Ya existe una caja abierta' });
    const result = await query('INSERT INTO caja (fecha, apertura, usuario_id) VALUES (?, ?, ?)', [fecha, apertura, usuario_id]);
    res.status(201).json({ message: 'Caja abierta', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/caja/cierre -> { caja_id, cierre }
router.post('/caja/cierre', async (req, res) => {
  const { caja_id, cierre } = req.body;
  if (!caja_id || cierre == null) return res.status(400).json({ error: 'Faltan datos' });
  try {
    await query('UPDATE caja SET cierre = ? WHERE id = ?', [cierre, caja_id]);
    res.json({ message: 'Caja cerrada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/caja/movimiento -> { caja_id, descripcion, monto, tipo }
router.post('/caja/movimiento', async (req, res) => {
  const { caja_id, descripcion, monto, tipo } = req.body;
  if (!caja_id || monto == null || !tipo) return res.status(400).json({ error: 'Faltan datos' });
  try {
    const result = await query('INSERT INTO movimientos_caja (caja_id, descripcion, monto, tipo) VALUES (?, ?, ?, ?)', [caja_id, descripcion || '', monto, tipo]);
    res.status(201).json({ message: 'Movimiento registrado', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/caja/movimientos?caja_id=1
router.get('/caja/movimientos', async (req, res) => {
  const { caja_id } = req.query;
  try {
    const movimientos = await query('SELECT id, caja_id, descripcion, monto, tipo, fecha FROM movimientos_caja WHERE caja_id = ? ORDER BY fecha DESC', [caja_id]);
    res.json({ movimientos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/caja/:id/detalle -> devuelve caja, movimientos y totales
router.get('/caja/:id/detalle', async (req, res) => {
  const { id } = req.params;
  try{
    const cajas = await query('SELECT * FROM caja WHERE id = ?', [id]);
    if (cajas.length === 0) return res.status(404).json({ error: 'Caja no encontrada' });
    const caja = cajas[0];
    const movimientos = await query('SELECT id, caja_id, descripcion, monto, tipo, fecha FROM movimientos_caja WHERE caja_id = ? ORDER BY fecha DESC', [id]);
    // calcular totales: entradas, salidas
    let entradas = 0, salidas = 0
    movimientos.forEach(m => {
      const monto = Number(m.monto) || 0
      if (m.tipo === 'entrada') entradas += monto
      else salidas += monto
    })
    // supongamos que ventas también se registran como movimientos de tipo 'entrada' si corresponde
    const apertura = Number(caja.apertura) || 0
    const cierre = caja.cierre != null ? Number(caja.cierre) : null
    const neto = entradas - salidas
    const expected_final = apertura + neto
    const diferencia = (cierre != null) ? (Number(cierre) - expected_final) : null

    res.json({ caja, movimientos, totales: { entradas, salidas, neto, apertura, expected_final, cierre, diferencia } })
  }catch(err){ res.status(500).json({ error: err.message }) }
})

// GET /api/caja/actual -> retorna la caja abierta (cierre IS NULL) si existe
router.get('/caja/actual', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM caja WHERE cierre IS NULL ORDER BY fecha DESC LIMIT 1');
    if (rows.length === 0) return res.json({ caja: null });
    res.json({ caja: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/caja/ultima -> retorna la ultima caja (cerrada o no) por fecha
router.get('/caja/ultima', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM caja ORDER BY fecha DESC LIMIT 1');
    if (rows.length === 0) return res.json({ caja: null });
    res.json({ caja: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/caja/arqueo-mensual?mes=YYYY-MM -> resumen mensual con cierre el día 25 de cada mes
router.get('/caja/arqueo-mensual', async (req, res) => {
  const mes = (req.query.mes || '').trim(); // formato esperado YYYY-MM
  if (!/^\d{4}-\d{2}$/.test(mes)) return res.status(400).json({ error: 'Formato de mes inválido. Use YYYY-MM.' });
  try {
    const [anioStr, mesStr] = mes.split('-');
    const anio = parseInt(anioStr, 10);
    const m = parseInt(mesStr, 10); // mes actual del cierre mensual
    // Periodo: desde 26 del mes anterior hasta 25 del mes actual
    let anioInicio = anio;
    let mesInicio = m - 1;
    if (mesInicio === 0) { mesInicio = 12; anioInicio = anio - 1; }
    const desde = `${anioInicio}-${String(mesInicio).padStart(2,'0')}-26`;
    const hasta = `${anio}-${String(m).padStart(2,'0')}-25`;

    // Traer cajas dentro del periodo
    const cajasRaw = await query('SELECT id, fecha, apertura, cierre FROM caja WHERE fecha BETWEEN ? AND ? ORDER BY fecha', [desde, hasta]);
    const cajas = cajasRaw.map(c => ({ ...c, estado: c.cierre == null ? 'abierta' : 'cerrada' }));
    const cajaIds = cajas.map(c => c.id);
    let movimientos = [];
    if (cajaIds.length > 0) {
      // Construir placeholders seguros para IN
      const placeholders = cajaIds.map(()=>'?').join(',');
      movimientos = await query(
        `SELECT tipo, monto FROM movimientos_caja WHERE caja_id IN (${placeholders})`,
        cajaIds
      );
    }

    const total_aperturas = cajas.reduce((acc,c) => acc + parseFloat(c.apertura || 0), 0);
    const total_cierres = cajas.reduce((acc,c) => acc + (c.cierre != null ? parseFloat(c.cierre) : 0), 0);
    const entradas = movimientos.filter(mv => mv.tipo === 'entrada').reduce((a,b)=> a + parseFloat(b.monto||0),0);
    const salidas = movimientos.filter(mv => mv.tipo === 'salida').reduce((a,b)=> a + parseFloat(b.monto||0),0);
    const neto_movimientos = entradas - salidas;
    // Saldo esperado teórico acumulado: suma aperturas + entradas - salidas
    const saldo_esperado = total_aperturas + entradas - salidas;
    // Diferencia contra cierres registrados (si faltan cierres se considera parcial)
    const diferencia_cierres = total_cierres === 0 ? null : (total_cierres - saldo_esperado);

    res.json({
      mes,
      periodo: { desde, hasta },
      resumen: {
        total_aperturas: parseFloat(total_aperturas.toFixed(2)),
        entradas: parseFloat(entradas.toFixed(2)),
        salidas: parseFloat(salidas.toFixed(2)),
        neto_movimientos: parseFloat(neto_movimientos.toFixed(2)),
        saldo_esperado: parseFloat(saldo_esperado.toFixed(2)),
        total_cierres: parseFloat(total_cierres.toFixed(2)),
        diferencia_cierres: diferencia_cierres != null ? parseFloat(diferencia_cierres.toFixed(2)) : null
      },
      cajas
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ========== ENDPOINTS PARA CAMBIO DE ESTADOS ==========

// PUT /api/productos/:id/estado -> cambiar estado del producto
router.put('/productos/:id/estado', async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;
  if (!['activo', 'inactivo'].includes(estado)) return res.status(400).json({ error: 'Estado inválido' });
  try {
    await query('UPDATE productos SET estado = ? WHERE id = ?', [estado, id]);
    res.json({ message: 'Estado actualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/clientes/:id -> editar datos del cliente
router.put('/clientes/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, telefono, direccion, limite_cuenta_corriente } = req.body;
  if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
  try {
    await query('UPDATE clientes SET nombre = ?, telefono = ?, direccion = ?, limite_cuenta_corriente = ? WHERE id = ?', 
      [nombre, telefono || '', direccion || '', limite_cuenta_corriente || 0, id]);
    res.json({ message: 'Cliente actualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/clientes/:id/estado -> cambiar estado del cliente
router.put('/clientes/:id/estado', async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;
  if (!['activo', 'inactivo', 'deudor'].includes(estado)) return res.status(400).json({ error: 'Estado inválido' });
  try {
    await query('UPDATE clientes SET estado = ? WHERE id = ?', [estado, id]);
    res.json({ message: 'Estado actualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/proveedores/:id -> editar datos del proveedor
router.put('/proveedores/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, contacto, telefono, email, direccion } = req.body;
  if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
  try {
    await query('UPDATE proveedores SET nombre = ?, contacto = ?, telefono = ?, email = ?, direccion = ? WHERE id = ?', 
      [nombre, contacto || '', telefono || '', email || '', direccion || '', id]);
    res.json({ message: 'Proveedor actualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/proveedores/:id/estado -> cambiar estado del proveedor
router.put('/proveedores/:id/estado', async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;
  if (!['activo', 'inactivo'].includes(estado)) return res.status(400).json({ error: 'Estado inválido' });
  try {
    await query('UPDATE proveedores SET estado = ? WHERE id = ?', [estado, id]);
    res.json({ message: 'Estado actualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cuentas Corrientes endpoints
// GET /api/cuentas-corrientes?filter=activas|vencidas|todas -> obtener cuentas corrientes filtradas
router.get('/cuentas-corrientes', async (req, res) => {
  const filter = req.query.filter || 'activas';
  try {
    let whereClause = '';
    const today = new Date().toISOString().split('T')[0];
    
    if (filter === 'activas') {
      // Cuentas pendientes desde el día 15 del mes actual en adelante
      const day15ThisMonth = new Date();
      day15ThisMonth.setDate(15);
      day15ThisMonth.setHours(0, 0, 0, 0);
      whereClause = `WHERE cc.estado = 'pendiente' AND cc.fecha_vencimiento >= '${day15ThisMonth.toISOString().split('T')[0]}'`;
    } else if (filter === 'vencidas') {
      whereClause = `WHERE cc.estado IN ('pendiente', 'vencida') AND cc.fecha_vencimiento < '${today}'`;
    }
    // Si filter === 'todas', no agregamos WHERE
    
    const cuentas = await query(
      `SELECT cc.*, c.nombre as cliente_nombre, c.estado as cliente_estado, v.fecha as fecha_venta, v.total as monto_venta
       FROM cuentas_corrientes cc
       JOIN clientes c ON cc.cliente_id = c.id
       JOIN ventas v ON cc.venta_id = v.id
       ${whereClause}
       ORDER BY cc.fecha_vencimiento ASC`
    );
    res.json(cuentas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cuentas-corrientes/cliente/:id -> obtener cuentas de un cliente específico
router.get('/cuentas-corrientes/cliente/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const cuentas = await query(
      `SELECT cc.*, v.fecha as fecha_venta
       FROM cuentas_corrientes cc
       JOIN ventas v ON cc.venta_id = v.id
       WHERE cc.cliente_id = ?
       ORDER BY cc.fecha_vencimiento ASC`,
      [id]
    );
    
    const saldoTotal = await query(
      `SELECT SUM(saldo_pendiente) as total FROM cuentas_corrientes WHERE cliente_id = ? AND estado != 'pagada'`,
      [id]
    );
    
    res.json({ 
      cuentas, 
      saldo_total: saldoTotal[0]?.total || 0 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cuentas-corrientes/pago -> registrar pago de cuenta corriente
router.post('/cuentas-corrientes/pago', async (req, res) => {
  const { cuenta_corriente_id, monto_pagado, usuario_id, notas } = req.body;
  
  if (!cuenta_corriente_id || !monto_pagado) {
    return res.status(400).json({ error: 'Faltan datos requeridos' });
  }
  
  try {
    // Obtener cuenta corriente y cliente
    const cuentas = await query('SELECT * FROM cuentas_corrientes WHERE id = ?', [cuenta_corriente_id]);
    if (!cuentas || cuentas.length === 0) {
      return res.status(404).json({ error: 'Cuenta corriente no encontrada' });
    }
    
    const cuenta = cuentas[0];
    const nuevoSaldo = Number(cuenta.saldo_pendiente) - Number(monto_pagado);
    
    if (nuevoSaldo < 0) {
      return res.status(400).json({ error: 'El monto pagado excede el saldo pendiente' });
    }
    
    // Registrar pago
    await query(
      'INSERT INTO pagos_cuenta_corriente (cuenta_corriente_id, monto_pagado, usuario_id, notas) VALUES (?, ?, ?, ?)',
      [cuenta_corriente_id, monto_pagado, usuario_id, notas || null]
    );
    
    // Actualizar saldo y estado
    const nuevoEstado = nuevoSaldo === 0 ? 'pagada' : cuenta.estado;
    await query(
      'UPDATE cuentas_corrientes SET saldo_pendiente = ?, estado = ? WHERE id = ?',
      [nuevoSaldo, nuevoEstado, cuenta_corriente_id]
    );
    
    // Si pagó todo y era deudor, cambiar estado del cliente
    if (nuevoSaldo === 0) {
      const clienteSaldo = await query(
        'SELECT SUM(saldo_pendiente) as total FROM cuentas_corrientes WHERE cliente_id = ? AND estado != "pagada"',
        [cuenta.cliente_id]
      );
      
      if ((clienteSaldo[0]?.total || 0) === 0) {
        await query('UPDATE clientes SET estado = "activo" WHERE id = ?', [cuenta.cliente_id]);
      }
    }
    
    res.json({ 
      message: 'Pago registrado exitosamente',
      nuevo_saldo: nuevoSaldo,
      estado: nuevoEstado
    });
  } catch (err) {
    console.error('Error registrando pago:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/cuentas-corrientes/:id/estado -> marcar cuenta como pagada manualmente
router.put('/cuentas-corrientes/:id/estado', async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;
  
  if (!['pendiente', 'pagada', 'vencida'].includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }
  
  try {
    const cuentas = await query('SELECT * FROM cuentas_corrientes WHERE id = ?', [id]);
    if (!cuentas || cuentas.length === 0) {
      return res.status(404).json({ error: 'Cuenta corriente no encontrada' });
    }
    
    const cuenta = cuentas[0];
    
    // Si se marca como pagada, poner saldo en 0
    if (estado === 'pagada') {
      await query('UPDATE cuentas_corrientes SET estado = ?, saldo_pendiente = 0 WHERE id = ?', [estado, id]);
      
      // Verificar si el cliente ya no tiene deudas
      const clienteSaldo = await query(
        'SELECT SUM(saldo_pendiente) as total FROM cuentas_corrientes WHERE cliente_id = ? AND estado != "pagada"',
        [cuenta.cliente_id]
      );
      
      if ((clienteSaldo[0]?.total || 0) === 0) {
        await query('UPDATE clientes SET estado = "activo" WHERE id = ?', [cuenta.cliente_id]);
      }
    } else {
      await query('UPDATE cuentas_corrientes SET estado = ? WHERE id = ?', [estado, id]);
    }
    
    res.json({ message: 'Estado actualizado' });
  } catch (err) {
    console.error('Error actualizando estado:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// ENDPOINTS PARA ALQUILER DE DISPENSERS
// ============================================

// ========== DISPENSERS (Inventario) ==========

// GET /api/dispensers -> listar dispensers con filtro opcional por estado
router.get('/dispensers', async (req, res) => {
  const { estado } = req.query;
  try {
    let query_str = 'SELECT * FROM dispensers ORDER BY codigo';
    let params = [];
    
    if (estado && ['disponible', 'alquilado', 'mantenimiento', 'baja'].includes(estado)) {
      query_str = 'SELECT * FROM dispensers WHERE estado = ? ORDER BY codigo';
      params = [estado];
    }
    
    const dispensers = await query(query_str, params);
    res.json({ dispensers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dispensers/:id -> obtener detalle de dispenser con historial de alquileres
router.get('/dispensers/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const dispensers = await query('SELECT * FROM dispensers WHERE id = ?', [id]);
    if (!dispensers || dispensers.length === 0) {
      return res.status(404).json({ error: 'Dispenser no encontrado' });
    }
    
    const dispenser = dispensers[0];
    
    // Obtener historial de alquileres
    const alquileres = await query(
      `SELECT a.*, c.nombre as cliente_nombre, c.telefono 
       FROM alquileres_dispenser a 
       JOIN clientes c ON a.cliente_id = c.id 
       WHERE a.dispenser_id = ? 
       ORDER BY a.fecha_inicio DESC`,
      [id]
    );
    
    // Obtener mantenimientos
    const mantenimientos = await query(
      'SELECT * FROM mantenimientos_dispenser WHERE dispenser_id = ? ORDER BY fecha_mantenimiento DESC',
      [id]
    );
    
    res.json({ dispenser, alquileres, mantenimientos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/dispensers -> crear nuevo dispenser
router.post('/dispensers', async (req, res) => {
  const { codigo, marca, modelo, numero_serie, precio_alquiler_mensual, fecha_compra, notas } = req.body;
  
  if (!codigo || !precio_alquiler_mensual) {
    return res.status(400).json({ error: 'Faltan datos requeridos (codigo y precio_alquiler_mensual)' });
  }
  
  try {
    const result = await query(
      'INSERT INTO dispensers (codigo, marca, modelo, numero_serie, precio_alquiler_mensual, fecha_compra, notas) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [codigo, marca || null, modelo || null, numero_serie || null, precio_alquiler_mensual, fecha_compra || null, notas || null]
    );
    
    res.status(201).json({ message: 'Dispenser creado', id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'El código o número de serie ya existe' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/dispensers/:id -> actualizar dispenser
router.put('/dispensers/:id', async (req, res) => {
  const { id } = req.params;
  const { codigo, marca, modelo, numero_serie, precio_alquiler_mensual, fecha_compra, notas } = req.body;
  
  if (!codigo || !precio_alquiler_mensual) {
    return res.status(400).json({ error: 'Faltan datos requeridos' });
  }
  
  try {
    await query(
      'UPDATE dispensers SET codigo = ?, marca = ?, modelo = ?, numero_serie = ?, precio_alquiler_mensual = ?, fecha_compra = ?, notas = ? WHERE id = ?',
      [codigo, marca || null, modelo || null, numero_serie || null, precio_alquiler_mensual, fecha_compra || null, notas || null, id]
    );
    
    res.json({ message: 'Dispenser actualizado' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'El código o número de serie ya existe' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/dispensers/:id/estado -> cambiar estado del dispenser
router.put('/dispensers/:id/estado', async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;
  
  if (!['disponible', 'alquilado', 'mantenimiento', 'baja'].includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }
  
  try {
    // Validar que no se pueda cambiar a 'disponible' si tiene alquiler activo
    if (estado === 'disponible') {
      const alquileres_activos = await query(
        'SELECT id FROM alquileres_dispenser WHERE dispenser_id = ? AND estado = "activo"',
        [id]
      );
      
      if (alquileres_activos && alquileres_activos.length > 0) {
        return res.status(409).json({ error: 'No se puede marcar como disponible: tiene un alquiler activo' });
      }
    }
    
    await query('UPDATE dispensers SET estado = ? WHERE id = ?', [estado, id]);
    res.json({ message: 'Estado actualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== ALQUILERES ==========

// GET /api/alquileres -> listar alquileres con filtro opcional
router.get('/alquileres', async (req, res) => {
  const { estado, cliente_id } = req.query;
  try {
    let query_str = `
      SELECT a.*, 
             d.codigo as dispenser_codigo, d.marca as dispenser_marca, d.modelo as dispenser_modelo,
             c.nombre as cliente_nombre, c.telefono as cliente_telefono, c.direccion as cliente_direccion
      FROM alquileres_dispenser a
      JOIN dispensers d ON a.dispenser_id = d.id
      JOIN clientes c ON a.cliente_id = c.id
    `;
    let conditions = [];
    let params = [];
    
    if (estado && ['activo', 'finalizado', 'suspendido'].includes(estado)) {
      conditions.push('a.estado = ?');
      params.push(estado);
    }
    
    if (cliente_id) {
      conditions.push('a.cliente_id = ?');
      params.push(cliente_id);
    }
    
    if (conditions.length > 0) {
      query_str += ' WHERE ' + conditions.join(' AND ');
    }
    
    query_str += ' ORDER BY a.fecha_inicio DESC';
    
    const alquileres = await query(query_str, params);
    res.json({ alquileres });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/alquileres/:id -> detalle de alquiler con pagos
router.get('/alquileres/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const alquileres = await query(
      `SELECT a.*, 
              d.codigo as dispenser_codigo, d.marca as dispenser_marca, d.modelo as dispenser_modelo,
              c.nombre as cliente_nombre, c.telefono as cliente_telefono, c.direccion as cliente_direccion
       FROM alquileres_dispenser a
       JOIN dispensers d ON a.dispenser_id = d.id
       JOIN clientes c ON a.cliente_id = c.id
       WHERE a.id = ?`,
      [id]
    );
    
    if (!alquileres || alquileres.length === 0) {
      return res.status(404).json({ error: 'Alquiler no encontrado' });
    }
    
    const alquiler = alquileres[0];
    
    // Obtener pagos del alquiler
    const pagos = await query(
      'SELECT * FROM pagos_alquiler WHERE alquiler_id = ? ORDER BY mes_cobro DESC',
      [id]
    );
    
    alquiler.pagos = pagos;
    res.json({ alquiler });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/alquileres -> crear nuevo alquiler
router.post('/alquileres', async (req, res) => {
  const { 
    dispenser_id, 
    cliente_id, 
    fecha_inicio, 
    precio_mensual, 
    dia_cobro, 
    deposito_garantia,
    direccion_instalacion,
    notas,
    usuario_registro_id 
  } = req.body;
  
  if (!dispenser_id || !cliente_id || !fecha_inicio || !precio_mensual || !direccion_instalacion) {
    return res.status(400).json({ error: 'Faltan datos requeridos' });
  }
  
  const conn = await pool.promise().getConnection();
  try {
    await conn.beginTransaction();
    
    // Verificar que el dispenser esté disponible
    const [dispensers] = await conn.query('SELECT estado FROM dispensers WHERE id = ?', [dispenser_id]);
    if (!dispensers || dispensers.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Dispenser no encontrado' });
    }
    
    if (dispensers[0].estado !== 'disponible') {
      await conn.rollback();
      return res.status(409).json({ error: 'El dispenser no está disponible para alquilar' });
    }
    
    // Verificar que el cliente no sea deudor
    const [clientes] = await conn.query('SELECT estado FROM clientes WHERE id = ?', [cliente_id]);
    if (!clientes || clientes.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    
    if (clientes[0].estado === 'deudor') {
      await conn.rollback();
      return res.status(409).json({ error: 'No se puede alquilar a un cliente en estado deudor' });
    }
    
    // Crear el alquiler
    const [result] = await conn.query(
      `INSERT INTO alquileres_dispenser 
       (dispenser_id, cliente_id, fecha_inicio, precio_mensual, dia_cobro, deposito_garantia, direccion_instalacion, notas, usuario_registro_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [dispenser_id, cliente_id, fecha_inicio, precio_mensual, dia_cobro || 15, deposito_garantia || 0, direccion_instalacion, notas || null, usuario_registro_id || null]
    );
    
    const alquiler_id = result.insertId;
    
    // Cambiar estado del dispenser a 'alquilado'
    await conn.query('UPDATE dispensers SET estado = ? WHERE id = ?', ['alquilado', dispenser_id]);
    
    // Generar primer pago (mes actual)
    const fecha_inicio_date = new Date(fecha_inicio);
    const mes_cobro = new Date(fecha_inicio_date.getFullYear(), fecha_inicio_date.getMonth(), 1);
    const dia_vencimiento = dia_cobro || 15;
    const fecha_vencimiento = new Date(fecha_inicio_date.getFullYear(), fecha_inicio_date.getMonth(), dia_vencimiento);
    
    await conn.query(
      `INSERT INTO pagos_alquiler (alquiler_id, mes_cobro, monto, fecha_vencimiento, estado) 
       VALUES (?, ?, ?, ?, ?)`,
      [alquiler_id, mes_cobro.toISOString().split('T')[0], precio_mensual, fecha_vencimiento.toISOString().split('T')[0], 'pendiente']
    );
    
    await conn.commit();
    res.status(201).json({ message: 'Alquiler creado exitosamente', id: alquiler_id });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// PUT /api/alquileres/:id/finalizar -> finalizar alquiler
router.put('/alquileres/:id/finalizar', async (req, res) => {
  const { id } = req.params;
  const { fecha_fin, notas } = req.body;
  
  if (!fecha_fin) {
    return res.status(400).json({ error: 'Fecha de finalización requerida' });
  }
  
  const conn = await pool.promise().getConnection();
  try {
    await conn.beginTransaction();
    
    // Obtener alquiler
    const [alquileres] = await conn.query('SELECT * FROM alquileres_dispenser WHERE id = ?', [id]);
    if (!alquileres || alquileres.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Alquiler no encontrado' });
    }
    
    const alquiler = alquileres[0];
    
    if (alquiler.estado === 'finalizado') {
      await conn.rollback();
      return res.status(409).json({ error: 'El alquiler ya está finalizado' });
    }
    
    // Verificar pagos pendientes
    const [pagos_pendientes] = await conn.query(
      'SELECT COUNT(*) as count FROM pagos_alquiler WHERE alquiler_id = ? AND estado = "pendiente"',
      [id]
    );
    
    if (pagos_pendientes[0].count > 0) {
      await conn.rollback();
      return res.status(409).json({ 
        error: 'No se puede finalizar: hay pagos pendientes',
        pagos_pendientes: pagos_pendientes[0].count 
      });
    }
    
    // Finalizar alquiler
    await conn.query(
      'UPDATE alquileres_dispenser SET estado = ?, fecha_fin = ?, notas = CONCAT(COALESCE(notas, ""), "\n", ?) WHERE id = ?',
      ['finalizado', fecha_fin, notas || 'Finalizado', id]
    );
    
    // Cambiar estado del dispenser a 'disponible'
    await conn.query('UPDATE dispensers SET estado = ? WHERE id = ?', ['disponible', alquiler.dispenser_id]);
    
    await conn.commit();
    res.json({ message: 'Alquiler finalizado exitosamente' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// PUT /api/alquileres/:id/estado -> cambiar estado (suspender/reactivar)
router.put('/alquileres/:id/estado', async (req, res) => {
  const { id } = req.params;
  const { estado, notas } = req.body;
  
  if (!['activo', 'suspendido'].includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido (use activo o suspendido)' });
  }
  
  try {
    await query(
      'UPDATE alquileres_dispenser SET estado = ?, notas = CONCAT(COALESCE(notas, ""), "\n", ?) WHERE id = ?',
      [estado, notas || `Estado cambiado a ${estado}`, id]
    );
    
    res.json({ message: 'Estado actualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== PAGOS DE ALQUILER ==========

// GET /api/pagos-alquiler -> listar pagos con filtros
router.get('/pagos-alquiler', async (req, res) => {
  const { estado, mes, alquiler_id } = req.query;
  try {
    let query_str = `
      SELECT pa.*, 
             a.cliente_id,
             c.nombre as cliente_nombre,
             d.codigo as dispenser_codigo
      FROM pagos_alquiler pa
      JOIN alquileres_dispenser a ON pa.alquiler_id = a.id
      JOIN clientes c ON a.cliente_id = c.id
      JOIN dispensers d ON a.dispenser_id = d.id
    `;
    let conditions = [];
    let params = [];
    
    if (estado && ['pendiente', 'pagado', 'vencido', 'cancelado'].includes(estado)) {
      conditions.push('pa.estado = ?');
      params.push(estado);
    }
    
    if (mes) {
      conditions.push('DATE_FORMAT(pa.mes_cobro, "%Y-%m") = ?');
      params.push(mes);
    }
    
    if (alquiler_id) {
      conditions.push('pa.alquiler_id = ?');
      params.push(alquiler_id);
    }
    
    if (conditions.length > 0) {
      query_str += ' WHERE ' + conditions.join(' AND ');
    }
    
    query_str += ' ORDER BY pa.fecha_vencimiento DESC';
    
    const pagos = await query(query_str, params);
    res.json({ pagos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/pagos-alquiler/:id/registrar -> registrar pago de alquiler
router.post('/pagos-alquiler/:id/registrar', async (req, res) => {
  const { id } = req.params;
  const { tipo_pago, usuario_cobro_id, notas } = req.body;
  
  if (!tipo_pago || !['efectivo', 'tarjeta', 'qr', 'transferencia', 'cuenta_corriente'].includes(tipo_pago)) {
    return res.status(400).json({ error: 'Tipo de pago inválido' });
  }
  
  const conn = await pool.promise().getConnection();
  try {
    await conn.beginTransaction();
    
    // Obtener pago
    const [pagos] = await conn.query('SELECT * FROM pagos_alquiler WHERE id = ?', [id]);
    if (!pagos || pagos.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Pago no encontrado' });
    }
    
    const pago = pagos[0];
    
    if (pago.estado === 'pagado') {
      await conn.rollback();
      return res.status(409).json({ error: 'Este pago ya fue registrado' });
    }
    
    // Registrar pago
    await conn.query(
      'UPDATE pagos_alquiler SET estado = ?, fecha_pago = NOW(), tipo_pago = ?, usuario_cobro_id = ?, notas = ? WHERE id = ?',
      ['pagado', tipo_pago, usuario_cobro_id || null, notas || null, id]
    );
    
    // Si es efectivo, tarjeta, qr o transferencia: registrar movimiento en caja
    if (['efectivo', 'tarjeta', 'qr', 'transferencia'].includes(tipo_pago)) {
      const [cajas] = await conn.query('SELECT id FROM caja WHERE cierre IS NULL ORDER BY fecha DESC LIMIT 1');
      
      if (cajas && cajas.length > 0) {
        await conn.query(
          'INSERT INTO movimientos_caja (caja_id, descripcion, monto, tipo) VALUES (?, ?, ?, ?)',
          [cajas[0].id, `Alquiler dispenser - Pago ID ${id}`, pago.monto, 'entrada']
        );
      }
    }
    
    await conn.commit();
    res.json({ message: 'Pago registrado exitosamente' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// POST /api/pagos-alquiler/generar-mensuales -> generar pagos mensuales (ejecutar 1 vez al mes)
router.post('/pagos-alquiler/generar-mensuales', async (req, res) => {
  const { mes } = req.body; // formato: YYYY-MM
  
  if (!mes || !/^\d{4}-\d{2}$/.test(mes)) {
    return res.status(400).json({ error: 'Formato de mes inválido (use YYYY-MM)' });
  }
  
  const conn = await pool.promise().getConnection();
  try {
    await conn.beginTransaction();
    
    // Obtener alquileres activos
    const [alquileres] = await conn.query('SELECT * FROM alquileres_dispenser WHERE estado = "activo"');
    
    let generados = 0;
    let ya_existentes = 0;
    
    for (const alquiler of alquileres) {
      const mes_cobro = `${mes}-01`;
      
      // Verificar si ya existe el pago para este mes
      const [existentes] = await conn.query(
        'SELECT id FROM pagos_alquiler WHERE alquiler_id = ? AND mes_cobro = ?',
        [alquiler.id, mes_cobro]
      );
      
      if (existentes && existentes.length > 0) {
        ya_existentes++;
        continue;
      }
      
      // Calcular fecha de vencimiento
      const [anio, mes_num] = mes.split('-');
      const fecha_vencimiento = new Date(parseInt(anio), parseInt(mes_num) - 1, alquiler.dia_cobro);
      
      // Crear pago
      await conn.query(
        'INSERT INTO pagos_alquiler (alquiler_id, mes_cobro, monto, fecha_vencimiento, estado) VALUES (?, ?, ?, ?, ?)',
        [alquiler.id, mes_cobro, alquiler.precio_mensual, fecha_vencimiento.toISOString().split('T')[0], 'pendiente']
      );
      
      generados++;
    }
    
    await conn.commit();
    res.json({ 
      message: 'Pagos mensuales generados', 
      generados, 
      ya_existentes,
      total_alquileres: alquileres.length 
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// ========== MANTENIMIENTOS ==========

// POST /api/mantenimientos -> registrar mantenimiento
router.post('/mantenimientos', async (req, res) => {
  const { dispenser_id, fecha_mantenimiento, tipo, descripcion, costo, realizado_por, usuario_registro_id } = req.body;
  
  if (!dispenser_id || !fecha_mantenimiento || !tipo || !descripcion) {
    return res.status(400).json({ error: 'Faltan datos requeridos' });
  }
  
  if (!['preventivo', 'correctivo', 'instalacion', 'retiro'].includes(tipo)) {
    return res.status(400).json({ error: 'Tipo de mantenimiento inválido' });
  }
  
  try {
    const result = await query(
      'INSERT INTO mantenimientos_dispenser (dispenser_id, fecha_mantenimiento, tipo, descripcion, costo, realizado_por, usuario_registro_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [dispenser_id, fecha_mantenimiento, tipo, descripcion, costo || 0, realizado_por || null, usuario_registro_id || null]
    );
    
    res.status(201).json({ message: 'Mantenimiento registrado', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/mantenimientos -> listar mantenimientos
router.get('/mantenimientos', async (req, res) => {
  const { dispenser_id } = req.query;
  try {
    let query_str = `
      SELECT m.*, d.codigo as dispenser_codigo, d.marca, d.modelo
      FROM mantenimientos_dispenser m
      JOIN dispensers d ON m.dispenser_id = d.id
    `;
    let params = [];
    
    if (dispenser_id) {
      query_str += ' WHERE m.dispenser_id = ?';
      params.push(dispenser_id);
    }
    
    query_str += ' ORDER BY m.fecha_mantenimiento DESC';
    
    const mantenimientos = await query(query_str, params);
    res.json({ mantenimientos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== REPORTES ==========

// GET /api/alquileres/reporte/resumen -> resumen general
router.get('/alquileres/reporte/resumen', async (req, res) => {
  try {
    const total_dispensers = await query('SELECT COUNT(*) as total FROM dispensers');
    const disponibles = await query('SELECT COUNT(*) as total FROM dispensers WHERE estado = "disponible"');
    const alquilados = await query('SELECT COUNT(*) as total FROM dispensers WHERE estado = "alquilado"');
    const mantenimiento = await query('SELECT COUNT(*) as total FROM dispensers WHERE estado = "mantenimiento"');
    
    const alquileres_activos = await query('SELECT COUNT(*) as total FROM alquileres_dispenser WHERE estado = "activo"');
    
    const pagos_pendientes = await query(`
      SELECT COUNT(*) as total, SUM(monto) as monto_total 
      FROM pagos_alquiler 
      WHERE estado = 'pendiente'
    `);
    
    const pagos_vencidos = await query(`
      SELECT COUNT(*) as total, SUM(monto) as monto_total 
      FROM pagos_alquiler 
      WHERE estado = 'pendiente' AND fecha_vencimiento < CURDATE()
    `);
    
    const ingresos_mes = await query(`
      SELECT SUM(monto) as total 
      FROM pagos_alquiler 
      WHERE estado = 'pagado' 
        AND MONTH(fecha_pago) = MONTH(CURDATE()) 
        AND YEAR(fecha_pago) = YEAR(CURDATE())
    `);
    
    res.json({
      dispensers: {
        total: total_dispensers[0].total,
        disponibles: disponibles[0].total,
        alquilados: alquilados[0].total,
        en_mantenimiento: mantenimiento[0].total
      },
      alquileres: {
        activos: alquileres_activos[0].total
      },
      pagos: {
        pendientes_count: pagos_pendientes[0].total || 0,
        pendientes_monto: parseFloat(pagos_pendientes[0].monto_total || 0),
        vencidos_count: pagos_vencidos[0].total || 0,
        vencidos_monto: parseFloat(pagos_vencidos[0].monto_total || 0)
      },
      ingresos: {
        mes_actual: parseFloat(ingresos_mes[0].total || 0)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

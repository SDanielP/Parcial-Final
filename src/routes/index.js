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
    
    // Registrar los pagos (puede ser 1 o más)
    for (const pago of pagos) {
      await conn.query('INSERT INTO pagos (venta_id, tipo_pago, monto) VALUES (?, ?, ?)', [ventaId, pago.tipo_pago, pago.monto]);
      
      // Si es cuenta corriente, crear registro en cuentas_corrientes
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

    // intentar registrar movimiento en caja actual (si existe)
    let movimientoInserted = false
    let movimientoId = null
    let cajaUsedId = null
    try{
      const [rows] = await conn.query('SELECT id FROM caja WHERE cierre IS NULL ORDER BY fecha DESC LIMIT 1')
      const cajaRow = rows && rows[0] ? rows[0] : null
      if (cajaRow && cajaRow.id){
        const cajaId = cajaRow.id
        cajaUsedId = cajaId
        const [movRes] = await conn.query('INSERT INTO movimientos_caja (caja_id, descripcion, monto, tipo) VALUES (?, ?, ?, ?)', [cajaId, `Venta #${ventaId}`, total, 'entrada'])
        movimientoInserted = Boolean(movRes && movRes.insertId)
        movimientoId = movRes.insertId
      }
    }catch(errMov){
      // loguear el error y continuar (no hacer rollback de la venta)
      console.error('Error registrando movimiento de caja para la venta', errMov)
    }
    await conn.commit();
  console.log('Venta registrada:', { ventaId, movimientoInserted, movimientoId, cajaId: cajaUsedId, pedidoInserted, pedidoId })
  res.status(201).json({ message: 'Venta registrada', ventaId, movimientoInserted, movimientoId, cajaId: cajaUsedId, pedidoInserted, pedidoId });
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

module.exports = router;

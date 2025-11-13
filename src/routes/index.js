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
// GET /api/productos -> list products
router.get('/productos', async (req, res) => {
  try {
    const products = await query('SELECT id, nombre, descripcion, precio, stock, creado_en FROM productos ORDER BY nombre');
    res.json({ productos: products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/productos -> add product
// body: { nombre, descripcion, precio, stock }
router.post('/productos', async (req, res) => {
  const { nombre, descripcion, precio, stock } = req.body;
  if (!nombre || precio == null) return res.status(400).json({ error: 'Faltan datos requeridos' });
  try {
    const result = await query('INSERT INTO productos (nombre, descripcion, precio, stock) VALUES (?, ?, ?, ?)', [nombre, descripcion || '', precio, stock || 0]);
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
      const rows = await query('SELECT id, nombre, telefono, direccion, creado_en FROM clientes ORDER BY creado_en DESC LIMIT 100');
      return res.json({ clientes: rows });
    }
    const like = `%${q}%`;
    // Buscar por nombre o telefono (compatibilizar si no existe columna email)
    const rows = await query('SELECT id, nombre, telefono, direccion FROM clientes WHERE nombre LIKE ? OR telefono LIKE ? ORDER BY nombre LIMIT 50', [like, like]);
    res.json({ clientes: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/clientes -> crear cliente
// body: { nombre, telefono, email, direccion }
router.post('/clientes', async (req, res) => {
  // Compatibilidad: la tabla 'clientes' puede no tener columna email.
  const { nombre, telefono, email, direccion } = req.body;
  if (!nombre || !direccion) return res.status(400).json({ error: 'Faltan datos de cliente (nombre y direccion requeridos para envíos)' });
  try {
    // Insert compatible con tu tabla actual (nombre, telefono, direccion)
    const result = await query('INSERT INTO clientes (nombre, telefono, direccion) VALUES (?, ?, ?)', [nombre, telefono || '', direccion]);
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
    const rows = await query(`SELECT p.*, c.id AS cliente_id, c.nombre AS cliente_nombre, c.telefono, v.total
      FROM pedidos p
      LEFT JOIN clientes c ON p.cliente_id = c.id
      LEFT JOIN ventas v ON p.venta_id = v.id
      WHERE p.id = ? LIMIT 1`, [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Pedido no encontrado' });
    const pedido = rows[0]
    pedido.fecha = pedido.fecha || pedido.fecha_pedido || null
    res.json({ pedido });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/productos/:id -> update product
router.put('/productos/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, precio, stock } = req.body;
  if (!nombre || precio == null || stock == null) return res.status(400).json({ error: 'Faltan datos requeridos' });
  try {
    await query('UPDATE productos SET nombre = ?, descripcion = ?, precio = ?, stock = ? WHERE id = ?', [nombre, descripcion || '', precio, stock, id]);
    res.json({ message: 'Producto actualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ventas endpoints
// POST /api/ventas -> create a sale
// body: { usuario_id, items: [{ producto_id, cantidad, precio_unitario }], envio: { enabled: boolean, cliente_id, direccion, cliente: { nombre, telefono } } }
router.post('/ventas', async (req, res) => {
  const { usuario_id, items, envio } = req.body;
  if (!usuario_id || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Faltan datos de la venta' });
  const conn = await pool.promise().getConnection();
  try {
    await conn.beginTransaction();
    let total = 0;
    for (const it of items) {
      total += Number(it.precio_unitario) * Number(it.cantidad);
    }
  const [ventaResult] = await conn.query('INSERT INTO ventas (total, usuario_id) VALUES (?, ?)', [total, usuario_id]);
    const ventaId = ventaResult.insertId;
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

// GET /api/ventas -> list ventas with total and date
router.get('/ventas', async (req, res) => {
  try {
    const ventas = await query('SELECT v.id, v.fecha, v.total, u.usuario as vendedor FROM ventas v LEFT JOIN usuarios u ON v.usuario_id = u.id ORDER BY v.fecha DESC');
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

module.exports = router;

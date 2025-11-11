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
// Expected body: { nombre, usuario, password, rol }
router.post('/register', async (req, res) => {
  const { nombre, usuario, password, rol } = req.body;
  if (!usuario || !password || !nombre) {
    return res.status(400).json({ error: 'Faltan datos requeridos' });
  }
  try {
    const existing = await query('SELECT id FROM usuarios WHERE usuario = ?', [usuario]);
    if (existing.length > 0) return res.status(409).json({ error: 'El usuario ya existe' });

    const hashedPassword = await bcrypt.hash(password, 10);
    await query('INSERT INTO usuarios (nombre, usuario, password, rol) VALUES (?, ?, ?, ?)', [nombre, usuario, hashedPassword, rol || 'vendedor']);
    res.status(201).json({ message: 'Usuario registrado correctamente' });
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
    res.json({ message: 'Login exitoso', user: { id: user.id, nombre: user.nombre, usuario: user.usuario, rol: user.rol } });
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
// body: { usuario_id, items: [{ producto_id, cantidad, precio_unitario }] }
router.post('/ventas', async (req, res) => {
  const { usuario_id, items } = req.body;
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
    console.log('Venta registrada:', { ventaId, movimientoInserted, movimientoId, cajaId: cajaUsedId })
    res.status(201).json({ message: 'Venta registrada', ventaId, movimientoInserted, movimientoId, cajaId: cajaUsedId });
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

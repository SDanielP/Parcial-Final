// ============================================
// ENDPOINTS PARA ALQUILER DE DISPENSERS
// Agregar al archivo src/routes/index.js
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
              c.nombre as cliente_nombre, c.telefono as cliente_telefono, c.direccion as cliente_direccion, c.email as cliente_email
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
    const [total_dispensers] = await query('SELECT COUNT(*) as total FROM dispensers');
    const [disponibles] = await query('SELECT COUNT(*) as total FROM dispensers WHERE estado = "disponible"');
    const [alquilados] = await query('SELECT COUNT(*) as total FROM dispensers WHERE estado = "alquilado"');
    const [mantenimiento] = await query('SELECT COUNT(*) as total FROM dispensers WHERE estado = "mantenimiento"');
    
    const [alquileres_activos] = await query('SELECT COUNT(*) as total FROM alquileres_dispenser WHERE estado = "activo"');
    
    const [pagos_pendientes] = await query(`
      SELECT COUNT(*) as total, SUM(monto) as monto_total 
      FROM pagos_alquiler 
      WHERE estado = 'pendiente'
    `);
    
    const [pagos_vencidos] = await query(`
      SELECT COUNT(*) as total, SUM(monto) as monto_total 
      FROM pagos_alquiler 
      WHERE estado = 'pendiente' AND fecha_vencimiento < CURDATE()
    `);
    
    const [ingresos_mes] = await query(`
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

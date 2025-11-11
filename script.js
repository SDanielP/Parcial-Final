// Clean single-file frontend script for Negocio admin system

const API_BASE_URL = 'http://localhost:3000/api'

// DOM refs
const refs = {
  loginBtn: document.getElementById('loginBtn'),
  registerBtn: document.getElementById('registerBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
  showRegisterLink: document.getElementById('showRegister'),
  showLoginLink: document.getElementById('showLogin'),
  ventasMenuBtn: document.getElementById('ventasMenuBtn'),
  ventasSubmenu: document.getElementById('ventasSubmenu'),
  stockMenuBtn: document.getElementById('stockMenuBtn'),
  stockSubmenu: document.getElementById('stockSubmenu'),
  cajaMenuBtn: document.getElementById('cajaMenuBtn'),
  cajaSubmenu: document.getElementById('cajaSubmenu'),
  welcomeSection: document.getElementById('welcomeSection'),
  loginSection: document.getElementById('loginSection'),
  registerSection: document.getElementById('registerSection'),
  dashboardSection: document.getElementById('dashboardSection'),
  loginForm: document.getElementById('loginForm'),
  registerForm: document.getElementById('registerForm'),
  messageDiv: document.getElementById('message'),
  userWelcome: document.getElementById('userWelcome'),
  mainMenu: document.getElementById('mainMenu'),
  newSaleSection: document.getElementById('newSaleSection'),
  salesHistorySection: document.getElementById('salesHistorySection'),
  productsSection: document.getElementById('productsSection'),
  addProductSection: document.getElementById('addProductSection'),
  stockReportsSection: document.getElementById('stockReportsSection'),
  cajaSection: document.getElementById('cajaSection'),
  // product search elements will be created dynamically
  productSearchContainer: null,
  productSearchInput: null,
  productSearchResults: null,
  newSaleForm: document.getElementById('newSaleForm'),
  saleProductsContainer: document.getElementById('saleProductsContainer'),
  addSaleItemBtn: document.getElementById('addSaleItemBtn'),
  saleTotal: null,
  salesTable: document.getElementById('salesTable'),
  productsTable: document.getElementById('productsTable'),
  addProductForm: document.getElementById('addProductForm'),
  lowStockReport: document.getElementById('lowStockReport'),
  openCajaForm: document.getElementById('openCajaForm'),
  closeCajaForm: document.getElementById('closeCajaForm'),
  movimientoForm: document.getElementById('movimientoForm'),
  movementsList: document.getElementById('movementsList'),
  navMenu: document.querySelector('.nav-menu')
}

let currentUser = null
let productsCache = []
let userDropdown = null

function init() {
  const ud = localStorage.getItem('userData')
  if (ud) {
    try { currentUser = JSON.parse(ud) } catch(e){ currentUser = null }
    if (currentUser) showDashboard()
    else showWelcome()
  } else showWelcome()
  attachListeners()
  // Initialize caja menu state (shows if caja is open)
  updateCajaMenuState()
}

function attachListeners(){
  refs.loginBtn?.addEventListener('click', showLogin)
  refs.registerBtn?.addEventListener('click', showRegister)
  refs.logoutBtn?.addEventListener('click', logout)

  refs.showRegisterLink?.addEventListener('click', (e)=>{ e.preventDefault(); showRegister() })
  refs.showLoginLink?.addEventListener('click', (e)=>{ e.preventDefault(); showLogin() })

  document.getElementById('newSaleLink')?.addEventListener('click', (e)=>{ e.preventDefault(); showSection(refs.newSaleSection); ensureProductsLoaded(); ensureProductSearch() })
    document.getElementById('salesHistoryLink')?.addEventListener('click', (e)=>{
    e.preventDefault()
    showSection(refs.salesHistorySection)
    // Establecer la fecha actual en el input
    const dateInput = document.getElementById('salesDate')
    if (dateInput) {
      const today = new Date().toISOString().slice(0,10)
      dateInput.value = today
      loadSales(today)
    } else {
      loadSales()
    }
  })
  document.getElementById('productsLink')?.addEventListener('click', (e)=>{ e.preventDefault(); showSection(refs.productsSection); loadProducts() })
  document.getElementById('addProductLink')?.addEventListener('click', (e)=>{ e.preventDefault(); showSection(refs.addProductSection) })
  document.getElementById('stockReportsLink')?.addEventListener('click', (e)=>{ e.preventDefault(); showSection(refs.stockReportsSection); generateLowStockReport() })
  // Caja submenu links -> show specific internal panels
  document.getElementById('cajaOpenLink')?.addEventListener('click', async (e)=>{ e.preventDefault(); await showCajaPanel('apertura') })
  document.getElementById('cajaCloseLink')?.addEventListener('click', async (e)=>{ e.preventDefault(); await showCajaPanel('cierre') })
  document.getElementById('cajaMovementsLink')?.addEventListener('click', async (e)=>{ e.preventDefault(); await showCajaPanel('movimientos') })

  refs.loginForm?.addEventListener('submit', handleLogin)
  refs.registerForm?.addEventListener('submit', handleRegister)
  refs.addProductForm?.addEventListener('submit', handleAddProduct)
  refs.newSaleForm?.addEventListener('submit', handleNewSale)
  refs.addSaleItemBtn?.addEventListener('click', (e)=>{ e.preventDefault(); ensureProductSearch(); refs.productSearchInput?.focus(); renderSearchResults('') })
  refs.openCajaForm?.addEventListener('submit', handleOpenCaja)
  refs.closeCajaForm?.addEventListener('submit', handleCloseCaja)
  refs.movimientoForm?.addEventListener('submit', handleMovimiento)

    // Submenu toggles
  refs.ventasMenuBtn?.addEventListener('click', (e)=>{
    e.stopPropagation()
    const isVisible = refs.ventasSubmenu?.style.display === 'flex'
    closeAllSubmenus()
    if (!isVisible && refs.ventasSubmenu) {
      refs.ventasSubmenu.style.display = 'flex'
    }
  })
  
  refs.stockMenuBtn?.addEventListener('click', (e)=>{
    e.stopPropagation()
    const isVisible = refs.stockSubmenu?.style.display === 'flex'
    closeAllSubmenus()
    if (!isVisible && refs.stockSubmenu) {
      refs.stockSubmenu.style.display = 'flex'
    }
  })
  
  refs.cajaMenuBtn?.addEventListener('click', (e)=>{
    e.stopPropagation()
    const isVisible = refs.cajaSubmenu?.style.display === 'flex'
    closeAllSubmenus()
    if (!isVisible && refs.cajaSubmenu) {
      refs.cajaSubmenu.style.display = 'flex'
    }
  })

  // Ventas history date search
  document.getElementById('searchSalesBtn')?.addEventListener('click', () => {
    const dateInput = document.getElementById('salesDate')
    if (dateInput) {
      loadSales(dateInput.value)
    }
  })

  // Close submenus on outside click
  document.addEventListener('click', (e) => {
    // Si el click fue en un enlace del submenú, cerrar después de la navegación
    if (e.target.closest('#ventasSubmenu a, #stockSubmenu a, #cajaSubmenu a')) {
      setTimeout(closeAllSubmenus, 100)
      return
    }

    // Si el click no fue en un botón de menú ni dentro de un submenú, cerrar todos
    const isMenuBtn = e.target.closest('#ventasMenuBtn, #stockMenuBtn, #cajaMenuBtn')
    const isSubmenu = e.target.closest('#ventasSubmenu, #stockSubmenu, #cajaSubmenu')
    
    if (!isMenuBtn && !isSubmenu) {
      closeAllSubmenus()
    }
  })
}

// Show specific panel inside cajaSection: 'apertura' | 'cierre' | 'movimientos'
async function showCajaPanel(panel){
  // ensure caja section is visible
  showSection(refs.cajaSection)
  
  // prepare caja data and wait for it to complete
  await prepareCajaSection()
  
  const apertura = document.getElementById('cajaAperturaPanel')
  const cierre = document.getElementById('cajaCierrePanel')
  const movimientos = document.getElementById('cajaMovimientosPanel')
  
  if (apertura) apertura.style.display = 'none'
  if (cierre) cierre.style.display = 'none'
  if (movimientos) movimientos.style.display = 'none'
  
  if (panel === 'apertura' && apertura) apertura.style.display = 'block'
  if (panel === 'cierre' && cierre) cierre.style.display = 'block'
  if (panel === 'movimientos' && movimientos) {
    movimientos.style.display = 'block'
    // Obtener la caja actual directamente
    const caja = await getCajaActual()
    if (caja && caja.id) {
      console.log('Cargando movimientos de caja:', caja.id)
      loadMovements(caja.id)
    } else {
      console.log('No hay caja abierta para mostrar movimientos')
      if (refs.movementsList) {
        refs.movementsList.innerHTML = '<div class="dashboard-card" style="text-align: center; padding: 20px;">No hay caja abierta</div>'
      }
    }
  }
}

// Update the caja menu button state depending on whether a caja is open
async function updateCajaMenuState(){
  try{
    const caja = await getCajaActual()
    if (!refs.cajaMenuBtn) return
    if (caja){
      refs.cajaMenuBtn.textContent = 'Caja (Abierta) ▾'
      // Disable apertura link
      const openLink = document.getElementById('cajaOpenLink')
      if (openLink) { openLink.classList.add('disabled'); openLink.style.pointerEvents = 'none'; openLink.style.opacity = '0.5' }
    } else {
      refs.cajaMenuBtn.textContent = 'Caja ▾'
      const openLink = document.getElementById('cajaOpenLink')
      if (openLink) { openLink.classList.remove('disabled'); openLink.style.pointerEvents = ''; openLink.style.opacity = '' }
    }
  }catch(err){ console.error('updateCajaMenuState error', err) }
}

function closeAllSubmenus(){
  if (refs.ventasSubmenu) refs.ventasSubmenu.style.display = 'none'
  if (refs.stockSubmenu) refs.stockSubmenu.style.display = 'none'
  if (refs.cajaSubmenu) refs.cajaSubmenu.style.display = 'none'
}

function hideAllSections(){
  // Hide known sections
  const sections = ['welcomeSection','loginSection','registerSection','dashboardSection','newSaleSection','salesHistorySection','productsSection','addProductSection','stockReportsSection','cajaSection']
  sections.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none' })
}
function showSection(el){ if (!el) return; hideAllSections(); el.style.display = 'block'; if (el === refs.newSaleSection){ ensureProductSearch(); ensureProductsLoaded() } }

// When showing caja section, prefill caja-related fields
async function prepareCajaSection(){
  const caja = await getCajaActual()
  const ultima = await getUltimaCaja()
  // Apertura: min date = today
  const openFecha = document.getElementById('openFecha')
  const today = new Date().toISOString().slice(0,10)
  if (openFecha) { openFecha.min = today; openFecha.value = today }
  // show saldo previo = diferencia entre cierre y neto de movimientos de la caja anterior
  const saldoPrevio = document.getElementById('openSaldoPrevio')
  if (saldoPrevio && ultima && ultima.id) {
    try {
      // Pedir detalle de la última caja
      const res = await fetch(`${API_BASE_URL}/caja/${ultima.id}/detalle`)
      if (res.ok) {
        const data = await res.json()
        // diferencia = cierre - esperado (apertura + entradas - salidas)
        let cierre = Number(data.caja.cierre)
        let esperado = Number(data.totales.expected_final)
        let diferencia = cierre - esperado
        saldoPrevio.value = diferencia.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })
      } else {
        saldoPrevio.value = (ultima.cierre != null) ? Number(ultima.cierre).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }) : '$0.00'
      }
    } catch (err) {
      saldoPrevio.value = (ultima.cierre != null) ? Number(ultima.cierre).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' }) : '$0.00'
    }
  } else if (saldoPrevio) {
    saldoPrevio.value = '$0.00'
  }

  // Close and movimiento: if caja actual exists, show it; otherwise clear
  const closeDisplay = document.getElementById('closeCajaDisplay')
  const closeId = document.getElementById('closeCajaId')
  const movDisplay = document.getElementById('movimientoCajaDisplay')
  const movId = document.getElementById('movimientoCajaId')
  if (caja){
    if (closeDisplay) closeDisplay.value = `Caja #${caja.id} - abierta desde ${new Date(caja.fecha).toLocaleString()}`
    if (closeId) closeId.value = caja.id
    if (movDisplay) movDisplay.value = `Caja #${caja.id}`
    if (movId) movId.value = caja.id
  } else {
    if (closeDisplay) closeDisplay.value = 'No hay caja abierta'
    if (closeId) closeId.value = ''
    if (movDisplay) movDisplay.value = 'No hay caja abierta'
    if (movId) movId.value = ''
  }
}
function showWelcome(){ hideAllSections(); refs.welcomeSection && (refs.welcomeSection.style.display='block'); updateNav() }
function showLogin(){ hideAllSections(); refs.loginSection && (refs.loginSection.style.display='block'); updateNav('login') }
function showRegister(){ hideAllSections(); refs.registerSection && (refs.registerSection.style.display='block'); updateNav('register') }
function showDashboard(){ hideAllSections(); refs.dashboardSection && (refs.dashboardSection.style.display='block'); updateNav(); showUserMenu(); if (currentUser) refs.userWelcome && (refs.userWelcome.textContent = `Selecciona para comenzar tus actividades, ${currentUser.nombre || currentUser.usuario}`) }

function updateNav(active){
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'))
  if (currentUser){
    refs.loginBtn && (refs.loginBtn.style.display='none')
    refs.registerBtn && (refs.registerBtn.style.display='none')
    refs.logoutBtn && (refs.logoutBtn.style.display='inline-block')
    refs.mainMenu && (refs.mainMenu.style.display='flex')
  } else {
    refs.loginBtn && (refs.loginBtn.style.display='inline-block')
    refs.registerBtn && (refs.registerBtn.style.display='inline-block')
    refs.logoutBtn && (refs.logoutBtn.style.display='none')
    refs.mainMenu && (refs.mainMenu.style.display='none')
    if (active==='login') refs.loginBtn && refs.loginBtn.classList.add('active')
    if (active==='register') refs.registerBtn && refs.registerBtn.classList.add('active')
  }
}

function ensureProductsLoaded(){ if (!productsCache || productsCache.length===0) loadProducts() }

// Caja helpers
async function getCajaActual(){
  try{
    const res = await fetch(`${API_BASE_URL}/caja/actual`)
    if (!res.ok) {
      const txt = await res.text()
      console.error('GET /caja/actual returned', res.status, res.statusText, 'body:', txt)
      return null
    }
    const data = await res.json()
    console.log('getCajaActual ->', data)
    return data && data.caja ? data.caja : null
  }catch(err){ console.error('No se pudo obtener caja actual', err); return null }
}

async function getUltimaCaja(){
  try{ const res = await fetch(`${API_BASE_URL}/caja/ultima`); const data = await res.json(); return data.caja || null }catch(err){ console.error('No se pudo obtener ultima caja', err); return null }
}

function ensureSaleTotalElement(){
  if (!refs.saleTotal){
    const el = document.createElement('div')
    el.id = 'saleTotal'
    el.style.marginTop = '12px'
    el.innerHTML = '<strong>Total: </strong><span id="saleTotalValue">$0.00</span>'
    refs.newSaleForm?.appendChild(el)
    refs.saleTotal = el
  }
}

function ensureProductSearch(){
  if (!refs.productSearchContainer && refs.newSaleForm){
    const wrapper = document.createElement('div')
    wrapper.className = 'product-search'
    const input = document.createElement('input')
    input.type = 'search'
    input.placeholder = 'Buscar producto por nombre...'
    input.id = 'productSearchInput'
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'auth-btn'
    btn.textContent = 'Buscar'
    wrapper.appendChild(input)
    wrapper.appendChild(btn)

    const results = document.createElement('div')
    results.className = 'search-results'
    results.id = 'productSearchResults'

    refs.newSaleForm.insertBefore(wrapper, refs.newSaleForm.firstChild)
    refs.newSaleForm.insertBefore(results, wrapper.nextSibling)

    refs.productSearchContainer = wrapper
    refs.productSearchInput = input
    refs.productSearchResults = results

    // events
    input.addEventListener('input', ()=>{ renderSearchResults(input.value) })
    btn.addEventListener('click', ()=>{ renderSearchResults(input.value) })
  }
}

function renderSearchResults(q){
  if (!refs.productSearchResults) return
  const term = (q||'').trim().toLowerCase()
  refs.productSearchResults.innerHTML = ''
  // If empty term, show the first 20 products as suggestions
  const matches = term ? productsCache.filter(p=>p.nombre.toLowerCase().includes(term)) : (productsCache.slice(0,20))
  if (matches.length === 0){ refs.productSearchResults.innerHTML = '<div class="search-item">No se encontraron productos</div>'; return }
  matches.slice(0,50).forEach(p=>{
    const div = document.createElement('div')
    div.className = 'search-item'
    div.innerHTML = `<div>${p.nombre} <small style="color:#64748b; margin-left:8px;">$${Number(p.precio).toFixed(2)} | Stock: ${p.stock}</small></div>`
    const addBtn = document.createElement('button')
    addBtn.type = 'button'
    addBtn.textContent = 'Agregar'
    addBtn.disabled = p.stock <= 0;
    addBtn.title = p.stock <= 0 ? 'Sin stock disponible' : 'Agregar a la venta';
    addBtn.addEventListener('click', ()=>{ addProductToSale(p); refs.productSearchInput.value = ''; refs.productSearchResults.innerHTML = '' })
    div.appendChild(addBtn)
    refs.productSearchResults.appendChild(div)
  })
}

function addProductToSale(product){
  // Create a sale row with this product selected and cantidad=1
  if (!productsCache) productsCache = [];
  // ensure product is in cache
  if (!productsCache.find(x=>x.id===product.id)) productsCache.push(product);
  // If product already exists in sale, increase quantity by 1, pero no más que el stock
  const existingRow = [...refs.saleProductsContainer.querySelectorAll('.sale-item')].find(r => Number(r.querySelector('select').value) === product.id);
  if (existingRow){
    const qtyInput = existingRow.querySelector('input[name="cantidad"]');
    let currentQty = Number(qtyInput.value || 0);
    if (currentQty < product.stock) {
      qtyInput.value = currentQty + 1;
      qtyInput.dispatchEvent(new Event('input'));
    } else {
      showMessage('No hay suficiente stock para agregar más unidades','error');
    }
    return;
  }

  // create row (grid columns: producto, cantidad, precio, subtotal, eliminar)
  const row = document.createElement('div');
  row.className = 'sale-item';
  row.style.display = 'grid';
  row.style.gridTemplateColumns = '2fr 1fr 1fr 1fr 40px';
  row.style.gap = '8px';
  row.style.alignItems = 'center';
  row.style.padding = '8px 12px';
  row.style.borderBottom = '1px solid #e2e8f0';
  row.style.background = 'white';

  // Producto (nombre, select deshabilitado)
  const prodSelect = document.createElement('select');
  productsCache.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.nombre;
    if (p.id === product.id) opt.selected = true;
    prodSelect.appendChild(opt);
  });
  prodSelect.disabled = true;
  prodSelect.style.background = '#f1f5f9';
  prodSelect.style.cursor = 'not-allowed';

  // Cantidad
  const qtyInput = document.createElement('input');
  qtyInput.type = 'number';
  qtyInput.min = 1;
  qtyInput.max = product.stock;
  qtyInput.value = 1;
  qtyInput.name = 'cantidad';
  qtyInput.style.textAlign = 'center';
  qtyInput.style.width = '60px';
  qtyInput.style.justifySelf = 'center';

  // Precio unitario (readonly, centrado)
  const priceInput = document.createElement('input');
  priceInput.type = 'number';
  priceInput.value = product.precio;
  priceInput.readOnly = true;
  priceInput.style.background = '#f1f5f9';
  priceInput.style.cursor = 'not-allowed';
  priceInput.style.textAlign = 'center';
  priceInput.style.width = '80px';
  priceInput.style.justifySelf = 'center';

  // Subtotal (span, centrado)
  const subtotalSpan = document.createElement('span');
  subtotalSpan.className = 'line-subtotal';
  subtotalSpan.style.textAlign = 'center';
  subtotalSpan.style.justifySelf = 'center';
  subtotalSpan.textContent = `$${(product.precio * 1).toFixed(2)}`;

  // Eliminar botón
  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'remove-item-btn';
  removeBtn.textContent = '✕';
  removeBtn.title = 'Quitar producto';

  // Eventos
  qtyInput.addEventListener('input', () => {
    let qty = Number(qtyInput.value);
    if (isNaN(qty) || qty < 1) qty = 1;
    if (qty > product.stock) {
      qty = product.stock;
      showMessage('No hay suficiente stock','error');
    }
    qtyInput.value = qty;
    subtotalSpan.textContent = `$${(qty * product.precio).toFixed(2)}`;
    computeSaleTotal();
  });
  removeBtn.addEventListener('click', () => {
    row.remove();
    computeSaleTotal();
  });

  row.appendChild(prodSelect);
  row.appendChild(qtyInput);
  row.appendChild(priceInput);
  row.appendChild(subtotalSpan);
  row.appendChild(removeBtn);

  refs.saleProductsContainer.appendChild(row);
  computeSaleTotal();
}


// Auth handlers
async function handleLogin(e){
  e.preventDefault()
  const fd = new FormData(refs.loginForm)
  const payload = { usuario: fd.get('email') || fd.get('usuario'), password: fd.get('password') }
  try{
    showMessage('Iniciando sesión...','info')
    const res = await fetch(`${API_BASE_URL}/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
    const data = await res.json()
    if (res.ok){
      currentUser = data.user
      localStorage.setItem('userData', JSON.stringify(currentUser))
      showMessage('Login exitoso','success')
      showDashboard()
      loadProducts()
      loadSales()
    } else showMessage(data.error || 'Error en login','error')
  }catch(err){ console.error(err); showMessage('Error de red','error') }
}

async function handleRegister(e){
  e.preventDefault()
  const fd = new FormData(refs.registerForm)
  const nombre = fd.get('name')
  const usuario = fd.get('email') || fd.get('name')
  const password = fd.get('password')
  const confirm = fd.get('confirmPassword')
  if (password !== confirm) return showMessage('Las contraseñas no coinciden','error')
  try{
    const payload = { nombre, usuario, password }
    const res = await fetch(`${API_BASE_URL}/register`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
    const data = await res.json()
    if (res.ok){ showMessage('Registro exitoso, por favor inicia sesión','success'); setTimeout(()=>showLogin(),1200) } else showMessage(data.error || 'Error en registro','error')
  }catch(err){ console.error(err); showMessage('Error de red','error') }
}

function logout(){ localStorage.removeItem('userData'); currentUser = null; updateNav(); showWelcome(); showMessage('Sesión cerrada','success') }

// Products
async function loadProducts(){
  try{
    const res = await fetch(`${API_BASE_URL}/productos`)
    const data = await res.json()
    productsCache = data.productos || []
    if (!refs.productsTable) return
    const tbody = refs.productsTable.querySelector('tbody')
    tbody.innerHTML = ''
    productsCache.forEach(p => {
      const tr = document.createElement('tr')
      tr.innerHTML = `<td>${p.id}</td><td>${p.nombre}</td><td class="description">${p.descripcion||''}</td><td>${p.precio}</td><td>${p.stock}</td><td><button class="edit-btn" data-id="${p.id}">Editar</button></td>`
      tbody.appendChild(tr)
    })

    // attach edit handlers
    tbody.querySelectorAll('.edit-btn').forEach(btn=>{
      btn.addEventListener('click', (e)=>{
        const id = btn.dataset.id
        const p = productsCache.find(x=>String(x.id)===String(id))
        if (!p) return showMessage('Producto no encontrado','error')
        openEditModal(p)
      })
    })
  }catch(err){ console.error(err); showMessage('No se pudieron cargar productos','error') }
}

// Modal handlers
function openEditModal(product){
  const modal = document.getElementById('editProductModal')
  if (!modal) return
  document.getElementById('editProductId').value = product.id
  document.getElementById('editNombre').value = product.nombre || ''
  document.getElementById('editDescripcion').value = product.descripcion || ''
  document.getElementById('editPrecio').value = product.precio || 0
  document.getElementById('editStock').value = product.stock || 0
  modal.style.display = 'flex'
}

function closeEditModal(){
  const modal = document.getElementById('editProductModal')
  if (!modal) return
  modal.style.display = 'none'
}

document.addEventListener('DOMContentLoaded', ()=>{
  const editForm = document.getElementById('editProductForm')
  const cancelBtn = document.getElementById('cancelEditBtn')
  if (cancelBtn) cancelBtn.addEventListener('click', (e)=>{ e.preventDefault(); closeEditModal() })
  if (editForm){
    editForm.addEventListener('submit', async (e)=>{
      e.preventDefault()
      const id = document.getElementById('editProductId').value
      const payload = {
        nombre: document.getElementById('editNombre').value,
        descripcion: document.getElementById('editDescripcion').value,
        precio: Number(document.getElementById('editPrecio').value),
        stock: Number(document.getElementById('editStock').value)
      }
      try{
        const res = await fetch(`${API_BASE_URL}/productos/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
        const data = await res.json()
        if (res.ok){ showMessage('Producto actualizado','success'); closeEditModal(); loadProducts() } else showMessage(data.error || 'Error al actualizar producto','error')
      }catch(err){ console.error(err); showMessage('Error de red','error') }
    })
  }
})

async function handleAddProduct(e){
  e.preventDefault()
  const fd = new FormData(refs.addProductForm)
  const payload = { nombre: fd.get('nombre'), descripcion: fd.get('descripcion'), precio: Number(fd.get('precio')), stock: Number(fd.get('stock')) }
  try{
    const res = await fetch(`${API_BASE_URL}/productos`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
    const data = await res.json()
    if (res.ok){ showMessage('Producto agregado','success'); refs.addProductForm.reset(); loadProducts() } else showMessage(data.error || 'Error al agregar producto','error')
  }catch(err){ console.error(err); showMessage('Error de red','error') }
}

// Sales
function addSaleItemRow(){
  if (!productsCache) return
  // prevent adding items if no caja abierta
  // we allow adding UI items but block submit; check in handleNewSale
  const row = document.createElement('div')
  row.className = 'form-group sale-item'
  row.innerHTML = `<select name="producto_id" required>${productsCache.map(p=>`<option value="${p.id}" data-precio="${p.precio}">${p.nombre} - $${p.precio}</option>`).join('')}</select><input name="cantidad" type="number" value="1" min="1" required style="width:80px;margin-left:8px;"><span class="line-subtotal" style="margin-left:8px;">$0.00</span><button type="button" class="auth-btn remove-item-btn" style="margin-left:8px;">Eliminar</button>`
  refs.saleProductsContainer.appendChild(row)
  const select = row.querySelector('select')
  const qty = row.querySelector('input[name="cantidad"]')
  const subtotalSpan = row.querySelector('.line-subtotal')

  function updateLine(){
    const precio = Number(select.selectedOptions[0].dataset.precio || 0)
    const cantidad = Number(qty.value || 0)
    const sub = precio * cantidad
    subtotalSpan.textContent = `$${sub.toFixed(2)}`
    computeSaleTotal()
  }

  select.addEventListener('change', updateLine)
  qty.addEventListener('input', updateLine)
  row.querySelector('.remove-item-btn').addEventListener('click', ()=>{ row.remove(); computeSaleTotal() })
  ensureSaleTotalElement()
  updateLine()
}

async function handleNewSale(e){
  e.preventDefault()
  // verify caja abierta
  const caja = await getCajaActual()
  if (!caja) return showMessage('No hay caja abierta. Abre la caja antes de registrar ventas.','error')
  const rows = [...refs.saleProductsContainer.querySelectorAll('.sale-item')]
  if (rows.length === 0) return showMessage('Agrega al menos un producto','error')
  let valid = true;
  const items = rows.map(r => {
    const producto_id = Number(r.querySelector('select').value);
    const cantidad = Number(r.querySelector('input[name="cantidad"]').value);
    // Buscar stock actual
    const prod = productsCache.find(p=>p.id===producto_id);
    if (prod && cantidad > prod.stock) {
      valid = false;
    }
    // El precio unitario está en el input de precio (segundo input)
    const priceInput = r.querySelectorAll('input')[1];
    const precio_unitario = priceInput ? Number(priceInput.value) : 0;
    return { producto_id, cantidad, precio_unitario };
  });
  if (!valid) {
    showMessage('No puedes vender más unidades de las disponibles en stock','error');
    return;
  }
  const payload = { usuario_id: currentUser.id, items }
  try{
    const res = await fetch(`${API_BASE_URL}/ventas`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
    const data = await res.json()
    if (res.ok){
      showMessage('Venta registrada','success')
  refs.saleProductsContainer.innerHTML = ''
  computeSaleTotal();
  loadProducts()
  loadSales()
      // refresh caja state and movements: backend inserts movimiento automatically if a caja was open
      updateCajaMenuState()
      const resp = data || {}
      if (resp.movimientoInserted) {
        showMessage('Movimiento de caja registrado','success')
      } else if (resp.cajaId) {
        showMessage('Venta registrada, pero no se confirmó el movimiento en caja (revisa logs)','error')
      }
      const newCaja = await getCajaActual()
      if (newCaja) loadMovements(newCaja.id)
    } else showMessage(data.error || 'Error al registrar venta','error')
  }catch(err){ console.error(err); showMessage('Error de red','error') }
}

function computeSaleTotal(){
  const rows = [...refs.saleProductsContainer.querySelectorAll('.sale-item')];
  let total = 0;
  rows.forEach(r => {
    const qty = Number(r.querySelector('input[name="cantidad"]').value) || 0;
    // El precio unitario está en el input de precio (segundo input)
    const priceInput = r.querySelectorAll('input')[1];
    const price = priceInput ? Number(priceInput.value) : 0;
    total += qty * price;
    // El subtotal de la fila ya se actualiza en el evento input
  });
  const totalBox = document.querySelector('.sale-total-final');
  const totalEl = document.getElementById('saleTotalValue');
  if (rows.length === 0) {
    if (totalBox) totalBox.style.display = 'none';
  } else {
    if (totalBox) totalBox.style.display = 'flex';
    if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
  }
}

async function loadSales(date = null){
  try {
    if (!refs.salesTable) return
    const tbody = refs.salesTable.querySelector('tbody')
    if (!tbody) return

    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Cargando...</td></tr>'

    const res = await fetch(`${API_BASE_URL}/ventas`)
    if (!res.ok) {
      throw new Error(`Error HTTP al pedir /ventas: ${res.status}`)
    }

    const data = await res.json()
    const sales = data.ventas || []
    tbody.innerHTML = ''

    // Si se proporciona una fecha, filtrar por esa fecha
    let salesToShow = sales
    if (date) {
      salesToShow = sales.filter(sale => {
        const saleDate = new Date(sale.fecha).toISOString().split('T')[0]
        return saleDate === date
      })
    }

    if (salesToShow.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #64748b;">No hay ventas para mostrar</td></tr>'
      return
    }

    // Ordenar ventas por fecha, las más recientes primero
    salesToShow.sort((a, b) => new Date(b.fecha) - new Date(a.fecha))

    // Calcular el total de ventas
    let totalVentas = 0

    salesToShow.forEach(sale => {
      const fecha = new Date(sale.fecha)
      const tr = document.createElement('tr')
      const total = Number(sale.total)
      totalVentas += total
      
      tr.innerHTML = `
        <td>${sale.id}</td>
        <td>${fecha.toLocaleDateString()} ${fecha.toLocaleTimeString()}</td>
        <td style="text-align: right;">$${total.toFixed(2)}</td>
        <td>${sale.vendedor || ''}</td>
      `
      tbody.appendChild(tr)
    })

    // Agregar fila de total
    const trTotal = document.createElement('tr')
    trTotal.style.borderTop = '2px solid #e2e8f0'
    trTotal.style.fontWeight = '600'
    trTotal.innerHTML = `
      <td colspan="2" style="text-align: right;">Total:</td>
      <td style="text-align: right;">$${totalVentas.toFixed(2)}</td>
      <td></td>
    `
    tbody.appendChild(trTotal)

  } catch(err) {
    console.error('Error loading sales:', err)
    showMessage('Error al cargar las ventas: ' + (err.message || ''), 'error')
    if (refs.salesTable) {
      const tbody = refs.salesTable.querySelector('tbody')
      if (tbody) tbody.innerHTML = ''
    }
  }
}

function generateLowStockReport(){
  const lows = productsCache.filter(p=>p.stock<=5)
  if (!refs.lowStockReport) return;
  const tbody = refs.lowStockReport.querySelector('tbody');
  if (!tbody) return;
  if (lows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#b45309;padding:18px 0;">No hay productos con bajo stock.</td></tr>';
    return;
  }
  tbody.innerHTML = lows.map(p => `
    <tr>
      <td style="padding:8px 6px;">${p.nombre}</td>
      <td style="padding:8px 6px;">${p.descripcion||''}</td>
      <td style="padding:8px 6px;text-align:right;">$${Number(p.precio).toFixed(2)}</td>
      <td style="padding:8px 6px;text-align:right;font-weight:600;color:#b91c1c;">${p.stock}</td>
    </tr>
  `).join('');
}

// Caja
async function handleOpenCaja(e){
  e.preventDefault()
  const fd = new FormData(refs.openCajaForm)
  const payload = { fecha: fd.get('fecha'), apertura: Number(fd.get('apertura')), usuario_id: currentUser.id }
  try{
    const res = await fetch(`${API_BASE_URL}/caja/apertura`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
    const data = await res.json()
    if (res.ok) {
      showMessage('Caja abierta','success')
      showSection(refs.newSaleSection)
      ensureProductSearch()
      ensureProductsLoaded()
    } else if (res.status === 409) {
      showMessage(data.error || 'Ya existe una caja abierta','error')
    } else {
      showMessage(data.error || 'Error al abrir caja','error')
    }
    // refresh menu state and caja section
    updateCajaMenuState()
    prepareCajaSection()
  }catch(err){ console.error(err); showMessage('Error de red','error') }
}

async function handleCloseCaja(e){
  e.preventDefault()
  const fd = new FormData(refs.closeCajaForm)
  const payload = { caja_id: Number(fd.get('caja_id')), cierre: Number(fd.get('cierre')) }
  try{
    const res = await fetch(`${API_BASE_URL}/caja/cierre`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
    const data = await res.json()
    if (res.ok) showMessage('Caja cerrada','success'); else showMessage(data.error || 'Error al cerrar caja','error')
    // refresh menu state and caja section
    updateCajaMenuState()
    prepareCajaSection()
  }catch(err){ console.error(err); showMessage('Error de red','error') }
}

async function handleMovimiento(e){
  e.preventDefault()
  const fd = new FormData(refs.movimientoForm)
  const payload = { caja_id: Number(fd.get('caja_id')), descripcion: fd.get('descripcion'), monto: Number(fd.get('monto')), tipo: fd.get('tipo') }
  try{
    const res = await fetch(`${API_BASE_URL}/caja/movimiento`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
    const data = await res.json()
    if (res.ok){ showMessage('Movimiento registrado','success'); refs.movimientoForm.reset(); loadMovements(payload.caja_id) } else showMessage(data.error || 'Error al registrar movimiento','error')
    // refresh menu and caja data
    updateCajaMenuState()
    prepareCajaSection()
  }catch(err){ console.error(err); showMessage('Error de red','error') }
}

async function loadMovements(caja_id){
  try{
    if (!caja_id) { if (refs.movementsList) refs.movementsList.innerHTML = '<div>No hay caja seleccionada</div>'; return }
    const res = await fetch(`${API_BASE_URL}/caja/${caja_id}/detalle`)
    if (!res.ok){ const txt = await res.text(); console.error('Error cargando detalle caja', res.status, txt); showMessage('No se pudo cargar detalle de la caja','error'); return }
    const data = await res.json()
    if (!refs.movementsList) return
    refs.movementsList.innerHTML = ''

    // Actualizar los valores del resumen existente en vez de crear nuevos
    document.getElementById('summaryApertura').textContent = `$${(data.totales?.apertura||0).toFixed(2)}`
    document.getElementById('summaryEntradas').textContent = `$${(data.totales?.entradas||0).toFixed(2)}`
    document.getElementById('summarySalidas').textContent = `$${(data.totales?.salidas||0).toFixed(2)}`
    document.getElementById('summaryNeto').textContent = `$${(data.totales?.neto||0).toFixed(2)}`
    document.getElementById('summaryEsperado').textContent = `$${(data.totales?.expected_final||0).toFixed(2)}`
    document.getElementById('summaryCierre').textContent = data.totales?.cierre != null ? 
      `$${Number(data.totales.cierre).toFixed(2)}` : 'No cerrado'

    // render movements table
    const table = document.createElement('div')
    table.className = 'movements-table'
    table.innerHTML = '<div class="table-header"><span>Fecha</span><span>Tipo</span><span>Monto</span><span>Descripción</span></div>'
    
    const list = document.createElement('div')
    list.className = 'table-body'
    ;(data.movimientos||[]).forEach(m=>{
      const row = document.createElement('div')
      row.className = 'table-row'
      row.innerHTML = `
        <span>${new Date(m.fecha).toLocaleString()}</span>
        <span class="movement-type ${m.tipo}">${m.tipo}</span>
        <span class="movement-amount">$${Number(m.monto).toFixed(2)}</span>
        <span class="movement-desc">${m.descripcion||''}</span>`
      list.appendChild(row)
    })
    table.appendChild(list)
    refs.movementsList.appendChild(table)

    // Log para depuración
    console.log('Movimientos cargados:', data.movimientos?.length || 0, 'items')

  }catch(err){ console.error('Error en loadMovements:', err); showMessage('No se pudieron cargar movimientos','error') }
}

// Utilities
function showMessage(text,type){ if (!refs.messageDiv) return; refs.messageDiv.textContent=text; refs.messageDiv.className = `message ${type} show`; setTimeout(()=>{ refs.messageDiv.classList.remove('show') },3000) }

function validateEmail(email){ const r=/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/; return r.test(email) }
function validatePassword(p){ return p && p.length>=6 }

// User dropdown (minimal)
function showUserMenu(){
  // Ya no mostrar el userDropdown arriba
  // Solo ocultar/mostrar botones según login
  if (!refs.navMenu) return
  refs.loginBtn && (refs.loginBtn.style.display='none')
  refs.registerBtn && (refs.registerBtn.style.display='none')
  refs.logoutBtn && (refs.logoutBtn.style.display='inline-block')
  // Si existe el userDropdown, eliminarlo
  const ud = document.getElementById('userDropdown')
  if (ud && refs.navMenu.contains(ud)) refs.navMenu.removeChild(ud)
}

// Start
init()

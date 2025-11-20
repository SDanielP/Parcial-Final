
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
  pendingSection: document.getElementById('pendingSection'),
  loginForm: document.getElementById('loginForm'),
  registerForm: document.getElementById('registerForm'),
  messageDiv: document.getElementById('message'),
  userWelcome: document.getElementById('userWelcome'),
  mainMenu: document.getElementById('mainMenu'),
  adminMenu: document.getElementById('adminMenu'),
  adminUsersBtn: document.getElementById('adminUsersBtn'),
  adminSubmenu: document.getElementById('adminSubmenu'),
  manageUsersLink: document.getElementById('manageUsersLink'),
  usersTable: document.getElementById('usersTable'),
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
let selectedCliente = null // cliente seleccionado para envio (obj)
let clienteModal = null
let clienteModalForm = null
let clienteModalCreate = null
let clienteModalCancel = null

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

// Helpers for local date handling (avoid UTC off-by-one)
function localDateYYYYMMDD(d = new Date()){
  const y = d.getFullYear()
  const m = String(d.getMonth()+1).padStart(2,'0')
  const day = String(d.getDate()).padStart(2,'0')
  return `${y}-${m}-${day}`
}

function attachListeners(){
  refs.loginBtn?.addEventListener('click', showLogin)
  refs.registerBtn?.addEventListener('click', showRegister)
  refs.logoutBtn?.addEventListener('click', logout)

  refs.showRegisterLink?.addEventListener('click', (e)=>{ e.preventDefault(); showRegister() })
  refs.showLoginLink?.addEventListener('click', (e)=>{ e.preventDefault(); showLogin() })

  document.getElementById('newSaleLink')?.addEventListener('click', (e)=>{ e.preventDefault(); showSection(refs.newSaleSection) })
    document.getElementById('salesHistoryLink')?.addEventListener('click', (e)=>{
    e.preventDefault()
    showSection(refs.salesHistorySection)
    // Establecer la fecha actual en el input (modo local)
    const dateInput = document.getElementById('salesDate')
    if (dateInput) {
      const today = localDateYYYYMMDD()
      dateInput.value = today
      loadSales(today)
    } else {
      loadSales()
    }
  })
  document.getElementById('productsLink')?.addEventListener('click', (e)=>{ e.preventDefault(); showSection(refs.productsSection); loadProducts() })
  document.getElementById('pedidosLink')?.addEventListener('click', (e)=>{ e.preventDefault(); showSection(document.getElementById('pedidosSection')); loadPedidos() })
  document.getElementById('hojaRutaLink')?.addEventListener('click', (e)=>{ e.preventDefault(); showSection(document.getElementById('hojaRutaSection')); loadHojaRuta() })
  document.getElementById('addProductLink')?.addEventListener('click', async (e)=>{ e.preventDefault(); showSection(refs.addProductSection); await loadProveedoresInAddProductForm() })
  document.getElementById('stockReportsLink')?.addEventListener('click', (e)=>{ e.preventDefault(); showSection(refs.stockReportsSection); generateLowStockReport() })
  document.getElementById('stockPedidosLink')?.addEventListener('click', (e)=>{ e.preventDefault(); showSection(document.getElementById('stockPedidosSection')); openStockPedidos() })
  // Caja submenu links -> show specific internal panels
  document.getElementById('cajaOpenLink')?.addEventListener('click', async (e)=>{ e.preventDefault(); await showCajaPanel('apertura') })
  document.getElementById('cajaCloseLink')?.addEventListener('click', async (e)=>{ e.preventDefault(); await showCajaPanel('cierre') })
  document.getElementById('cajaMovementsLink')?.addEventListener('click', async (e)=>{ e.preventDefault(); await showCajaPanel('movimientos') })

  refs.loginForm?.addEventListener('submit', handleLogin)
  refs.registerForm?.addEventListener('submit', handleRegister)
  refs.addProductForm?.addEventListener('submit', handleAddProduct)
  refs.newSaleForm?.addEventListener('submit', handleNewSale)
  // Envío / clientes inline UI
  const envioCheckbox = document.getElementById('envioCheckbox')
  const envioUI = document.getElementById('envioUI')
  const clienteSearchInput = document.getElementById('clienteSearchInput')
  const clienteSearchResults = document.getElementById('clienteSearchResults')
  const clienteNewBtn = document.getElementById('clienteNewBtn')
  // modal elements
  clienteModal = document.getElementById('clienteModal')
  clienteModalForm = document.getElementById('clienteModalForm')
  clienteModalCreate = document.getElementById('clienteModalCreate')
  clienteModalCancel = document.getElementById('clienteModalCancel')
  if (envioCheckbox){ envioCheckbox.addEventListener('change', ()=>{ toggleEnvioUI(envioCheckbox.checked) }) }
  // Live search while typing (debounced)
  if (clienteSearchInput) {
    let debounceTimer = null
    clienteSearchInput.addEventListener('input', (e)=>{
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(()=>{ searchClients(clienteSearchInput.value) }, 250)
    })
  }
  if (clienteNewBtn) clienteNewBtn.addEventListener('click', ()=>{ openClienteModal() })
  if (clienteModalCancel) clienteModalCancel.addEventListener('click', ()=>{ closeClienteModal() })
  if (clienteModalCreate) clienteModalCreate.addEventListener('click', async ()=>{ await createClienteFromModal() })
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

  // Listas menu toggle
  document.getElementById('listasMenuBtn')?.addEventListener('click', (e)=>{
    e.stopPropagation()
    const submenu = document.getElementById('listasSubmenu')
    const isVisible = submenu?.style.display === 'flex'
    closeAllSubmenus()
    if (!isVisible && submenu) submenu.style.display = 'flex'
  })

  // Listas submenu links
  document.getElementById('listProductsLink')?.addEventListener('click', (e)=>{ e.preventDefault(); showSection(document.getElementById('listProductsSection')); loadListProducts(); closeAllSubmenus(); })
  document.getElementById('listClientesLink')?.addEventListener('click', (e)=>{ e.preventDefault(); showSection(document.getElementById('listClientesSection')); loadListClientes(); closeAllSubmenus(); })
  document.getElementById('listProveedoresLink')?.addEventListener('click', (e)=>{ e.preventDefault(); showSection(document.getElementById('listProveedoresSection')); loadListProveedores(); closeAllSubmenus(); })
  document.getElementById('listHistorialLink')?.addEventListener('click', (e)=>{ e.preventDefault(); showSection(document.getElementById('listHistorialSection')); initHistorialSection(); closeAllSubmenus(); })
  document.getElementById('listCuentasCorrientesLink')?.addEventListener('click', (e)=>{ e.preventDefault(); initCuentasCorrientesSection(); closeAllSubmenus(); })

  // Admin menu toggle
  refs.adminUsersBtn?.addEventListener('click', (e)=>{
    e.stopPropagation()
    const isVisible = refs.adminSubmenu?.style.display === 'flex'
    closeAllSubmenus()
    if (!isVisible && refs.adminSubmenu) refs.adminSubmenu.style.display = 'flex'
  })

  refs.manageUsersLink?.addEventListener('click', (e)=>{ e.preventDefault(); showSection(refs.usersTable ? document.getElementById('manageUsersSection') : null); loadUsers(); closeAllSubmenus(); })

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
    if (e.target.closest('#ventasSubmenu a, #stockSubmenu a, #cajaSubmenu a, #adminSubmenu a')) {
      setTimeout(closeAllSubmenus, 100)
      return
    }

    // Si el click no fue en un botón de menú ni dentro de un submenú, cerrar todos
    const isMenuBtn = e.target.closest('#ventasMenuBtn, #stockMenuBtn, #cajaMenuBtn, #adminUsersBtn')
    const isSubmenu = e.target.closest('#ventasSubmenu, #stockSubmenu, #cajaSubmenu, #adminSubmenu')
    
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
  const listasSubmenu = document.getElementById('listasSubmenu')
  if (listasSubmenu) listasSubmenu.style.display = 'none'
  if (refs.adminSubmenu) refs.adminSubmenu.style.display = 'none'
}

function closeAllModals(){
  // Close all modals (hide them, don't remove from DOM)
  document.querySelectorAll('.modal').forEach(modal => {
    modal.style.display = 'none'
  })
}

function hideAllSections(){
  // Hide known sections
  closeAllModals() // Close any open modals when changing sections
  const sections = ['welcomeSection','loginSection','registerSection','dashboardSection','pendingSection','newSaleSection','salesHistorySection','productsSection','addProductSection','stockReportsSection','cajaSection','pedidosSection','hojaRutaSection','manageUsersSection','stockPedidosSection','listProductsSection','listClientesSection','listProveedoresSection','listHistorialSection','listCuentasCorrientesSection']
  sections.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none' })
}
function showSection(el){ if (!el) return; hideAllSections(); el.style.display = 'block'; if (el === refs.newSaleSection){ ensureProductSearch(); ensureProductsLoaded(); initPaymentSystem() } }

// When showing caja section, prefill caja-related fields
async function prepareCajaSection(){
  const caja = await getCajaActual()
  const ultima = await getUltimaCaja()
  // Apertura: min date = today
  const openFecha = document.getElementById('openFecha')
  const today = localDateYYYYMMDD()
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
function showDashboard(){
  hideAllSections()
  if (currentUser && currentUser.rol === 'pendiente'){
    if (refs.pendingSection) refs.pendingSection.style.display='block'
    updateNav()
    showUserMenu()
    showMessage('Tu cuenta está pendiente de activación por un administrador','info')
    return
  }
  refs.dashboardSection && (refs.dashboardSection.style.display='block')
  updateNav(); showUserMenu(); if (currentUser) refs.userWelcome && (refs.userWelcome.textContent = `Selecciona para comenzar tus actividades, ${currentUser.nombre || currentUser.usuario}`)
}

function updateNav(active){
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'))
  if (currentUser){
    refs.loginBtn && (refs.loginBtn.style.display='none')
    refs.registerBtn && (refs.registerBtn.style.display='none')
    refs.logoutBtn && (refs.logoutBtn.style.display='inline-block')
    // Default: hide everything then selectively show per role
    if (refs.mainMenu) refs.mainMenu.style.display = 'none'
    if (refs.adminMenu) refs.adminMenu.style.display = 'none'
    // Hide individual menu buttons by default
    if (refs.ventasMenuBtn) refs.ventasMenuBtn.style.display = 'none'
    if (refs.stockMenuBtn) refs.stockMenuBtn.style.display = 'none'
    if (refs.cajaMenuBtn) refs.cajaMenuBtn.style.display = 'none'

    // Role-specific visibility
    if (currentUser.rol === 'admin'){
      // Admin sees only admin menu
      if (refs.adminMenu) refs.adminMenu.style.display = 'flex'
    } else if (currentUser.rol === 'moderador'){
      // Moderador sees main menu (ventas, stock, caja)
      if (refs.mainMenu) refs.mainMenu.style.display = 'flex'
      // ensure stock/ventas/caja buttons visible
      if (refs.ventasMenuBtn) refs.ventasMenuBtn.style.display = 'inline-block'
      if (refs.stockMenuBtn) refs.stockMenuBtn.style.display = 'inline-block'
      if (refs.cajaMenuBtn) refs.cajaMenuBtn.style.display = 'inline-block'
    } else if (currentUser.rol === 'vendedor'){
      // Vendedor sees only ventas and caja
      if (refs.mainMenu) refs.mainMenu.style.display = 'flex'
      if (refs.ventasMenuBtn) refs.ventasMenuBtn.style.display = 'inline-block'
      if (refs.cajaMenuBtn) refs.cajaMenuBtn.style.display = 'inline-block'
      if (refs.stockMenuBtn) refs.stockMenuBtn.style.display = 'none'
    } else if (currentUser.rol === 'pendiente'){
      // Pending users see no menus
      if (refs.mainMenu) refs.mainMenu.style.display = 'none'
      if (refs.adminMenu) refs.adminMenu.style.display = 'none'
    } else {
      // default: show main menu
      if (refs.mainMenu) refs.mainMenu.style.display = 'flex'
    }
  } else {
    refs.loginBtn && (refs.loginBtn.style.display='inline-block')
    refs.registerBtn && (refs.registerBtn.style.display='inline-block')
    refs.logoutBtn && (refs.logoutBtn.style.display='none')
    refs.mainMenu && (refs.mainMenu.style.display='none')
    if (refs.adminMenu) refs.adminMenu.style.display = 'none'
    if (active==='login') refs.loginBtn && refs.loginBtn.classList.add('active')
    if (active==='register') refs.registerBtn && refs.registerBtn.classList.add('active')
  }
}

// Admin: load and render users
async function loadUsers(){
  if (!currentUser || currentUser.rol !== 'admin') return showMessage('Acceso denegado','error')
  try{
    const res = await fetch(`${API_BASE_URL}/usuarios`)
    if (!res.ok) {
      let text = ''
      try { const d = await res.json(); text = d.error || JSON.stringify(d) } catch(e){ text = await res.text().catch(()=>res.statusText) }
      console.error('Error cargando usuarios', res.status, text)
      return showMessage(`Error cargando usuarios: ${text}`,'error')
    }
    const data = await res.json()
    console.log('GET /api/usuarios response data:', data)
    const users = (data && data.usuarios) ? data.usuarios : []
    try{
      renderUsersTable(users)
    }catch(err){
      console.error('Error rendering users table', err, { users })
      showMessage('Error mostrando usuarios: ' + (err.message||err),'error')
    }
  }catch(err){ console.error(err); showMessage('No se pudieron cargar usuarios: ' + (err.message||err),'error') }
}

function renderUsersTable(users){
  if (!refs.usersTable) return
  if (!Array.isArray(users)) {
    showMessage('Respuesta inválida al cargar usuarios','error')
    console.error('renderUsersTable: users is not array', users)
    return
  }
  const tbody = refs.usersTable.querySelector('tbody')
  tbody.innerHTML = ''
  console.log('users var', users)
  for (let i = 0; i < users.length; i++){
    const u = users[i]
    const tr = document.createElement('tr')
    tr.innerHTML = `<td>${u.id}</td><td>${u.nombre}</td><td>${u.usuario}</td><td>${u.rol}</td><td></td>`
    const tdActions = tr.querySelector('td:last-child')
  const select = document.createElement('select')
  select.className = 'role-select'
    const roles = ['admin','moderador','vendedor','cajero','pendiente']
    for (let j = 0; j < roles.length; j++){
      const r = roles[j]
      const opt = document.createElement('option')
      opt.value = r; opt.textContent = r; if (u.rol === r) opt.selected = true
      select.appendChild(opt)
    }
    select.addEventListener('change', async ()=>{
      const newRole = select.value
      try{
        const res = await fetch(`${API_BASE_URL}/usuarios/${u.id}/rol`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ rol: newRole }) })
        if (res.ok){ showMessage('Rol actualizado','success'); tr.children[3].textContent = newRole; if (currentUser && currentUser.id === u.id){ currentUser.rol = newRole; localStorage.setItem('userData', JSON.stringify(currentUser)); updateNav(); } }
        else { const d = await res.json(); showMessage(d.error || 'Error actualizando rol','error') }
      }catch(err){ console.error(err); showMessage('Error de red','error') }
    })
    tdActions.appendChild(select)
    tbody.appendChild(tr)
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
        // normalize role if backend returned empty
        const role = data.user && data.user.rol ? data.user.rol : 'pendiente'
        currentUser = Object.assign({}, data.user, { rol: role })
        localStorage.setItem('userData', JSON.stringify(currentUser))
        showMessage('Login exitoso','success')
        // After login, route user according to role
        if (currentUser.rol === 'pendiente'){
          updateNav();
          // Show pending screen only
          hideAllSections();
          if (refs.pendingSection) refs.pendingSection.style.display = 'block'
          showMessage('Tu cuenta está pendiente de activación por un administrador','info')
        } else if (currentUser.rol === 'admin'){
          // show only admin users UI
          showSection(document.getElementById('manageUsersSection'))
          updateNav()
          loadUsers()
        } else if (currentUser.rol === 'vendedor'){
          // show ventas directly for vendedores
          updateNav()
          showSection(refs.newSaleSection)
          ensureProductSearch(); ensureProductsLoaded();
        } else if (currentUser.rol === 'moderador'){
          // moderador sees dashboard (welcome) and can access ventas/stock/caja
          updateNav()
          showDashboard()
          loadProducts()
          loadSales()
        } else {
          // default behavior
          updateNav()
          showDashboard()
          loadProducts()
          loadSales()
        }
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

function logout(){
  localStorage.removeItem('userData')
  currentUser = null
  // Close any open submenus and sections to avoid residual UI after logout
  closeAllSubmenus()
  closeAllModals()
  hideAllSections()
  updateNav()
  showWelcome()
  showMessage('Sesión cerrada','success')
}

// Products
async function loadProducts(){
  try{
    // Cargar productos (filtrar solo activos para ventas)
    const res = await fetch(`${API_BASE_URL}/productos`)
    const data = await res.json()
    const allProducts = data.productos || []
    
    // Para ventas: solo productos activos
    productsCache = allProducts.filter(p => p.estado === 'activo' || !p.estado)
    
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
  // Edit Product Modal
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
        stock: Number(document.getElementById('editStock').value),
        usuario_id: currentUser ? currentUser.id : null
      }
      try{
        const res = await fetch(`${API_BASE_URL}/productos/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
        const data = await res.json()
        if (res.ok){ 
          showMessage(data.historial_registrado ? 'Producto actualizado (cambio registrado)' : 'Producto actualizado','success')
          closeEditModal()
          loadListProducts()
        } else showMessage(data.error || 'Error al actualizar producto','error')
      }catch(err){ console.error(err); showMessage('Error de red','error') }
    })
  }
  
  // Edit Cliente Modal
  const editClienteForm = document.getElementById('editClienteForm')
  const cancelEditClienteBtn = document.getElementById('cancelEditClienteBtn')
  if (cancelEditClienteBtn) cancelEditClienteBtn.addEventListener('click', ()=>{ document.getElementById('editClienteModal').style.display = 'none' })
  if (editClienteForm){
    editClienteForm.addEventListener('submit', async (e)=>{
      e.preventDefault()
      const id = document.getElementById('editClienteId').value
      const payload = {
        nombre: document.getElementById('editClienteNombre').value,
        telefono: document.getElementById('editClienteTelefono').value,
        direccion: document.getElementById('editClienteDireccion').value,
        limite_cuenta_corriente: Number(document.getElementById('editClienteLimiteCC').value) || 0
      }
      try{
        const res = await fetch(`${API_BASE_URL}/clientes/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
        const data = await res.json()
        if (res.ok){ 
          showMessage('Cliente actualizado','success')
          document.getElementById('editClienteModal').style.display = 'none'
          loadListClientes()
        } else showMessage(data.error || 'Error al actualizar cliente','error')
      }catch(err){ console.error(err); showMessage('Error de red','error') }
    })
  }
  
  // Edit Proveedor Modal
  const editProveedorForm = document.getElementById('editProveedorForm')
  const cancelEditProveedorBtn = document.getElementById('cancelEditProveedorBtn')
  if (cancelEditProveedorBtn) cancelEditProveedorBtn.addEventListener('click', ()=>{ document.getElementById('editProveedorModal').style.display = 'none' })
  if (editProveedorForm){
    editProveedorForm.addEventListener('submit', async (e)=>{
      e.preventDefault()
      const id = document.getElementById('editProveedorId').value
      const payload = {
        nombre: document.getElementById('editProveedorNombre').value,
        contacto: document.getElementById('editProveedorContacto').value,
        telefono: document.getElementById('editProveedorTelefono').value,
        email: document.getElementById('editProveedorEmail').value,
        direccion: document.getElementById('editProveedorDireccion').value
      }
      try{
        const res = await fetch(`${API_BASE_URL}/proveedores/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
        const data = await res.json()
        if (res.ok){ 
          showMessage('Proveedor actualizado','success')
          document.getElementById('editProveedorModal').style.display = 'none'
          loadListProveedores()
        } else showMessage(data.error || 'Error al actualizar proveedor','error')
      }catch(err){ console.error(err); showMessage('Error de red','error') }
    })
  }
})

async function handleAddProduct(e){
  e.preventDefault()
  const fd = new FormData(refs.addProductForm)
  const proveedorId = fd.get('proveedor_id')
  const payload = { 
    nombre: fd.get('nombre'), 
    descripcion: fd.get('descripcion'), 
    precio: Number(fd.get('precio')), 
    stock: Number(fd.get('stock')),
    proveedor_id: proveedorId && proveedorId !== '' ? Number(proveedorId) : null
  }
  try{
    const res = await fetch(`${API_BASE_URL}/productos`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
    const data = await res.json()
    if (res.ok){ showMessage('Producto agregado','success'); refs.addProductForm.reset(); loadProducts() } else showMessage(data.error || 'Error al agregar producto','error')
  }catch(err){ console.error(err); showMessage('Error de red','error') }
}

// Sales - Payment management
function addPaymentRow() {
  const container = document.getElementById('paymentsContainer')
  if (!container) return
  
  // Limitar a 2 formas de pago
  const existing = container.querySelectorAll('.payment-row')
  if (existing.length >= 2) {
    showMessage('Máximo 2 formas de pago permitidas', 'error')
    return
  }
  
  const row = document.createElement('div')
  row.className = 'payment-row'
  row.style.display = 'grid'
  row.style.gridTemplateColumns = '2fr 1fr auto'
  row.style.gap = '10px'
  row.style.alignItems = 'center'
  row.style.padding = '10px'
  row.style.background = '#f8fafc'
  row.style.borderRadius = '8px'
  row.style.border = '1px solid #e2e8f0'
  
  row.innerHTML = `
    <select required style="padding:10px;font-weight:500;" class="payment-type-select">
      <option value="efectivo">💵 Efectivo</option>
      <option value="tarjeta">💳 Tarjeta</option>
      <option value="qr">📱 QR</option>
      <option value="transferencia">🏦 Transferencia</option>
      <option value="cuenta_corriente">📋 Cuenta Corriente</option>
    </select>
    <input type="number" step="0.01" min="0" placeholder="Monto" required style="padding:10px;text-align:right;">
    <button type="button" class="remove-payment-btn" style="background:#ef4444;color:white;border:none;padding:8px 12px;border-radius:6px;cursor:pointer;font-weight:600;">✕</button>
  `
  
  container.appendChild(row)
  
  // Event listener para cambio de tipo de pago
  const selectPayment = row.querySelector('.payment-type-select')
  selectPayment.addEventListener('change', (e) => {
    if (e.target.value === 'cuenta_corriente') {
      handleCuentaCorrienteSelection(row)
    }
  })
  
  // Event listener para eliminar
  row.querySelector('.remove-payment-btn').addEventListener('click', () => {
    row.remove()
    updatePaymentButton()
  })
  
  // Auto-completar monto si es el primer pago
  if (existing.length === 0) {
    const totalValue = document.getElementById('saleTotalValue')
    if (totalValue) {
      const total = parseFloat(totalValue.textContent.replace('$', '').replace(',', '')) || 0
      const input = row.querySelector('input[type="number"]')
      if (input) input.value = total.toFixed(2)
    }
  }
  
  updatePaymentButton()
}

function handleCuentaCorrienteSelection(row) {
  // Buscar si ya existe un contenedor de cliente para este row
  let clienteContainer = row.querySelector('.cc-cliente-container')
  if (clienteContainer) return // Ya existe
  
  // Crear contenedor para selección de cliente
  clienteContainer = document.createElement('div')
  clienteContainer.className = 'cc-cliente-container'
  clienteContainer.style.gridColumn = '1 / -1'
  clienteContainer.style.marginTop = '10px'
  clienteContainer.style.padding = '10px'
  clienteContainer.style.background = '#fef3c7'
  clienteContainer.style.borderRadius = '6px'
  clienteContainer.style.border = '2px solid #fbbf24'
  
  clienteContainer.innerHTML = `
    <div style="margin-bottom:8px;font-weight:600;color:#92400e;">Seleccionar Cliente para Cuenta Corriente:</div>
    <input type="text" class="cc-cliente-search" placeholder="Buscar cliente..." style="width:100%;padding:8px;margin-bottom:8px;">
    <div class="cc-cliente-results" style="max-height:150px;overflow-y:auto;"></div>
    <input type="hidden" class="cc-cliente-id">
  `
  
  row.appendChild(clienteContainer)
  
  const searchInput = clienteContainer.querySelector('.cc-cliente-search')
  const resultsDiv = clienteContainer.querySelector('.cc-cliente-results')
  
  let debounceTimer = null
  searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      searchClientesForCC(e.target.value, resultsDiv, clienteContainer)
    }, 250)
  })
}

async function searchClientesForCC(query, resultsDiv, container) {
  try {
    const term = (query || '').trim()
    const url = term ? `${API_BASE_URL}/clientes?q=${encodeURIComponent(term)}` : `${API_BASE_URL}/clientes`
    const res = await fetch(url)
    if (!res.ok) return showMessage('Error buscando clientes', 'error')
    const data = await res.json()
    
    // Filtrar solo clientes activos (no deudores ni inactivos para nueva venta)
    const clientesActivos = (data.clientes || []).filter(c => c.estado === 'activo')
    
    resultsDiv.innerHTML = ''
    if (clientesActivos.length === 0) {
      resultsDiv.innerHTML = '<div style="padding:8px;color:#64748b;text-align:center;">No se encontraron clientes activos</div>'
      return
    }
    
    clientesActivos.forEach(c => {
      const div = document.createElement('div')
      div.style.padding = '8px'
      div.style.cursor = 'pointer'
      div.style.borderBottom = '1px solid #e2e8f0'
      div.style.background = 'white'
      div.innerHTML = `
        <strong>${escapeHtml(c.nombre)}</strong><br>
        <small style="color:#64748b;">Límite CC: $${Number(c.limite_cuenta_corriente || 0).toFixed(2)}</small>
      `
      div.addEventListener('click', () => {
        selectClienteForCC(c, container)
      })
      resultsDiv.appendChild(div)
    })
  } catch(err) {
    console.error(err)
    showMessage('Error buscando clientes', 'error')
  }
}

async function selectClienteForCC(cliente, container) {
  const hiddenInput = container.querySelector('.cc-cliente-id')
  const resultsDiv = container.querySelector('.cc-cliente-results')
  const searchInput = container.querySelector('.cc-cliente-search')
  
  hiddenInput.value = cliente.id
  searchInput.value = cliente.nombre
  searchInput.disabled = true
  searchInput.style.background = '#f1f5f9'
  
  // Obtener saldo usado
  try {
    const res = await fetch(`${API_BASE_URL}/cuentas-corrientes/cliente/${cliente.id}`)
    const data = await res.json()
    const saldoUsado = Number(data.saldo_total || 0)
    const limite = Number(cliente.limite_cuenta_corriente || 0)
    const disponible = limite - saldoUsado
    
    resultsDiv.innerHTML = `
      <div style="padding:8px;background:white;border-radius:4px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <strong>${escapeHtml(cliente.nombre)}</strong><br>
          <small>Límite: $${limite.toFixed(2)} | Usado: $${saldoUsado.toFixed(2)}</small><br>
          <small style="color:${disponible > 0 ? '#10b981' : '#ef4444'};font-weight:bold;">Disponible: $${disponible.toFixed(2)}</small>
        </div>
        <button type="button" class="cc-deselect-btn" style="background:#ef4444;color:white;border:none;padding:6px 12px;border-radius:4px;cursor:pointer;">Cambiar</button>
      </div>
    `
    
    resultsDiv.querySelector('.cc-deselect-btn').addEventListener('click', () => {
      hiddenInput.value = ''
      searchInput.value = ''
      searchInput.disabled = false
      searchInput.style.background = 'white'
      resultsDiv.innerHTML = ''
      searchInput.focus()
    })
  } catch (err) {
    console.error('Error obteniendo saldo:', err)
    resultsDiv.innerHTML = `
      <div style="padding:8px;background:white;border-radius:4px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <strong>${escapeHtml(cliente.nombre)}</strong><br>
          <small>Límite: $${Number(cliente.limite_cuenta_corriente || 0).toFixed(2)}</small>
        </div>
        <button type="button" class="cc-deselect-btn" style="background:#ef4444;color:white;border:none;padding:6px 12px;border-radius:4px;cursor:pointer;">Cambiar</button>
      </div>
    `
    
    resultsDiv.querySelector('.cc-deselect-btn').addEventListener('click', () => {
      hiddenInput.value = ''
      searchInput.value = ''
      searchInput.disabled = false
      searchInput.style.background = 'white'
      resultsDiv.innerHTML = ''
      searchInput.focus()
    })
  }
}

function updatePaymentButton() {
  const btn = document.getElementById('addPaymentBtn')
  const container = document.getElementById('paymentsContainer')
  if (!btn || !container) return
  
  const count = container.querySelectorAll('.payment-row').length
  if (count >= 2) {
    btn.disabled = true
    btn.style.opacity = '0.5'
    btn.style.cursor = 'not-allowed'
  } else {
    btn.disabled = false
    btn.style.opacity = '1'
    btn.style.cursor = 'pointer'
  }
}

function initPaymentSystem() {
  console.log('Inicializando sistema de pagos...')
  const container = document.getElementById('paymentsContainer')
  const btn = document.getElementById('addPaymentBtn')
  
  if (!container) {
    console.error('paymentsContainer no encontrado')
    return
  }
  if (!btn) {
    console.error('addPaymentBtn no encontrado')
    return
  }
  
  console.log('Elementos encontrados, limpiando container...')
  // Limpiar container primero
  container.innerHTML = ''
  
  // Remover event listeners anteriores clonando el botón
  const newBtn = btn.cloneNode(true)
  btn.parentNode.replaceChild(newBtn, btn)
  
  console.log('Agregando event listener al botón...')
  // Agregar event listener limpio
  newBtn.addEventListener('click', () => {
    console.log('Botón Agregar Pago clickeado')
    addPaymentRow()
  })
  
  console.log('Agregando primer pago por defecto...')
  // Agregar el primer pago por defecto
  addPaymentRow()
  console.log('Sistema de pagos inicializado correctamente')
}

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
  
  // Obtener formas de pago (puede haber 1 o 2)
  const paymentRows = document.querySelectorAll('.payment-row')
  if (paymentRows.length === 0) return showMessage('Agrega al menos una forma de pago','error')
  
  const pagos = []
  let totalPagos = 0
  for (const row of paymentRows) {
    const tipo = row.querySelector('select').value
    const monto = Number(row.querySelector('input[type="number"]').value)
    if (!tipo || monto <= 0) return showMessage('Verifica los datos de pago','error')
    
    const pagoObj = { tipo_pago: tipo, monto }
    
    // Si es cuenta corriente, incluir cliente_id
    if (tipo === 'cuenta_corriente') {
      const clienteIdInput = row.querySelector('.cc-cliente-id')
      if (!clienteIdInput || !clienteIdInput.value) {
        return showMessage('Debes seleccionar un cliente para pago con cuenta corriente', 'error')
      }
      pagoObj.cliente_id = Number(clienteIdInput.value)
    }
    
    pagos.push(pagoObj)
    totalPagos += monto
  }
  
  const rows = [...refs.saleProductsContainer.querySelectorAll('.sale-item')]
  if (rows.length === 0) return showMessage('Agrega al menos un producto','error')
  let valid = true;
  let totalVenta = 0;
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
    totalVenta += precio_unitario * cantidad;
    return { producto_id, cantidad, precio_unitario };
  });
  if (!valid) {
    showMessage('No puedes vender más unidades de las disponibles en stock','error');
    return;
  }
  
  // Validar que el total de pagos coincida con el total de la venta
  if (Math.abs(totalPagos - totalVenta) > 0.01) {
    return showMessage(`El total de pagos ($${totalPagos.toFixed(2)}) no coincide con el total de la venta ($${totalVenta.toFixed(2)})`, 'error')
  }
  // incluir datos de envio si aplica
  const envioCheckboxEl = document.getElementById('envioCheckbox')
  const envioEnabled = envioCheckboxEl ? envioCheckboxEl.checked : false
  let envio = { enabled: false }
  if (envioEnabled) {
    envio.enabled = true
    if (selectedCliente && selectedCliente.id) {
      envio.cliente_id = selectedCliente.id
      envio.direccion = selectedCliente.direccion
    } else {
      // intentar tomar direccion desde el nuevo cliente form si está visible
      const form = document.getElementById('clienteNewForm')
      if (form && form.style.display !== 'none') {
        const fd = new FormData(form)
        envio.cliente = { nombre: fd.get('nombre'), telefono: fd.get('telefono'), email: fd.get('email'), direccion: fd.get('direccion') }
        envio.direccion = fd.get('direccion')
      }
    }
  }
  const payload = { usuario_id: currentUser.id, items, pagos, envio }
  console.log('Payload venta:', payload) // DEBUG
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
      // Cleanup envio UI and any cliente forms/modals
      try{
        // Limpiar pagos
        const paymentsContainer = document.getElementById('paymentsContainer')
        if (paymentsContainer) paymentsContainer.innerHTML = ''
        // Reinicializar con un pago vacío
        initPaymentSystem()
        
        if (envioCheckboxEl) { envioCheckboxEl.checked = false; toggleEnvioUI(false) }
        const clienteNewFormEl = document.getElementById('clienteNewForm')
        if (clienteNewFormEl) { if (clienteNewFormEl.reset) clienteNewFormEl.reset(); clienteNewFormEl.style.display = 'none' }
        if (clienteModalForm) clienteModalForm.reset()
        selectedCliente = null
        const results = document.getElementById('clienteSearchResults')
        if (results) results.innerHTML = ''
      }catch(e){ console.warn('Error cleaning envio UI', e) }
    } else showMessage(data.error || 'Error al registrar venta','error')
  }catch(err){ console.error(err); showMessage('Error de red','error') }
}

// Envío / clientes helpers
function toggleEnvioUI(enabled){
  const envioUI = document.getElementById('envioUI')
  if (!envioUI) return
  envioUI.style.display = enabled ? 'block' : 'none'
  if (!enabled) {
    selectedCliente = null
    const results = document.getElementById('clienteSearchResults')
    if (results) results.innerHTML = ''
    const form = document.getElementById('clienteNewForm')
    if (form) form.style.display = 'none'
  }
}

async function searchClients(q){
  try{
    const term = (q||'').trim()
    const url = term ? `${API_BASE_URL}/clientes?q=${encodeURIComponent(term)}` : `${API_BASE_URL}/clientes`
    const res = await fetch(url)
    if (!res.ok) return showMessage('Error buscando clientes','error')
    const data = await res.json()
    // Filtrar solo clientes activos o deudores (no inactivos)
    const clientesActivos = (data.clientes || []).filter(c => c.estado !== 'inactivo')
    renderClientSearchResults(clientesActivos)
  }catch(err){ console.error(err); showMessage('Error buscando clientes','error') }
}

function renderClientSearchResults(list){
  const container = document.getElementById('clienteSearchResults')
  if (!container) return
  container.innerHTML = ''
  if (!list || list.length === 0) { container.innerHTML = '<div style="padding:8px;color:#64748b;">No se encontraron clientes</div>'; return }
  list.forEach(c=>{
    const div = document.createElement('div')
    div.className = 'search-item'
    div.style.display = 'flex'
    div.style.justifyContent = 'space-between'
    div.style.alignItems = 'center'
    div.innerHTML = `<div><strong>${escapeHtml(c.nombre)}</strong> <small style="color:#64748b">${c.telefono?('· '+escapeHtml(c.telefono)):''}</small><div style="font-size:0.9rem;color:#374151">${escapeHtml(c.direccion||'')}</div></div>`
    const right = document.createElement('div')
    right.style.display = 'flex'
    right.style.flexDirection = 'column'
    right.style.alignItems = 'flex-end'
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'auth-btn'
    btn.textContent = 'Seleccionar'
    btn.addEventListener('click', ()=>{ selectedCliente = c; renderSelectedCliente(c) })
    right.appendChild(btn)
    div.appendChild(right)
    container.appendChild(div)
  })
}

function renderSelectedCliente(c){
  const container = document.getElementById('clienteSearchResults')
  if (!container) return
  container.innerHTML = `
    <div style="padding:8px;color:#064e3b; display:flex; justify-content:space-between; align-items:center;">
      <div><strong>Cliente seleccionado:</strong> ${escapeHtml(c.nombre)} — ${escapeHtml(c.direccion||'')}</div>
      <div><button id="clienteDeselectBtn" class="auth-btn" type="button">Deseleccionar</button></div>
    </div>`
  const btn = document.getElementById('clienteDeselectBtn')
  if (btn) btn.addEventListener('click', ()=>{
    // Only clear the selected client and restore the search input — do NOT toggle the envio checkbox/UI
    selectedCliente = null
    const results = document.getElementById('clienteSearchResults')
    if (results) results.innerHTML = ''
    const input = document.getElementById('clienteSearchInput')
    if (input) input.focus()
  })
}

function escapeHtml(s){ if (!s && s!==0) return ''; return String(s).replace(/[&<>"']/g, function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m]}) }

function openClienteModal(){ if (!clienteModal) return; clienteModal.style.display = 'flex' }
function closeClienteModal(){ if (!clienteModal) return; clienteModal.style.display = 'none'; if (clienteModalForm) clienteModalForm.reset() }

async function createClienteFromModal(){
  if (!clienteModalForm) return
  const fd = new FormData(clienteModalForm)
  const nombre = fd.get('nombre')
  const direccion = fd.get('direccion')
  if (!nombre || !direccion) return showMessage('Nombre y dirección son requeridos','error')
  try{
    const payload = { nombre, telefono: fd.get('telefono')||'', direccion, limite_cuenta_corriente: Number(fd.get('limite_cuenta_corriente')) || 0 }
    const res = await fetch(`${API_BASE_URL}/clientes`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) })
    const data = await res.json()
    if (res.ok){
      // seleccionar el nuevo cliente para la venta
      selectedCliente = Object.assign({ id: data.id }, payload)
      closeClienteModal()
      renderSelectedCliente(selectedCliente)
      showMessage('Cliente creado. Ahora puedes buscarlo y añadirlo a la venta','success')
    } else {
      showMessage(data.error || 'Error creando cliente','error')
    }
  }catch(err){ console.error(err); showMessage('Error de red','error') }
}

async function createClienteFromForm(form){
  if (!form) return
  const fd = new FormData(form)
  const nombre = fd.get('nombre')
  const direccion = fd.get('direccion')
  if (!nombre || !direccion) return showMessage('Nombre y dirección son requeridos','error')
  try{
    const payload = { nombre, telefono: fd.get('telefono')||'', email: fd.get('email')||'', direccion, limite_cuenta_corriente: Number(fd.get('limite_cuenta_corriente')) || 0 }
    const res = await fetch(`${API_BASE_URL}/clientes`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) })
    const data = await res.json()
    if (res.ok){
      selectedCliente = Object.assign({ id: data.id }, payload)
      form.style.display = 'none'
      const results = document.getElementById('clienteSearchResults')
      if (results) results.innerHTML = `<div style="padding:8px;color:#064e3b;"><strong>Cliente creado y seleccionado:</strong> ${payload.nombre} — ${payload.direccion}</div>`
      showMessage('Cliente creado','success')
    } else {
      showMessage(data.error || 'Error creando cliente','error')
    }
  }catch(err){ console.error(err); showMessage('Error de red','error') }
}

// Pedidos: carga y print
async function loadPedidos(){
  try{
    const res = await fetch(`${API_BASE_URL}/pedidos`)
    if (!res.ok) return showMessage('No se pudieron cargar pedidos','error')
    const data = await res.json()
    const rows = data.pedidos || []
    const tbody = document.getElementById('pedidosTable')?.querySelector('tbody')
    if (!tbody) return
    tbody.innerHTML = ''
    rows.forEach(p=>{
      const tr = document.createElement('tr')
      tr.innerHTML = `
        <td>${p.id}</td>
        <td>${new Date(p.fecha).toLocaleString()}</td>
        <td>${p.cliente_nombre} (${p.telefono||''})</td>
        <td>${p.direccion}</td>
        <td style="text-align:right;">$${Number(p.total||0).toFixed(2)}</td>
        <td>${p.estado}</td>
        <td><button class="auth-btn" data-id="${p.id}">Ver/Imprimir</button></td>
      `
      tbody.appendChild(tr)
      tr.querySelector('button')?.addEventListener('click', ()=>{ viewPedidoDetail(p.id) })
    })
  }catch(err){ console.error(err); showMessage('Error cargando pedidos','error') }
}

// ---------- Proveedores / Pedidos a proveedores (frontend) ----------
async function loadProveedores(){
  try{
    const res = await fetch(`${API_BASE_URL}/proveedores`)
    if (!res.ok) return []
    const data = await res.json()
    return data.proveedores || []
  }catch(err){ console.error('Error cargando proveedores', err); return [] }
}

async function loadProveedoresInAddProductForm(){
  const select = document.getElementById('addProductProveedorSelect')
  if (!select) return
  const proveedores = await loadProveedores()
  select.innerHTML = '<option value="">-- Seleccionar proveedor (opcional) --</option>'
  proveedores.forEach(p => {
    const opt = document.createElement('option')
    opt.value = p.id
    opt.textContent = p.nombre
    select.appendChild(opt)
  })
}

async function openStockPedidos(){
  // Ensure products and providers loaded
  ensureProductsLoaded()
  const proveedores = await loadProveedores()
  // Filtrar solo proveedores activos
  const proveedoresActivos = proveedores.filter(p => p.estado === 'activo' || !p.estado)
  const sel = document.getElementById('proveedorFilter')
  if (sel){
    sel.innerHTML = '<option value="">-- Seleccionar proveedor --</option>'
    proveedoresActivos.forEach(p=>{ const opt = document.createElement('option'); opt.value = p.id; opt.textContent = p.nombre; sel.appendChild(opt) })
    // Add listener to filter products when provider changes
    sel.addEventListener('change', ()=>{ 
      renderStockPedidoSearch()
      // Clear cart when changing provider
      window.stockPedidoCart = []
      renderStockPedidoCart()
    })
  }
  // attach search button
  document.getElementById('stockPedidoSearchBtn')?.addEventListener('click', ()=>{ renderStockPedidoSearch() })
  document.getElementById('stockPedidoProductSearch')?.addEventListener('keypress', (e)=>{ if (e.key==='Enter'){ e.preventDefault(); renderStockPedidoSearch() } })
  // load existing orders
  loadProveedorOrders()
  // clear cart
  window.stockPedidoCart = []
  renderStockPedidoCart()
}

function renderStockPedidoSearch(){
  const q = (document.getElementById('stockPedidoProductSearch')?.value||'').trim().toLowerCase()
  const proveedorId = Number(document.getElementById('proveedorFilter')?.value||0)
  const results = document.getElementById('stockPedidoResults')
  if (!results) return
  results.innerHTML = ''
  
  // First filter by provider if selected
  let filteredProducts = productsCache
  if (proveedorId > 0) {
    // Show ONLY products assigned to this provider (strict filter)
    filteredProducts = productsCache.filter(p => Number(p.proveedor_id) === proveedorId)
    if (filteredProducts.length === 0) {
      results.innerHTML = '<div style="padding:8px;color:#64748b">No hay productos asociados a este proveedor. Por favor asigna productos a este proveedor desde el módulo de Stock > Productos.</div>'
      return
    }
  }
  
  // Then filter by search query
  const matches = q ? filteredProducts.filter(p=>p.nombre.toLowerCase().includes(q)) : filteredProducts.slice(0,50)
  if (!matches || matches.length===0) { results.innerHTML = '<div style="padding:8px;color:#64748b">No se encontraron productos</div>'; return }
  
  matches.forEach(p=>{
    const div = document.createElement('div')
    div.style.display = 'flex'
    div.style.justifyContent = 'space-between'
    div.style.alignItems = 'center'
    div.style.padding = '6px 0'
    div.innerHTML = `<div><strong>${escapeHtml(p.nombre)}</strong> <small style="color:#64748b">${escapeHtml(p.descripcion||'')}</small></div><div style="display:flex;gap:8px;align-items:center"><input type="number" min="1" value="1" style="width:70px;padding:6px" data-id="${p.id}" class="stock-pedido-qty" /><button class="auth-btn" data-id="${p.id}">Agregar</button></div>`
    results.appendChild(div)
    div.querySelector('button')?.addEventListener('click', ()=>{
      const id = Number(div.querySelector('button').dataset.id)
      const qtyEl = div.querySelector('.stock-pedido-qty')
      const qty = Number(qtyEl.value) || 1
      const prod = productsCache.find(x=>x.id===id)
      if (!prod) return showMessage('Producto no encontrado','error')
      addToStockPedidoCart(prod, qty)
    })
  })
}

function addToStockPedidoCart(product, cantidad){
  if (!window.stockPedidoCart) window.stockPedidoCart = []
  const existing = window.stockPedidoCart.find(i=>i.producto_id===product.id)
  if (existing){ existing.cantidad += Number(cantidad); } else { window.stockPedidoCart.push({ producto_id: product.id, nombre: product.nombre, cantidad: Number(cantidad), precio_unitario: Number(product.precio||0) }) }
  renderStockPedidoCart()
}

function renderStockPedidoCart(){
  const container = document.getElementById('stockPedidoCart')
  if (!container) return
  const cart = window.stockPedidoCart || []
  if (cart.length === 0) { container.innerHTML = '<div style="color:#64748b">Carrito vacío</div>'; return }
  container.innerHTML = ''
  cart.forEach((it, idx)=>{
    const row = document.createElement('div')
    row.style.display = 'flex'
    row.style.justifyContent = 'space-between'
    row.style.alignItems = 'center'
    row.style.padding = '6px 0'
    row.innerHTML = `<div>${escapeHtml(it.nombre)}</div><div style="display:flex;gap:8px;align-items:center"><input type="number" min="1" value="${it.cantidad}" style="width:80px;padding:6px" data-idx="${idx}" class="cart-qty" /><button class="auth-btn" data-idx="${idx}">Quitar</button></div>`
    container.appendChild(row)
    row.querySelector('.cart-qty')?.addEventListener('input', (e)=>{ const i = Number(e.target.dataset.idx); const v = Number(e.target.value)||1; window.stockPedidoCart[i].cantidad = v; renderStockPedidoCart() })
    row.querySelector('button')?.addEventListener('click', ()=>{ const i = Number(row.querySelector('button').dataset.idx); window.stockPedidoCart.splice(i,1); renderStockPedidoCart() })
  })
}

async function createProveedorOrder(){
  const proveedorId = Number(document.getElementById('proveedorFilter')?.value||0)
  if (!proveedorId) return showMessage('Selecciona un proveedor','error')
  const items = (window.stockPedidoCart||[]).map(i=>({ producto_id: i.producto_id, cantidad: i.cantidad, precio_unitario: i.precio_unitario }))
  if (items.length === 0) return showMessage('Agrega al menos un producto al carrito','error')
  try{
    const payload = { proveedor_id: proveedorId, notas: '', items }
    const res = await fetch(`${API_BASE_URL}/pedidos_proveedor`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
    const data = await res.json()
    if (res.ok){ showMessage('Pedido creado','success'); window.stockPedidoCart = []; renderStockPedidoCart(); loadProveedorOrders() } else { showMessage(data.error || 'Error creando pedido','error') }
  }catch(err){ console.error(err); showMessage('Error de red','error') }
}

async function loadProveedorOrders(){
  try{
    const res = await fetch(`${API_BASE_URL}/pedidos_proveedor`)
    if (!res.ok) return console.error('No se pudo cargar pedidos a proveedores')
    const data = await res.json()
    const rows = data.pedidos || []
    const tbody = document.getElementById('proveedorOrdersTable')?.querySelector('tbody')
    if (!tbody) return
    tbody.innerHTML = ''
    rows.forEach(r=>{
      const tr = document.createElement('tr')
      tr.innerHTML = `<td>${r.id}</td><td>${escapeHtml(r.proveedor_nombre||'')}</td><td>${new Date(r.fecha).toLocaleString()}</td><td>${r.estado}</td><td><button class="auth-btn" data-id="${r.id}">Ver</button></td>`
      tbody.appendChild(tr)
      tr.querySelector('button')?.addEventListener('click', ()=>{ viewProveedorOrder(r.id) })
    })
  }catch(err){ console.error('Error cargando pedidos proveedor', err) }
}

async function viewProveedorOrder(id){
  try{
    const res = await fetch(`${API_BASE_URL}/pedidos_proveedor/${id}`)
    if (!res.ok) return showMessage('No se pudo obtener pedido','error')
    const data = await res.json()
    const p = data.pedido
    
    // Create modal for viewing and managing order
    const modalId = 'proveedorOrderModal_' + id
    let existingModal = document.getElementById(modalId)
    if (existingModal) existingModal.remove()
    
    // Calculate total
    let total = 0
    if (Array.isArray(p.items) && p.items.length > 0) {
      total = p.items.reduce((sum, it) => sum + (Number(it.cantidad) * Number(it.precio_unitario || 0)), 0)
    }
    
    let itemsHtml = ''
    if (Array.isArray(p.items) && p.items.length>0){
      itemsHtml = '<table style="width:100%;border-collapse:collapse;margin-top:20px;border:2px solid #333"><thead><tr style="background:#f3f4f6"><th style="border:1px solid #666;padding:10px;text-align:left">Producto</th><th style="border:1px solid #666;padding:10px;text-align:center">Cantidad</th><th style="border:1px solid #666;padding:10px;text-align:right">Precio Unit.</th><th style="border:1px solid #666;padding:10px;text-align:right">Subtotal</th></tr></thead><tbody>'
      p.items.forEach(it=>{ 
        const subtotal = Number(it.cantidad) * Number(it.precio_unitario || 0)
        itemsHtml += `<tr><td style="border:1px solid #666;padding:8px">${escapeHtml(it.producto_nombre)}</td><td style="border:1px solid #666;padding:8px;text-align:center">${it.cantidad}</td><td style="border:1px solid #666;padding:8px;text-align:right">$${Number(it.precio_unitario||0).toFixed(2)}</td><td style="border:1px solid #666;padding:8px;text-align:right">$${subtotal.toFixed(2)}</td></tr>` 
      })
      itemsHtml += `<tr style="font-weight:bold;background:#f9fafb"><td colspan="3" style="border:1px solid #666;padding:10px;text-align:right">TOTAL:</td><td style="border:1px solid #666;padding:10px;text-align:right">$${total.toFixed(2)}</td></tr>`
      itemsHtml += '</tbody></table>'
    }
    
    const modal = document.createElement('div')
    modal.id = modalId
    modal.className = 'modal'
    modal.style.display = 'flex'
    modal.innerHTML = `
      <div class="modal-overlay" onclick="document.getElementById('${modalId}').remove()"></div>
      <div class="modal-content" style="max-width:900px;max-height:90vh;overflow-y:auto">
        <h3 style="margin-bottom:20px;color:#6366f1">📋 Pedido a Proveedor #${p.id}</h3>
        
        <div style="background:#f9fafb;border:2px solid #e2e8f0;padding:20px;border-radius:12px;margin-bottom:20px">
          <h4 style="margin:0 0 15px 0;color:#111;font-size:18px">📦 Datos del Proveedor</h4>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div><strong style="color:#64748b">Nombre:</strong> ${escapeHtml(p.proveedor_nombre || 'N/A')}</div>
            <div><strong style="color:#64748b">Contacto:</strong> ${escapeHtml(p.contacto || 'N/A')}</div>
            <div><strong style="color:#64748b">Teléfono:</strong> ${escapeHtml(p.telefono || 'N/A')}</div>
            <div><strong style="color:#64748b">Email:</strong> ${escapeHtml(p.email || 'N/A')}</div>
            <div style="grid-column:1/-1"><strong style="color:#64748b">Dirección:</strong> ${escapeHtml(p.direccion || 'N/A')}</div>
          </div>
        </div>
        
        <div style="background:#fff;border:2px solid #e2e8f0;padding:20px;border-radius:12px;margin-bottom:20px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px">
            <div><strong style="color:#64748b">Fecha:</strong> ${new Date(p.fecha).toLocaleString()}</div>
            <div><strong style="color:#64748b">Estado:</strong> 
              <select id="estadoPedido_${id}" style="padding:8px 12px;border-radius:8px;border:2px solid #e2e8f0;font-weight:600">
                <option value="pendiente" ${p.estado==='pendiente'?'selected':''}>⏳ Pendiente</option>
                <option value="en_proceso" ${p.estado==='en_proceso'?'selected':''}>🔄 En Proceso</option>
                <option value="completado" ${p.estado==='completado'?'selected':''}>✅ Completado</option>
                <option value="cancelado" ${p.estado==='cancelado'?'selected':''}>❌ Cancelado</option>
              </select>
            </div>
          </div>
          ${p.notas ? `<div style="margin-top:12px"><strong style="color:#64748b">Notas:</strong> ${escapeHtml(p.notas)}</div>` : ''}
        </div>
        
        <h4 style="margin:20px 0 10px 0;color:#333">Detalle de Productos</h4>
        ${itemsHtml}
        
        <div style="display:flex;gap:12px;margin-top:24px;justify-content:flex-end">
          <button onclick="printProveedorOrder(${id})" class="auth-btn" style="background:linear-gradient(135deg,#10b981 0%,#059669 100%)">🖨️ Imprimir</button>
          <button onclick="document.getElementById('${modalId}').remove()" class="auth-btn" style="background:#64748b">Cerrar</button>
        </div>
      </div>
    `
    document.body.appendChild(modal)
    
    // Add event listener to estado selector
    const estadoSelect = document.getElementById(`estadoPedido_${id}`)
    if (estadoSelect) {
      estadoSelect.addEventListener('change', async (e) => {
        const nuevoEstado = e.target.value
        console.log('Cambiando estado a:', nuevoEstado, 'Tipo:', typeof nuevoEstado) // DEBUG
        if (!nuevoEstado || nuevoEstado === '') {
          showMessage('Error: estado vacío', 'error')
          return
        }
        try {
          const payload = { estado: nuevoEstado }
          console.log('Enviando payload:', payload) // DEBUG
          const res = await fetch(`${API_BASE_URL}/pedidos_proveedor/${id}/estado`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
          })
          const data = await res.json()
          console.log('Respuesta servidor:', data) // DEBUG
          if (res.ok) {
            showMessage('Estado actualizado correctamente', 'success')
            loadProveedorOrders() // Reload table
          } else {
            showMessage(data.error || 'Error actualizando estado', 'error')
          }
        } catch (err) {
          console.error(err)
          showMessage('Error de red', 'error')
        }
      })
    }
  }catch(err){ console.error(err); showMessage('Error mostrando pedido','error') }
}

// Function to print proveedorOrder (called from modal)
window.printProveedorOrder = async function(id) {
  try{
    const res = await fetch(`${API_BASE_URL}/pedidos_proveedor/${id}`)
    if (!res.ok) return showMessage('No se pudo obtener pedido','error')
    const data = await res.json()
    const p = data.pedido
    
    // Calculate total
    let total = 0
    if (Array.isArray(p.items) && p.items.length > 0) {
      total = p.items.reduce((sum, it) => sum + (Number(it.cantidad) * Number(it.precio_unitario || 0)), 0)
    }
    
    let itemsHtml = ''
    if (Array.isArray(p.items) && p.items.length>0){
      itemsHtml = '<table style="width:100%;border-collapse:collapse;margin-top:20px;border:2px solid #333"><thead><tr style="background:#f3f4f6"><th style="border:1px solid #666;padding:10px;text-align:left">Producto</th><th style="border:1px solid #666;padding:10px;text-align:center">Cantidad</th><th style="border:1px solid #666;padding:10px;text-align:right">Precio Unit.</th><th style="border:1px solid #666;padding:10px;text-align:right">Subtotal</th></tr></thead><tbody>'
      p.items.forEach(it=>{ 
        const subtotal = Number(it.cantidad) * Number(it.precio_unitario || 0)
        itemsHtml += `<tr><td style="border:1px solid #666;padding:8px">${escapeHtml(it.producto_nombre)}</td><td style="border:1px solid #666;padding:8px;text-align:center">${it.cantidad}</td><td style="border:1px solid #666;padding:8px;text-align:right">$${Number(it.precio_unitario||0).toFixed(2)}</td><td style="border:1px solid #666;padding:8px;text-align:right">$${subtotal.toFixed(2)}</td></tr>` 
      })
      itemsHtml += `<tr style="font-weight:bold;background:#f9fafb"><td colspan="3" style="border:1px solid #666;padding:10px;text-align:right">TOTAL:</td><td style="border:1px solid #666;padding:10px;text-align:right">$${total.toFixed(2)}</td></tr>`
      itemsHtml += '</tbody></table>'
    }
    
    const w = window.open('', '_blank')
    w.document.write(`<!doctype html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Pedido Proveedor ${p.id}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #222; }
        .header { border: 2px solid #333; padding: 20px; margin-bottom: 20px; background: #f9fafb; }
        .header h1 { margin: 0 0 10px 0; color: #111; font-size: 24px; }
        .header h2 { margin: 0 0 15px 0; color: #6366f1; font-size: 20px; }
        .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .info-label { font-weight: bold; color: #555; min-width: 120px; }
        .divider { border-top: 2px dashed #999; margin: 15px 0; }
        @media print {
          body { padding: 10px; }
          @page { size: auto; margin: 10mm; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🏢 Soderia El Negrito</h1>
        <h2>Pedido a Proveedor #${p.id}</h2>
        <div class="divider"></div>
        <div class="info-row">
          <span class="info-label">Proveedor:</span>
          <span>${escapeHtml(p.proveedor_nombre || 'N/A')}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Contacto:</span>
          <span>${escapeHtml(p.contacto || 'N/A')}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Teléfono:</span>
          <span>${escapeHtml(p.telefono || 'N/A')}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Email:</span>
          <span>${escapeHtml(p.email || 'N/A')}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Dirección:</span>
          <span>${escapeHtml(p.direccion || 'N/A')}</span>
        </div>
        <div class="divider"></div>
        <div class="info-row">
          <span class="info-label">Fecha del pedido:</span>
          <span>${new Date(p.fecha).toLocaleString()}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Estado:</span>
          <span style="color: ${p.estado === 'completado' ? 'green' : 'orange'}; font-weight: bold;">${p.estado || 'pendiente'}</span>
        </div>
        ${p.notas ? `<div class="info-row"><span class="info-label">Notas:</span><span>${escapeHtml(p.notas)}</span></div>` : ''}
      </div>
      <h3 style="margin-bottom:10px;color:#333">Detalle de Productos</h3>
      ${itemsHtml}
    </body>
    </html>`)
    w.document.close()
    w.print()
  }catch(err){ console.error(err); showMessage('Error mostrando pedido','error') }
}

// Attach create button handler
document.addEventListener('click', (e)=>{
  if (e.target && e.target.id === 'createProveedorOrderBtn') { e.preventDefault(); createProveedorOrder() }
})


// Hoja de ruta: listar ventas/pedidos pendientes con detalle de productos
async function loadHojaRuta(){
  if (!currentUser || (currentUser.rol !== 'moderador' && currentUser.rol !== 'admin')) return showMessage('Acceso denegado','error')
  try{
    const res = await fetch(`${API_BASE_URL}/hoja_ruta`)
    if (!res.ok) {
      let txt = ''
      try { const j = await res.json(); txt = j.error || JSON.stringify(j) } catch(e){ txt = await res.text().catch(()=>res.statusText) }
      console.error('GET /api/hoja_ruta failed', res.status, txt)
      return showMessage('No se pudo cargar hoja de ruta: ' + (txt || res.statusText),'error')
    }
    const data = await res.json()
    const rows = data.hoja || []
    const tbody = document.getElementById('hojaRutaTable')?.querySelector('tbody')
    if (!tbody) return
    tbody.innerHTML = ''
    rows.forEach(r => {
      const pedidoId = r.id // id del pedido
      const tr = document.createElement('tr')
      tr.innerHTML = `
        <td>${r.venta_id}</td>
        <td>${new Date(r.fecha).toLocaleString()}</td>
        <td>${escapeHtml(r.cliente_nombre)} ${r.telefono?('('+escapeHtml(r.telefono)+')'):''}</td>
        <td>${escapeHtml(r.direccion||'')}</td>
        <td style="text-align:right;">$${Number(r.total||0).toFixed(2)}</td>
        <td>
          <select id="estadoHoja_${pedidoId}" style="padding:6px 10px;border-radius:8px;border:1px solid #e5e7eb;">
            <option value="pendiente" ${r.estado==='pendiente'||!r.estado?'selected':''}>⏳ Pendiente</option>
            <option value="enviado" ${r.estado==='enviado'?'selected':''}>🚚 Enviado</option>
            <option value="entregado" ${r.estado==='entregado'?'selected':''}>✅ Entregado</option>
          </select>
        </td>
        <td>
          <button class="auth-btn" data-pedido-id="${pedidoId}">Imprimir</button>
        </td>
      `
      tbody.appendChild(tr)
      // imprimir
      tr.querySelector('button')?.addEventListener('click', ()=>{ printHojaRuta(r) })
      // actualizar estado
      const sel = tr.querySelector(`#estadoHoja_${pedidoId}`)
      if (sel){
        sel.addEventListener('change', async (e)=>{
          const nuevo = e.target.value
          try{
            const resp = await fetch(`${API_BASE_URL}/pedidos/${pedidoId}/estado`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ estado: nuevo }) })
            const js = await resp.json().catch(()=>({}))
            if (!resp.ok){
              showMessage(js.error || 'No se pudo actualizar estado','error')
              // revert UI
              e.target.value = r.estado || 'pendiente'
            } else {
              r.estado = nuevo
              showMessage('Estado actualizado','success')
            }
          }catch(err){
            console.error('PUT estado hoja ruta', err)
            showMessage('Error de red actualizando estado','error')
            e.target.value = r.estado || 'pendiente'
          }
        })
      }
    })
  }catch(err){ console.error(err); showMessage('Error cargando hoja de ruta','error') }
}

function printHojaRuta(r){
  try{
    const w = window.open('', '_blank')
    let productosHtml = ''
    if (Array.isArray(r.productos) && r.productos.length>0){
      productosHtml = `<table style="width:100%;border-collapse:collapse;margin-top:12px;"><thead><tr><th style="text-align:left;border-bottom:2px solid #ddd;padding:8px;">Producto</th><th style="text-align:right;border-bottom:2px solid #ddd;padding:8px;">Cantidad</th><th style="text-align:right;border-bottom:2px solid #ddd;padding:8px;">Precio</th></tr></thead><tbody>`
      r.productos.forEach(p=>{
        productosHtml += `<tr><td style="padding:8px;border-bottom:1px solid #f1f1f1;">${escapeHtml(p.producto_nombre)}</td><td style="padding:8px;text-align:right;border-bottom:1px solid #f1f1f1;">${p.cantidad}</td><td style="padding:8px;text-align:right;border-bottom:1px solid #f1f1f1;">$${Number(p.precio_unitario||0).toFixed(2)}</td></tr>`
      })
      productosHtml += `</tbody></table>`
    }
    const html = `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Hoja de ruta - Venta ${r.venta_id}</title>
          <style>
            body{font-family: Arial, Helvetica, sans-serif; color:#222; margin:0; padding:20px;}
            .invoice{max-width:800px;margin:0 auto;border:1px solid #000;padding:20px;}
            .inv-header{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #222;padding-bottom:12px;margin-bottom:16px}
            .company{font-size:18px;font-weight:700}
            .meta{font-size:0.95rem;text-align:right}
            .meta div{margin-bottom:4px}
            .customer{margin-top:8px}
            table.items{width:100%;border-collapse:collapse;margin-top:12px}
            table.items th, table.items td{border:1px solid #bbb;padding:8px}
            table.items th{background:#f3f4f6;text-align:left}
            .totals{margin-top:12px;display:flex;justify-content:flex-end}
            .totals .box{width:300px}
            .right{text-align:right}
            hr.sep{border:none;border-top:1px dashed #999;margin:18px 0}
            @media print{
              body{padding:0}
              .invoice{ -webkit-print-color-adjust: exact; print-color-adjust: exact; margin:0 auto; }
              @page { size: auto; margin: 12mm; }
            }
          </style>
        </head>
        <body>
          <div class="invoice">
            <div class="inv-header">
              <div class="company">Soderia El Negrito<br><small style="font-weight:400">Hoja de ruta / Remito</small></div>
              <div class="meta">
                <div><strong>Venta:</strong> ${r.venta_id}</div>
                <div><strong>Fecha:</strong> ${new Date(r.fecha).toLocaleString()}</div>
              </div>
            </div>
            <div class="customer">
              <div><strong>Cliente:</strong> ${escapeHtml(r.cliente_nombre)}</div>
              <div><strong>Teléfono:</strong> ${escapeHtml(r.telefono||'')}</div>
              <div><strong>Dirección:</strong> ${escapeHtml(r.direccion||'')}</div>
            </div>
            ${productosHtml || '<div style="margin-top:12px;color:#64748b">No hay productos en el detalle</div>'}
            <div class="totals">
              <div class="box">
                <table style="width:100%;border-collapse:collapse">
                  <tr><td style="border:none;padding:6px">Total</td><td class="right" style="border:none;padding:6px">$${Number(r.total||0).toFixed(2)}</td></tr>
                </table>
              </div>
            </div>
            <hr class="sep">
            <div style="font-size:0.9rem;color:#374151">Imprimir y adjuntar al envío. Firma del remitente: ________________________</div>
          </div>
        </body>
      </html>`
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(()=>{ w.print(); w.close() }, 250)
  }catch(err){ console.error('Error imprimiendo hoja de ruta', err); showMessage('Error imprimiendo hoja de ruta','error') }
}

async function printPedido(id){
  try{
    const res = await fetch(`${API_BASE_URL}/pedidos/${id}`)
    if (!res.ok) return showMessage('No se pudo obtener pedido','error')
    const data = await res.json()
    const p = data.pedido
    
    // Construir tabla de productos si existen
    let productosHtml = ''
    if (Array.isArray(p.productos) && p.productos.length > 0) {
      productosHtml = '<table style="width:100%;border-collapse:collapse;margin-top:20px;border:2px solid #333"><thead><tr style="background:#f3f4f6"><th style="border:1px solid #666;padding:10px;text-align:left">Producto</th><th style="border:1px solid #666;padding:10px;text-align:center">Cantidad</th><th style="border:1px solid #666;padding:10px;text-align:right">Precio Unit.</th><th style="border:1px solid #666;padding:10px;text-align:right">Subtotal</th></tr></thead><tbody>'
      p.productos.forEach(prod => {
        const subtotal = Number(prod.cantidad) * Number(prod.precio_unitario || 0)
        productosHtml += `<tr><td style="border:1px solid #666;padding:8px">${escapeHtml(prod.producto_nombre)}</td><td style="border:1px solid #666;padding:8px;text-align:center">${prod.cantidad}</td><td style="border:1px solid #666;padding:8px;text-align:right">$${Number(prod.precio_unitario||0).toFixed(2)}</td><td style="border:1px solid #666;padding:8px;text-align:right">$${subtotal.toFixed(2)}</td></tr>`
      })
      productosHtml += `<tr style="font-weight:bold;background:#f9fafb"><td colspan="3" style="border:1px solid #666;padding:10px;text-align:right">TOTAL:</td><td style="border:1px solid #666;padding:10px;text-align:right">$${Number(p.total||0).toFixed(2)}</td></tr>`
      productosHtml += '</tbody></table>'
    }
    
    const w = window.open('', '_blank')
    const html = `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Pedido Cliente #${p.id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #222; }
            .header { border: 2px solid #333; padding: 20px; margin-bottom: 20px; background: #f9fafb; }
            .header h1 { margin: 0 0 10px 0; color: #111; font-size: 24px; }
            .header h2 { margin: 0 0 15px 0; color: #6366f1; font-size: 20px; }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
            .info-label { font-weight: bold; color: #555; min-width: 120px; }
            .divider { border-top: 2px dashed #999; margin: 15px 0; }
            .footer { margin-top: 30px; padding-top: 15px; border-top: 2px solid #e2e8f0; font-size: 0.9rem; color: #64748b; }
            .signature { margin-top: 40px; display: flex; justify-content: space-around; }
            .signature-box { text-align: center; }
            .signature-line { border-top: 2px solid #333; width: 200px; margin-top: 50px; }
            @media print {
              body { padding: 10px; }
              @page { size: auto; margin: 10mm; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🏢 Soderia El Negrito</h1>
            <h2>Pedido / Remito #${p.id}</h2>
            <div class="divider"></div>
            <div class="info-row">
              <span class="info-label">Cliente:</span>
              <span>${escapeHtml(p.cliente_nombre || 'N/A')}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Teléfono:</span>
              <span>${escapeHtml(p.telefono || 'N/A')}</span>
            </div>
            ${p.email ? `<div class="info-row"><span class="info-label">Email:</span><span>${escapeHtml(p.email)}</span></div>` : ''}
            <div class="info-row">
              <span class="info-label">Dirección de envío:</span>
              <span>${escapeHtml(p.direccion || 'N/A')}</span>
            </div>
            <div class="divider"></div>
            <div class="info-row">
              <span class="info-label">Fecha:</span>
              <span>${new Date(p.fecha).toLocaleString()}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Estado:</span>
              <span style="font-weight: bold; color: ${p.estado === 'entregado' ? 'green' : p.estado === 'enviado' ? 'orange' : '#6366f1'}">${p.estado || 'pendiente'}</span>
            </div>
          </div>
          
          <h3 style="margin-bottom:10px;color:#333">Detalle de Productos</h3>
          ${productosHtml}
          
          <div class="footer">
            <p style="margin:0 0 10px 0"><strong>Nota:</strong> Verificar productos al momento de la entrega.</p>
            <div class="signature">
              <div class="signature-box">
                <div class="signature-line"></div>
                <div style="margin-top:8px">Firma del Cliente</div>
              </div>
              <div class="signature-box">
                <div class="signature-line"></div>
                <div style="margin-top:8px">Firma del Repartidor</div>
              </div>
            </div>
          </div>
        </body>
      </html>`
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(()=>{ w.print(); w.close() }, 250)
  }catch(err){ console.error(err); showMessage('Error imprimiendo pedido','error') }
}

// Función para ver detalle del pedido con opción de cambiar estado
async function viewPedidoDetail(id){
  try{
    const res = await fetch(`${API_BASE_URL}/pedidos/${id}`)
    if (!res.ok) return showMessage('No se pudo obtener pedido','error')
    const data = await res.json()
    const p = data.pedido
    
    // Create modal for viewing and managing order
    const modalId = 'pedidoModal_' + id
    let existingModal = document.getElementById(modalId)
    if (existingModal) existingModal.remove()
    
    // Construir tabla de productos
    let productosHtml = ''
    if (Array.isArray(p.productos) && p.productos.length > 0) {
      productosHtml = '<table style="width:100%;border-collapse:collapse;margin-top:20px;border:2px solid #333"><thead><tr style="background:#f3f4f6"><th style="border:1px solid #666;padding:10px;text-align:left">Producto</th><th style="border:1px solid #666;padding:10px;text-align:center">Cantidad</th><th style="border:1px solid #666;padding:10px;text-align:right">Precio Unit.</th><th style="border:1px solid #666;padding:10px;text-align:right">Subtotal</th></tr></thead><tbody>'
      p.productos.forEach(prod => {
        const subtotal = Number(prod.cantidad) * Number(prod.precio_unitario || 0)
        productosHtml += `<tr><td style="border:1px solid #666;padding:8px">${escapeHtml(prod.producto_nombre)}</td><td style="border:1px solid #666;padding:8px;text-align:center">${prod.cantidad}</td><td style="border:1px solid #666;padding:8px;text-align:right">$${Number(prod.precio_unitario||0).toFixed(2)}</td><td style="border:1px solid #666;padding:8px;text-align:right">$${subtotal.toFixed(2)}</td></tr>`
      })
      productosHtml += `<tr style="font-weight:bold;background:#f9fafb"><td colspan="3" style="border:1px solid #666;padding:10px;text-align:right">TOTAL:</td><td style="border:1px solid #666;padding:10px;text-align:right">$${Number(p.total||0).toFixed(2)}</td></tr>`
      productosHtml += '</tbody></table>'
    }
    
    const modal = document.createElement('div')
    modal.id = modalId
    modal.className = 'modal'
    modal.style.display = 'flex'
    modal.innerHTML = `
      <div class="modal-overlay" onclick="document.getElementById('${modalId}').remove()"></div>
      <div class="modal-content" style="max-width:900px;max-height:90vh;overflow-y:auto">
        <h3 style="margin-bottom:20px;color:#6366f1">📦 Pedido Cliente #${p.id}</h3>
        
        <div style="background:#f9fafb;border:2px solid #e2e8f0;padding:20px;border-radius:12px;margin-bottom:20px">
          <h4 style="margin:0 0 15px 0;color:#111;font-size:18px">👤 Datos del Cliente</h4>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div><strong style="color:#64748b">Nombre:</strong> ${escapeHtml(p.cliente_nombre || 'N/A')}</div>
            <div><strong style="color:#64748b">Teléfono:</strong> ${escapeHtml(p.telefono || 'N/A')}</div>
            ${p.email ? `<div><strong style="color:#64748b">Email:</strong> ${escapeHtml(p.email)}</div>` : ''}
            <div style="grid-column:1/-1"><strong style="color:#64748b">Dirección:</strong> ${escapeHtml(p.direccion || 'N/A')}</div>
          </div>
        </div>
        
        <div style="background:#fff;border:2px solid #e2e8f0;padding:20px;border-radius:12px;margin-bottom:20px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px">
            <div><strong style="color:#64748b">Fecha:</strong> ${new Date(p.fecha).toLocaleString()}</div>
            <div><strong style="color:#64748b">Estado:</strong> 
              <select id="estadoPedido_${id}" style="padding:8px 12px;border-radius:8px;border:2px solid #e2e8f0;font-weight:600">
                <option value="pendiente" ${p.estado==='pendiente'?'selected':''}>⏳ Pendiente</option>
                <option value="enviado" ${p.estado==='enviado'?'selected':''}>🚚 Enviado</option>
                <option value="entregado" ${p.estado==='entregado'?'selected':''}>✅ Entregado</option>
              </select>
            </div>
          </div>
          ${p.notas ? `<div style="margin-top:12px"><strong style="color:#64748b">Notas:</strong> ${escapeHtml(p.notas)}</div>` : ''}
        </div>
        
        <h4 style="margin:20px 0 10px 0;color:#333">Detalle de Productos</h4>
        ${productosHtml}
        
        <div style="display:flex;gap:12px;margin-top:24px;justify-content:flex-end">
          <button onclick="printPedido(${id})" class="auth-btn" style="background:linear-gradient(135deg,#10b981 0%,#059669 100%)">🖨️ Imprimir</button>
          <button onclick="document.getElementById('${modalId}').remove()" class="auth-btn" style="background:#64748b">Cerrar</button>
        </div>
      </div>
    `
    document.body.appendChild(modal)
    
    // Add event listener to estado selector
    const estadoSelect = document.getElementById(`estadoPedido_${id}`)
    if (estadoSelect) {
      estadoSelect.addEventListener('change', async (e) => {
        const nuevoEstado = e.target.value
        console.log('Cambiando estado pedido a:', nuevoEstado) // DEBUG
        if (!nuevoEstado || nuevoEstado === '') {
          showMessage('Error: estado vacío', 'error')
          return
        }
        try {
          const payload = { estado: nuevoEstado }
          const res = await fetch(`${API_BASE_URL}/pedidos/${id}/estado`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
          })
          const data = await res.json()
          if (res.ok) {
            showMessage('Estado actualizado correctamente', 'success')
            loadPedidos() // Reload table
          } else {
            showMessage(data.error || 'Error actualizando estado', 'error')
          }
        } catch (err) {
          console.error(err)
          showMessage('Error de red', 'error')
        }
      })
    }
  }catch(err){ console.error(err); showMessage('Error mostrando pedido','error') }
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

    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Cargando...</td></tr>'

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
        const d = new Date(sale.fecha)
        const saleDate = localDateYYYYMMDD(d)
        return saleDate === date
      })
    }

    if (salesToShow.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #64748b;">No hay ventas para mostrar</td></tr>'
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
      
      // Determinar estado de entrega
      let estadoEntrega = 'Retiro en local'
      let estadoColor = '#64748b'
      if (sale.estado_entrega) {
        switch(sale.estado_entrega) {
          case 'pendiente':
            estadoEntrega = '📦 Pendiente'
            estadoColor = '#f59e0b'
            break
          case 'enviado':
            estadoEntrega = '🚚 En camino'
            estadoColor = '#3b82f6'
            break
          case 'entregado':
            estadoEntrega = '✅ Entregado'
            estadoColor = '#10b981'
            break
        }
      }
      
      // Determinar tipos de pago (puede haber múltiples)
      let tipoPagoDisplay = 'N/A'
      if (sale.tipos_pago) {
        const tipos = sale.tipos_pago.split(', ')
        const montos = sale.montos_pago ? sale.montos_pago.split(', ') : []
        
        const pagosFormatted = tipos.map((tipo, idx) => {
          let icon = ''
          let nombre = tipo
          switch(tipo) {
            case 'efectivo':
              icon = '💵'
              nombre = 'Efectivo'
              break
            case 'tarjeta':
              icon = '💳'
              nombre = 'Tarjeta'
              break
            case 'qr':
              icon = '📱'
              nombre = 'QR'
              break
            case 'transferencia':
              icon = '🏦'
              nombre = 'Transf.'
              break
            case 'cuenta_corriente':
              icon = '📋'
              nombre = 'Cta. Corriente'
              break
          }
          const monto = montos[idx] ? ` $${Number(montos[idx]).toFixed(2)}` : ''
          return `${icon} ${nombre}${monto}`
        })
        
        tipoPagoDisplay = pagosFormatted.join('<br>')
      }
      
      tr.innerHTML = `
        <td>${sale.id}</td>
        <td>${fecha.toLocaleDateString()} ${fecha.toLocaleTimeString()}</td>
        <td style="text-align: right;">$${total.toFixed(2)}</td>
        <td style="color: ${estadoColor}; font-weight: 500;">${estadoEntrega}</td>
        <td>${tipoPagoDisplay}</td>
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
      <td colspan="3"></td>
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

// ========== LISTAS: Productos, Clientes, Proveedores con Estados ==========

async function loadListProducts() {
  try {
    const res = await fetch(`${API_BASE_URL}/productos`)
    const data = await res.json()
    const productos = data.productos || []
    const tbody = document.getElementById('listProductsTable')?.querySelector('tbody')
    if (!tbody) return
    tbody.innerHTML = ''
    
    productos.forEach(p => {
      const tr = document.createElement('tr')
      const estadoBadge = p.estado === 'activo' 
        ? '<span style="background:#10b981;color:white;padding:4px 8px;border-radius:4px;font-size:0.85rem;font-weight:600;">✓ Activo</span>'
        : '<span style="background:#ef4444;color:white;padding:4px 8px;border-radius:4px;font-size:0.85rem;font-weight:600;">✕ Inactivo</span>'
      
      tr.innerHTML = `
        <td>${p.id}</td>
        <td>${escapeHtml(p.nombre)}</td>
        <td class="description">${escapeHtml(p.descripcion||'')}</td>
        <td>$${Number(p.precio).toFixed(2)}</td>
        <td>${p.stock}</td>
        <td>
          <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-start;">
            ${estadoBadge}
            <select class="estado-select" data-id="${p.id}" data-tipo="producto" style="padding:6px;border-radius:4px;border:1px solid #cbd5e1;font-weight:500;width:100%;">
              <option value="activo" ${p.estado==='activo'?'selected':''}>Activo</option>
              <option value="inactivo" ${p.estado==='inactivo'?'selected':''}>Inactivo</option>
            </select>
          </div>
        </td>
        <td>
          <button class="edit-btn edit-product-btn" data-id="${p.id}">Editar</button>
        </td>
      `
      tbody.appendChild(tr)
    })
    
    // Attach change handlers
    tbody.querySelectorAll('.estado-select').forEach(sel => {
      sel.addEventListener('change', async (e) => {
        const id = e.target.dataset.id
        const nuevoEstado = e.target.value
        await cambiarEstadoProducto(id, nuevoEstado)
      })
    })
    
    // Attach edit button handlers
    tbody.querySelectorAll('.edit-product-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.dataset.id
        const res = await fetch(`${API_BASE_URL}/productos`)
        const data = await res.json()
        const producto = (data.productos || []).find(p => p.id == id)
        if (producto) openEditProductModal(producto)
      })
    })
  } catch(err) {
    console.error(err)
    showMessage('Error cargando lista de productos','error')
  }
}

function openEditProductModal(p) {
  const modal = document.getElementById('editProductModal')
  if (!modal) return
  document.getElementById('editProductId').value = p.id
  document.getElementById('editNombre').value = p.nombre || ''
  document.getElementById('editDescripcion').value = p.descripcion || ''
  document.getElementById('editPrecio').value = p.precio || 0
  document.getElementById('editStock').value = p.stock || 0
  modal.style.display = 'flex'
}

async function cambiarEstadoProducto(id, estado) {
  try {
    const res = await fetch(`${API_BASE_URL}/productos/${id}/estado`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ estado })
    })
    const data = await res.json()
    if (res.ok) {
      showMessage('Estado actualizado','success')
      loadListProducts()
    } else {
      showMessage(data.error || 'Error actualizando estado','error')
    }
  } catch(err) {
    console.error(err)
    showMessage('Error de red','error')
  }
}

async function loadListClientes() {
  try {
    const res = await fetch(`${API_BASE_URL}/clientes`)
    const data = await res.json()
    const clientes = data.clientes || []
    const tbody = document.getElementById('listClientesTable')?.querySelector('tbody')
    if (!tbody) return
    tbody.innerHTML = ''
    
    // Cargar saldos de todos los clientes
    const saldosPromises = clientes.map(c => 
      fetch(`${API_BASE_URL}/cuentas-corrientes/cliente/${c.id}`)
        .then(r => r.json())
        .then(d => ({ id: c.id, saldo: Number(d.saldo_total || 0) }))
        .catch(() => ({ id: c.id, saldo: 0 }))
    )
    const saldos = await Promise.all(saldosPromises)
    const saldosMap = Object.fromEntries(saldos.map(s => [s.id, s.saldo]))
    
    clientes.forEach(c => {
      const tr = document.createElement('tr')
      let estadoBadge = ''
      if (c.estado === 'activo') {
        estadoBadge = '<span style="background:#10b981;color:white;padding:4px 8px;border-radius:4px;font-size:0.85rem;font-weight:600;">✓ Activo</span>'
      } else if (c.estado === 'deudor') {
        estadoBadge = '<span style="background:#f59e0b;color:white;padding:4px 8px;border-radius:4px;font-size:0.85rem;font-weight:600;">⚠ Deudor</span>'
      } else {
        estadoBadge = '<span style="background:#ef4444;color:white;padding:4px 8px;border-radius:4px;font-size:0.85rem;font-weight:600;">✕ Inactivo</span>'
      }
      
      const limiteCC = Number(c.limite_cuenta_corriente) || 0
      const saldoUsado = saldosMap[c.id] || 0
      const disponible = limiteCC - saldoUsado
      
      tr.innerHTML = `
        <td>${c.id}</td>
        <td>${escapeHtml(c.nombre)}</td>
        <td>${escapeHtml(c.telefono||'')}</td>
        <td>${escapeHtml(c.direccion||'')}</td>
        <td style="text-align:right;">$${limiteCC.toFixed(2)}</td>
        <td style="text-align:right;font-weight:bold;color:${disponible >= 0 ? '#10b981' : '#ef4444'};">$${disponible.toFixed(2)}</td>
        <td>
          <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-start;">
            ${estadoBadge}
            <select class="estado-select" data-id="${c.id}" data-tipo="cliente" style="padding:6px;border-radius:4px;border:1px solid #cbd5e1;font-weight:500;width:100%;">
              <option value="activo" ${c.estado==='activo'?'selected':''}>Activo</option>
              <option value="inactivo" ${c.estado==='inactivo'?'selected':''}>Inactivo</option>
              <option value="deudor" ${c.estado==='deudor'?'selected':''}>Deudor</option>
            </select>
          </div>
        </td>
        <td>
          <button class="edit-btn edit-cliente-btn" data-id="${c.id}">Editar</button>
        </td>
      `
      tbody.appendChild(tr)
    })
    
    // Attach change handlers
    tbody.querySelectorAll('.estado-select').forEach(sel => {
      sel.addEventListener('change', async (e) => {
        const id = e.target.dataset.id
        const nuevoEstado = e.target.value
        await cambiarEstadoCliente(id, nuevoEstado)
      })
    })
    
    // Attach edit button handlers
    tbody.querySelectorAll('.edit-cliente-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.dataset.id
        const res = await fetch(`${API_BASE_URL}/clientes`)
        const data = await res.json()
        const cliente = (data.clientes || []).find(c => c.id == id)
        if (cliente) openEditClienteModal(cliente)
      })
    })
  } catch(err) {
    console.error(err)
    showMessage('Error cargando lista de clientes','error')
  }
}

function openEditClienteModal(c) {
  const modal = document.getElementById('editClienteModal')
  if (!modal) return
  document.getElementById('editClienteId').value = c.id
  document.getElementById('editClienteNombre').value = c.nombre || ''
  document.getElementById('editClienteTelefono').value = c.telefono || ''
  document.getElementById('editClienteDireccion').value = c.direccion || ''
  document.getElementById('editClienteLimiteCC').value = c.limite_cuenta_corriente || 0
  modal.style.display = 'flex'
}

async function cambiarEstadoCliente(id, estado) {
  try {
    const res = await fetch(`${API_BASE_URL}/clientes/${id}/estado`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ estado })
    })
    const data = await res.json()
    if (res.ok) {
      showMessage('Estado actualizado','success')
      loadListClientes()
    } else {
      showMessage(data.error || 'Error actualizando estado','error')
    }
  } catch(err) {
    console.error(err)
    showMessage('Error de red','error')
  }
}

async function loadListProveedores() {
  try {
    const proveedores = await loadProveedores() // Reusa función existente
    const tbody = document.getElementById('listProveedoresTable')?.querySelector('tbody')
    if (!tbody) return
    tbody.innerHTML = ''
    
    proveedores.forEach(p => {
      const tr = document.createElement('tr')
      const estadoBadge = p.estado === 'activo' 
        ? '<span style="background:#10b981;color:white;padding:4px 8px;border-radius:4px;font-size:0.85rem;font-weight:600;">✓ Activo</span>'
        : '<span style="background:#ef4444;color:white;padding:4px 8px;border-radius:4px;font-size:0.85rem;font-weight:600;">✕ Inactivo</span>'
      
      tr.innerHTML = `
        <td>${p.id}</td>
        <td>${escapeHtml(p.nombre)}</td>
        <td>${escapeHtml(p.contacto||'')}</td>
        <td>${escapeHtml(p.telefono||'')}</td>
        <td>${escapeHtml(p.email||'')}</td>
        <td>
          <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-start;">
            ${estadoBadge}
            <select class="estado-select" data-id="${p.id}" data-tipo="proveedor" style="padding:6px;border-radius:4px;border:1px solid #cbd5e1;font-weight:500;width:100%;">
              <option value="activo" ${p.estado==='activo'?'selected':''}>Activo</option>
              <option value="inactivo" ${p.estado==='inactivo'?'selected':''}>Inactivo</option>
            </select>
          </div>
        </td>
        <td>
          <button class="edit-btn edit-proveedor-btn" data-id="${p.id}">Editar</button>
        </td>
      `
      tbody.appendChild(tr)
    })
    
    // Attach change handlers
    tbody.querySelectorAll('.estado-select').forEach(sel => {
      sel.addEventListener('change', async (e) => {
        const id = e.target.dataset.id
        const nuevoEstado = e.target.value
        await cambiarEstadoProveedor(id, nuevoEstado)
      })
    })
    
    // Attach edit button handlers
    tbody.querySelectorAll('.edit-proveedor-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.dataset.id
        const proveedores = await loadProveedores()
        const proveedor = proveedores.find(p => p.id == id)
        if (proveedor) openEditProveedorModal(proveedor)
      })
    })
  } catch(err) {
    console.error(err)
    showMessage('Error cargando lista de proveedores','error')
  }
}

function openEditProveedorModal(p) {
  const modal = document.getElementById('editProveedorModal')
  if (!modal) return
  document.getElementById('editProveedorId').value = p.id
  document.getElementById('editProveedorNombre').value = p.nombre || ''
  document.getElementById('editProveedorContacto').value = p.contacto || ''
  document.getElementById('editProveedorTelefono').value = p.telefono || ''
  document.getElementById('editProveedorEmail').value = p.email || ''
  document.getElementById('editProveedorDireccion').value = p.direccion || ''
  modal.style.display = 'flex'
}

async function cambiarEstadoProveedor(id, estado) {
  try {
    const res = await fetch(`${API_BASE_URL}/proveedores/${id}/estado`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ estado })
    })
    const data = await res.json()
    if (res.ok) {
      showMessage('Estado actualizado','success')
      loadListProveedores()
    } else {
      showMessage(data.error || 'Error actualizando estado','error')
    }
  } catch(err) {
    console.error(err)
    showMessage('Error de red','error')
  }
}

// ========== HISTORIAL DE PRECIOS ==========

function initHistorialSection() {
  const searchInput = document.getElementById('historialProductoSearch')
  const searchBtn = document.getElementById('historialSearchBtn')
  
  if (searchInput) {
    searchInput.value = ''
    searchInput.focus()
  }
  
  // Limpiar resultados previos
  document.getElementById('historialProductoInfo').style.display = 'none'
  document.getElementById('historialTable').style.display = 'none'
  document.getElementById('historialEmpty').style.display = 'block'
  
  // Event listeners
  if (searchBtn) {
    searchBtn.addEventListener('click', buscarHistorialProducto)
  }
  
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        buscarHistorialProducto()
      }
    })
  }
}

async function buscarHistorialProducto() {
  const searchInput = document.getElementById('historialProductoSearch')
  const query = (searchInput?.value || '').trim()
  
  if (!query) {
    showMessage('Ingresa el nombre de un producto', 'error')
    return
  }
  
  try {
    // Buscar productos por nombre
    const res = await fetch(`${API_BASE_URL}/productos`)
    const data = await res.json()
    const productos = (data.productos || []).filter(p => 
      p.nombre.toLowerCase().includes(query.toLowerCase())
    )
    
    if (productos.length === 0) {
      showMessage('No se encontró ningún producto con ese nombre', 'error')
      document.getElementById('historialProductoInfo').style.display = 'none'
      document.getElementById('historialTable').style.display = 'none'
      document.getElementById('historialEmpty').style.display = 'block'
      return
    }
    
    // Si hay múltiples resultados, usar el primero
    const producto = productos[0]
    
    if (productos.length > 1) {
      showMessage(`Se encontraron ${productos.length} productos. Mostrando: ${producto.nombre}`, 'success')
    }
    
    // Cargar historial del producto
    await cargarHistorialProducto(producto)
    
  } catch (err) {
    console.error(err)
    showMessage('Error buscando producto', 'error')
  }
}

async function cargarHistorialProducto(producto) {
  try {
    console.log('Cargando historial para producto:', producto)
    const res = await fetch(`${API_BASE_URL}/productos/${producto.id}/historial`)
    console.log('Response status:', res.status)
    const data = await res.json()
    console.log('Historial data:', data)
    const historial = data.historial || []
    console.log('Historial array:', historial, 'Length:', historial.length)
    
    // Mostrar info del producto
    document.getElementById('historialProductoNombre').textContent = producto.nombre
    document.getElementById('historialPrecioActual').textContent = `$${Number(producto.precio).toFixed(2)}`
    document.getElementById('historialProductoInfo').style.display = 'block'
    
    const tbody = document.getElementById('historialTable')?.querySelector('tbody')
    console.log('tbody encontrado:', !!tbody)
    if (!tbody) return
    
    tbody.innerHTML = ''
    
    if (historial.length === 0) {
      console.log('No hay historial, mostrando mensaje vacío')
      document.getElementById('historialTable').style.display = 'none'
      document.getElementById('historialEmpty').innerHTML = '<p>📋 Este producto no tiene cambios registrados</p>'
      document.getElementById('historialEmpty').style.display = 'block'
      return
    }
    
    document.getElementById('historialEmpty').style.display = 'none'
    document.getElementById('historialTable').style.display = 'table'
    
    historial.forEach(h => {
      const tr = document.createElement('tr')
      
      // Formatear fecha
      const fecha = new Date(h.fecha_cambio)
      const fechaStr = fecha.toLocaleString('es-AR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
      
      // Detectar cambios en precio
      const precioChanged = Number(h.precio_anterior) !== Number(h.precio_nuevo)
      const stockChanged = Number(h.stock_anterior) !== Number(h.stock_nuevo)
      const nombreChanged = h.nombre_anterior !== h.nombre_nuevo
      
      tr.innerHTML = `
        <td>${fechaStr}</td>
        <td><strong>${escapeHtml(h.usuario_nombre || 'Desconocido')}</strong></td>
        <td>
          ${nombreChanged 
            ? `<span style="color:#ef4444;">${escapeHtml(h.nombre_anterior)}</span> → <span style="color:#10b981;">${escapeHtml(h.nombre_nuevo)}</span>` 
            : escapeHtml(h.nombre_nuevo || h.nombre_anterior)
          }
        </td>
        <td style="${precioChanged ? 'background:#fee;' : ''}">$${Number(h.precio_anterior).toFixed(2)}</td>
        <td style="${precioChanged ? 'background:#efe;font-weight:bold;' : ''}">$${Number(h.precio_nuevo).toFixed(2)}</td>
        <td style="${stockChanged ? 'background:#fee;' : ''}">${h.stock_anterior}</td>
        <td style="${stockChanged ? 'background:#efe;font-weight:bold;' : ''}">${h.stock_nuevo}</td>
      `
      
      tbody.appendChild(tr)
    })
    
  } catch (err) {
    console.error(err)
    showMessage('Error cargando historial', 'error')
  }
}

// ========== CUENTAS CORRIENTES ==========

function initCuentasCorrientesSection() {
  hideAllSections()
  const section = document.getElementById('listCuentasCorrientesSection')
  if (section) section.style.display = 'block'
  
  cargarCuentasCorrientes()
  
  // Configurar filtro
  const filtro = document.getElementById('filtroCuentas')
  if (filtro) {
    const newFiltro = filtro.cloneNode(true)
    filtro.parentNode.replaceChild(newFiltro, filtro)
    newFiltro.addEventListener('change', () => {
      cargarCuentasCorrientes()
    })
  }
  
  // Configurar botón actualizar estados
  const btnActualizar = document.getElementById('btnActualizarEstadoCuentas')
  if (btnActualizar) {
    // Remover listeners anteriores
    const newBtn = btnActualizar.cloneNode(true)
    btnActualizar.parentNode.replaceChild(newBtn, btnActualizar)
    
    newBtn.addEventListener('click', async () => {
      await actualizarEstadosCuentas()
    })
  }
  
  // Configurar modal de pago
  const pagarForm = document.getElementById('pagarCuentaForm')
  const cancelBtn = document.getElementById('cancelPagarCuentaBtn')
  
  if (cancelBtn) {
    const newCancelBtn = cancelBtn.cloneNode(true)
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn)
    newCancelBtn.addEventListener('click', () => {
      document.getElementById('pagarCuentaModal').style.display = 'none'
    })
  }
  
  if (pagarForm) {
    const newForm = pagarForm.cloneNode(true)
    pagarForm.parentNode.replaceChild(newForm, pagarForm)
    
    newForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      
      const cuentaId = document.getElementById('pagarCuentaId').value
      const monto = Number(document.getElementById('pagarCuentaMonto').value)
      const notas = document.getElementById('pagarCuentaNotas').value
      
      if (!cuentaId || monto <= 0) {
        return showMessage('Verifica los datos del pago', 'error')
      }
      
      try {
        const res = await fetch(`${API_BASE_URL}/cuentas-corrientes/pago`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cuenta_corriente_id: Number(cuentaId),
            monto_pagado: monto,
            usuario_id: currentUser.id,
            notas: notas || null
          })
        })
        
        const data = await res.json()
        if (res.ok) {
          showMessage('Pago registrado exitosamente', 'success')
          document.getElementById('pagarCuentaModal').style.display = 'none'
          newForm.reset()
          cargarCuentasCorrientes()
        } else {
          showMessage(data.error || 'Error al registrar pago', 'error')
        }
      } catch (err) {
        console.error(err)
        showMessage('Error de red', 'error')
      }
    })
  }
}

async function cargarCuentasCorrientes() {
  try {
    const filtro = document.getElementById('filtroCuentas')?.value || 'activas'
    const res = await fetch(`${API_BASE_URL}/cuentas-corrientes?filter=${filtro}`)
    if (!res.ok) throw new Error('Error cargando cuentas')
    
    const cuentas = await res.json()
    
    const tbody = document.getElementById('cuentasCorrientesTable')?.querySelector('tbody')
    if (!tbody) return
    
    tbody.innerHTML = ''
    
    if (cuentas.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:#64748b;">No hay cuentas corrientes registradas</td></tr>'
      return
    }
    
    cuentas.forEach(c => {
      const tr = document.createElement('tr')
      
      // Badge de estado
      let estadoBadge = ''
      if (c.estado === 'pendiente') {
        estadoBadge = '<span style="background:#fbbf24;color:white;padding:4px 8px;border-radius:4px;font-size:0.85rem;font-weight:600;">⏳ Pendiente</span>'
      } else if (c.estado === 'vencida') {
        estadoBadge = '<span style="background:#ef4444;color:white;padding:4px 8px;border-radius:4px;font-size:0.85rem;font-weight:600;">❌ Vencida</span>'
      } else if (c.estado === 'pagada') {
        estadoBadge = '<span style="background:#10b981;color:white;padding:4px 8px;border-radius:4px;font-size:0.85rem;font-weight:600;">✓ Pagada</span>'
      }
      
      // Formatear fecha de vencimiento
      const fechaVenc = new Date(c.fecha_vencimiento)
      const fechaStr = fechaVenc.toLocaleDateString('es-AR')
      
      // Botones de acción
      let accionBtns = ''
      if (c.estado !== 'pagada' && Number(c.saldo_pendiente) > 0) {
        accionBtns += `<button class="auth-btn pagar-cuenta-btn" data-cuenta='${JSON.stringify(c).replace(/'/g, "&apos;")}' style="font-size:0.85rem;padding:6px 10px;margin-right:4px;">💰 Pagar</button>`
      }
      if (c.estado === 'pendiente' || c.estado === 'vencida') {
        accionBtns += `<button class="auth-btn marcar-pagada-btn" data-id="${c.id}" style="font-size:0.85rem;padding:6px 10px;background:#10b981;">✓ Pagada</button>`
      }
      
      tr.innerHTML = `
        <td>${escapeHtml(c.cliente_nombre)}</td>
        <td>#${c.venta_id}</td>
        <td style="text-align:right;">$${Number(c.monto).toFixed(2)}</td>
        <td style="text-align:right;font-weight:bold;">$${Number(c.saldo_pendiente).toFixed(2)}</td>
        <td>${fechaStr}</td>
        <td>${estadoBadge}</td>
        <td>${accionBtns}</td>
      `
      
      tbody.appendChild(tr)
    })
    
    // Agregar listeners a botones
    tbody.querySelectorAll('.pagar-cuenta-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const cuentaData = JSON.parse(e.target.dataset.cuenta)
        abrirModalPago(cuentaData)
      })
    })
    
    tbody.querySelectorAll('.marcar-pagada-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.dataset.id
        if (!confirm('¿Marcar esta cuenta como pagada?')) return
        
        try {
          const res = await fetch(`${API_BASE_URL}/cuentas-corrientes/${id}/estado`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: 'pagada' })
          })
          
          if (!res.ok) throw new Error('Error actualizando estado')
          
          alert('Cuenta marcada como pagada')
          cargarCuentasCorrientes()
        } catch (err) {
          alert('Error: ' + err.message)
        }
      })
    })
    
  } catch (err) {
    console.error(err)
    showMessage('Error cargando cuentas corrientes', 'error')
  }
}

function abrirModalPago(cuenta) {
  const modal = document.getElementById('pagarCuentaModal')
  if (!modal) return
  
  document.getElementById('pagarCuentaId').value = cuenta.id
  document.getElementById('pagarCuentaCliente').value = cuenta.cliente_nombre
  document.getElementById('pagarCuentaSaldo').value = `$${Number(cuenta.saldo_pendiente).toFixed(2)}`
  document.getElementById('pagarCuentaMonto').value = Number(cuenta.saldo_pendiente).toFixed(2)
  document.getElementById('pagarCuentaMonto').max = Number(cuenta.saldo_pendiente).toFixed(2)
  document.getElementById('pagarCuentaNotas').value = ''
  
  modal.style.display = 'flex'
}

async function actualizarEstadosCuentas() {
  try {
    showMessage('Actualizando estados de cuentas...', 'info')
    
    const res = await fetch(`${API_BASE_URL}/cuentas-corrientes`)
    if (!res.ok) throw new Error('Error cargando cuentas')
    
    const data = await res.json()
    const cuentas = (data.cuentas || []).filter(c => c.estado === 'pendiente')
    
    const ahora = new Date()
    let actualizadas = 0
    let clientesDeudores = new Set()
    
    for (const cuenta of cuentas) {
      const fechaVenc = new Date(cuenta.fecha_vencimiento)
      
      if (fechaVenc < ahora && Number(cuenta.saldo_pendiente) > 0) {
        // Actualizar estado de cuenta a vencida
        const resUpdate = await fetch(`${API_BASE_URL}/cuentas-corrientes/${cuenta.id}/estado`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado: 'vencida' })
        })
        
        if (resUpdate.ok) {
          actualizadas++
          clientesDeudores.add(cuenta.cliente_id)
        }
      }
    }
    
    // Actualizar clientes a estado deudor
    for (const clienteId of clientesDeudores) {
      await fetch(`${API_BASE_URL}/clientes/${clienteId}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'deudor' })
      })
    }
    
    if (actualizadas > 0) {
      showMessage(`Se actualizaron ${actualizadas} cuentas vencidas`, 'success')
      cargarCuentasCorrientes()
    } else {
      showMessage('No hay cuentas vencidas para actualizar', 'info')
    }
    
  } catch (err) {
    console.error(err)
    showMessage('Error actualizando estados', 'error')
  }
}

// Start
init()

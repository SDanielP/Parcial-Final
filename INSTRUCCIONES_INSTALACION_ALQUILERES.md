# 🚀 Pasos para Completar la Instalación de Alquileres

## ✅ Lo que ya está hecho:

1. ✅ Endpoints agregados al backend (`src/routes/index.js`)
2. ✅ Interfaz HTML agregada (`index.html`)
3. ✅ JavaScript funcional agregado (`script.js`)
4. ✅ Estilos CSS agregados (`styles.css`)
5. ✅ Enlace en menú "Utilidades → Alquileres"

## ⚠️ Falta ejecutar la migración de Base de Datos

### Opción 1: Desde phpMyAdmin (RECOMENDADO)

1. Abre tu navegador y ve a: http://localhost/phpmyadmin
2. Selecciona la base de datos `negocio_db`
3. Click en la pestaña **"SQL"**
4. Abre el archivo `migration_alquiler_dispensers.sql` con un editor de texto
5. Copia TODO el contenido del archivo
6. Pégalo en la ventana de phpMyAdmin
7. Click en **"Continuar"** o **"Go"**
8. Deberías ver: "✅ 4 tablas creadas correctamente"

### Opción 2: Desde línea de comandos (si tienes MySQL en PATH)

```bash
# Desde la carpeta del proyecto:
mysql -u root -p negocio_db < migration_alquiler_dispensers.sql
```

### Opción 3: Desde XAMPP Control Panel

1. Abre XAMPP Control Panel
2. Click en "Shell" (botón a la derecha)
3. En la terminal que se abre, ejecuta:
```bash
cd "C:\Users\SilvioTec\Desktop\Nueva carpeta\Parcial"
mysql -u root negocio_db < migration_alquiler_dispensers.sql
```

## 🧪 Verificar que funcionó

Una vez ejecutada la migración, ve a phpMyAdmin y verifica que existan estas 4 tablas:

- ✅ `dispensers`
- ✅ `alquileres_dispenser`
- ✅ `pagos_alquiler`
- ✅ `mantenimientos_dispenser`

## 🎯 Probar el Sistema

1. Reinicia el servidor Node.js:
```bash
node src/app.js
```

2. Abre el navegador en: http://localhost:3000 (o el puerto que uses)

3. Inicia sesión con un usuario **moderador** o **admin**

4. Ve a: **Utilidades → Alquileres**

5. Deberías ver la interfaz con 4 tabs:
   - Alquileres Activos
   - Pagos Pendientes
   - Dispensers
   - Resumen

## 📋 Datos de Prueba

La migración ya incluye 3 dispensers de ejemplo:
- DISP-001 (Drago Classic - $500/mes)
- DISP-002 (Drago Premium - $700/mes)
- DISP-003 (Drago Classic - $500/mes)

## 🔍 Solución de Problemas

### Error: "Table doesn't exist"
→ No ejecutaste la migración. Ve a phpMyAdmin y ejecuta el SQL.

### No aparece el menú "Alquileres"
→ Asegúrate de estar logueado como moderador o admin.

### Error al crear alquiler
→ Verifica que:
  1. Tengas clientes creados
  2. Tengas dispensers disponibles
  3. La caja esté abierta (para registrar pagos)

### Dispensers no aparecen
→ Refresca la página (Ctrl + Shift + R)

## 📞 ¿Todo listo?

Si completaste la migración, el sistema de alquileres está 100% funcional! 🎉

Puedes:
- ✅ Agregar dispensers
- ✅ Crear alquileres
- ✅ Cobrar pagos mensuales
- ✅ Ver resumen y reportes
- ✅ Gestionar estados

---

**Siguiente paso:** Ejecutar la migración SQL y luego reiniciar el servidor.

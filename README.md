Se adjunta el manual de usuario del proyecto
https://drive.google.com/file/d/1sZU073kJouFDToF4YEjqqfuX-ahpB2g8/view?usp=sharing

## Configuración

1. Copia el archivo `.env.example` a `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edita el archivo `.env` con tus credenciales de base de datos:
   ```
   DB_HOST=localhost
   DB_USER=tu_usuario
   DB_PASSWORD=tu_contraseña
   DB_NAME=negocio_db
   DB_PORT=3306
   ```

3. Instala las dependencias:
   ```bash
   npm install
   ```

4. Inicia el servidor:
   ```bash
   npm start
   ```

## Nota de Privacidad

El archivo `.env` contiene información sensible y está excluido del repositorio por seguridad. Nunca compartas tus credenciales de base de datos.

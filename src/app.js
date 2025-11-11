const express = require('express');
const app = express();
const pool = require('./db');
const routes = require('./routes');
require('dotenv').config();
const cors = require('cors');

app.use(cors()); // Habilita CORS para todas las rutas
app.use(express.json());
app.use('/api', routes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

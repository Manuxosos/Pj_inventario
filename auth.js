const jwt     = require('jsonwebtoken');
const bcrypt  = require('bcryptjs');
const { pool } = require('./database');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET no está definido en el .env. Define una clave larga y aleatoria antes de iniciar el servidor.');
}
const JWT_EXPIRES = '8h';
const JWT_ALGORITHM = 'HS256';

// Bloqueo por cuenta: complementa el rate limiting por IP, que no frena un
// ataque distribuido (muchas IPs) contra una sola cuenta.
const LOGIN_MAX_INTENTOS = 5;
const LOGIN_BLOQUEO_MIN = 15;

async function login(usuario, password) {
  const { rows } = await pool.query(
    'SELECT * FROM usuarios WHERE usuario = $1 AND activo = true',
    [usuario]
  );
  const user = rows[0];
  if (!user) return null;

  if (user.bloqueado_hasta && new Date(user.bloqueado_hasta) > new Date()) {
    const err = new Error('Cuenta bloqueada temporalmente por demasiados intentos fallidos. Prueba de nuevo más tarde.');
    err.bloqueado = true;
    throw err;
  }

  if (!bcrypt.compareSync(password, user.password_hash)) {
    const intentos = user.intentos_fallidos + 1;
    if (intentos >= LOGIN_MAX_INTENTOS) {
      await pool.query(
        `UPDATE usuarios SET intentos_fallidos = 0, bloqueado_hasta = NOW() + make_interval(mins => $2) WHERE id = $1`,
        [user.id, LOGIN_BLOQUEO_MIN]
      );
    } else {
      await pool.query('UPDATE usuarios SET intentos_fallidos = $2 WHERE id = $1', [user.id, intentos]);
    }
    return null;
  }

  if (user.intentos_fallidos > 0 || user.bloqueado_hasta) {
    await pool.query('UPDATE usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = $1', [user.id]);
  }

  return jwt.sign(
    { id: user.id, usuario: user.usuario, rol: user.rol, nombre: user.nombre, edificio_id: user.edificio_id },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES, algorithm: JWT_ALGORITHM }
  );
}

function verificarToken(req, res, next) {
  const auth  = req.headers['authorization'];
  const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  try {
    req.user = jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALGORITHM] });
    next();
  } catch {
    res.status(401).json({ error: 'Sesión expirada' });
  }
}

module.exports = { login, verificarToken };

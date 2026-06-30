const jwt     = require('jsonwebtoken');
const bcrypt  = require('bcryptjs');
const { pool } = require('./database');
require('dotenv').config();

const JWT_SECRET  = process.env.JWT_SECRET || 'REDACTED_SECRET';
const JWT_EXPIRES = '8h';

async function login(usuario, password) {
  const { rows } = await pool.query(
    'SELECT * FROM usuarios WHERE usuario = $1 AND activo = true',
    [usuario]
  );
  const user = rows[0];
  if (!user) return null;
  if (!bcrypt.compareSync(password, user.password_hash)) return null;
  return jwt.sign(
    { id: user.id, usuario: user.usuario, rol: user.rol, nombre: user.nombre },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

function verificarToken(req, res, next) {
  const auth  = req.headers['authorization'];
  const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Sesión expirada' });
  }
}

module.exports = { login, verificarToken };

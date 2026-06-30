const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const JWT_SECRET  = process.env.JWT_SECRET   || 'inventarioIT_secret_2025_xK9#mP2';
const JWT_EXPIRES = '8h';
const USUARIO     = process.env.APP_USER     || 'admin';
const PASSWORD_HASH = bcrypt.hashSync(process.env.APP_PASSWORD || 'inventario2025', 10);

function login(usuario, password) {
  if (usuario !== USUARIO) return null;
  if (!bcrypt.compareSync(password, PASSWORD_HASH)) return null;
  return jwt.sign({ usuario }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
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

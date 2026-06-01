const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = 'REDACTED_SECRET';
const JWT_EXPIRES = '8h';

// Usuario admin — cambia la contraseña aquí
const USUARIO = 'admin';
const PASSWORD_HASH = bcrypt.hashSync('REDACTED_PASSWORD', 10);

function login(usuario, password) {
  if (usuario !== USUARIO) return null;
  if (!bcrypt.compareSync(password, PASSWORD_HASH)) return null;
  return jwt.sign({ usuario }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function verificarToken(req, res, next) {
  const auth = req.headers['authorization'];
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

const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'inventory.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS equipos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_activo TEXT,
    cargador TEXT,
    id_ex TEXT,
    team TEXT,
    marca_modelo TEXT,
    procesador TEXT,
    ram TEXT,
    disco_duro TEXT,
    so TEXT,
    numero_serie TEXT UNIQUE,
    usuario TEXT,
    estado TEXT,
    observacion TEXT,
    responsable TEXT,
    audifonos TEXT,
    mouse TEXT,
    monitor TEXT,
    adaptador_tplink TEXT,
    estuche TEXT,
    piso TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TRIGGER IF NOT EXISTS equipos_updated_at
  AFTER UPDATE ON equipos
  BEGIN
    UPDATE equipos SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;
`);

module.exports = db;

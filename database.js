const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'inventario',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS equipos (
      id               SERIAL PRIMARY KEY,
      id_activo        TEXT DEFAULT '',
      cargador         TEXT DEFAULT '',
      id_ex            TEXT DEFAULT '',
      team             TEXT DEFAULT '',
      marca_modelo     TEXT DEFAULT '',
      procesador       TEXT DEFAULT '',
      ram              TEXT DEFAULT '',
      disco_duro       TEXT DEFAULT '',
      so               TEXT DEFAULT '',
      numero_serie     TEXT UNIQUE,
      usuario          TEXT DEFAULT '',
      estado           TEXT DEFAULT '',
      observacion      TEXT DEFAULT '',
      responsable      TEXT DEFAULT '',
      audifonos        TEXT DEFAULT '',
      mouse            TEXT DEFAULT '',
      monitor          TEXT DEFAULT '',
      adaptador_tplink TEXT DEFAULT '',
      estuche          TEXT DEFAULT '',
      piso             TEXT DEFAULT '',
      created_at       TIMESTAMPTZ DEFAULT NOW(),
      updated_at       TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id            SERIAL PRIMARY KEY,
      nombre        TEXT NOT NULL,
      usuario       TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      rol           TEXT NOT NULL CHECK (rol IN ('admin', 'it', 'observador')),
      activo        BOOLEAN DEFAULT true,
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE OR REPLACE FUNCTION fn_set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
    $$ LANGUAGE plpgsql
  `);

  await pool.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_equipos_updated_at'
      ) THEN
        CREATE TRIGGER trg_equipos_updated_at
        BEFORE UPDATE ON equipos
        FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
      END IF;
    END $$
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS historial_equipos (
      id             SERIAL PRIMARY KEY,
      equipo_id      INTEGER REFERENCES equipos(id) ON DELETE CASCADE,
      equipo_label   TEXT DEFAULT '',
      usuario_id     INTEGER,
      usuario_nombre TEXT DEFAULT '',
      campo          TEXT NOT NULL,
      valor_ant      TEXT DEFAULT '',
      valor_nuevo    TEXT DEFAULT '',
      nota           TEXT DEFAULT '',
      created_at     TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tareas (
      id              SERIAL PRIMARY KEY,
      titulo          TEXT NOT NULL,
      descripcion     TEXT DEFAULT '',
      estado          TEXT NOT NULL DEFAULT 'Pendiente'
                      CHECK (estado IN ('Pendiente','En curso','Finalizado','Cancelado')),
      piso            TEXT DEFAULT '',
      asignado_id     INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      asignado_nombre TEXT DEFAULT '',
      creado_id       INTEGER,
      creado_nombre   TEXT DEFAULT '',
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      updated_at      TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_tareas_updated_at'
      ) THEN
        CREATE TRIGGER trg_tareas_updated_at
        BEFORE UPDATE ON tareas
        FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
      END IF;
    END $$
  `);

  // Crear admin por defecto si no hay usuarios
  const { rows } = await pool.query('SELECT COUNT(*) n FROM usuarios');
  if (parseInt(rows[0].n) === 0) {
    if (!process.env.APP_USER || !process.env.APP_PASSWORD) {
      throw new Error('APP_USER y APP_PASSWORD deben estar definidos en el .env para crear el admin inicial.');
    }
    const hash = bcrypt.hashSync(process.env.APP_PASSWORD, 10);
    await pool.query(
      "INSERT INTO usuarios (nombre, usuario, password_hash, rol) VALUES ($1, $2, $3, 'admin')",
      ['Administrador', process.env.APP_USER, hash]
    );
    console.log('Usuario admin creado por defecto.');
  }

  console.log('Schema listo.');
}

const initPromise = initSchema().catch(err => {
  console.error('Error inicializando schema PostgreSQL:', err.message);
  process.exit(1);
});

module.exports = { pool, initPromise };

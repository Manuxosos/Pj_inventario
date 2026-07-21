const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');
const bcrypt  = require('bcryptjs');
const ExcelJS = require('exceljs');
require('dotenv').config();

const { pool, initPromise } = require('./database');
const { login, verificarToken } = require('./auth');

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',').map(s => s.trim());
app.use(cors({ origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins }));
app.use(express.json());

// ── Middleware de roles ───────────────────────────────────────────────────────
function requireRol(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.rol)) {
      return res.status(403).json({ error: 'No tienes permisos para esta acción' });
    }
    next();
  };
}

// ── Helper parámetros pg ──────────────────────────────────────────────────────
function mkParams() {
  const params = [];
  const add = v => { params.push(v); return `$${params.length}`; };
  return { params, add };
}

const ACCESORIO_COLS  = ['cargador','mouse','audifonos','monitor','estuche','adaptador_tplink'];
const EQUIPO_FIELDS   = [
  'id_activo','cargador','id_ex','team','marca_modelo','procesador',
  'ram','disco_duro','so','numero_serie','usuario','estado',
  'observacion','responsable','audifonos','mouse','monitor',
  'adaptador_tplink','estuche','piso',
];

const CAMPO_LABEL = {
  id_activo:'ID Activo', cargador:'Cargador', id_ex:'ID EX', team:'Team / Agente',
  marca_modelo:'Marca / Modelo', procesador:'Procesador', ram:'RAM',
  disco_duro:'Disco Duro', so:'Sistema Operativo', numero_serie:'Nº de Serie',
  usuario:'Usuario asignado', estado:'Estado', observacion:'Observación',
  responsable:'Responsable', audifonos:'Audífonos', mouse:'Mouse',
  monitor:'Monitor', adaptador_tplink:'Adaptador Tp-Link', estuche:'Estuche', piso:'Piso',
};

// ── Login (público) ───────────────────────────────────────────────────────────
app.post('/api/login', async (req, res) => {
  try {
    const { usuario, password } = req.body;
    const token = await login(usuario, password);
    if (!token) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Rutas protegidas (requieren token) ────────────────────────────────────────
app.use('/api', verificarToken);

// GET /api/equipos
app.get('/api/equipos', async (req, res) => {
  try {
    const { piso, estado, estadoIn, search, ram, modelo, accesorio, responsable } = req.query;
    const { params, add } = mkParams();
    let q = 'SELECT * FROM equipos WHERE TRUE';

    if (piso)   q += ` AND piso = ${add(piso)}`;
    if (estado) q += ` AND estado = ${add(estado)}`;
    if (responsable) q += ` AND UPPER(TRIM(responsable)) = ${add(responsable.trim().toUpperCase())}`;
    if (estadoIn) {
      const vals = estadoIn.split(',').map(s => s.trim()).filter(Boolean);
      if (vals.length) q += ` AND estado IN (${vals.map(v => add(v)).join(',')})`;
    }
    if (ram)    q += ` AND ram = ${add(ram)}`;
    if (modelo) q += ` AND marca_modelo = ${add(modelo)}`;
    if (accesorio && ACCESORIO_COLS.includes(accesorio)) {
      q += ` AND (${accesorio} = 'Si' OR ${accesorio} = 'Si 2')`;
    }
    if (search) {
      const s = `%${search}%`;
      q += ` AND (id_activo ILIKE ${add(s)} OR numero_serie ILIKE ${add(s)} OR marca_modelo ILIKE ${add(s)} OR team ILIKE ${add(s)} OR responsable ILIKE ${add(s)})`;
    }
    q += ' ORDER BY piso, id_activo';

    const { rows } = await pool.query(q, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/equipos/:id
app.get('/api/equipos/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM equipos WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/equipos — solo admin e IT
app.post('/api/equipos', requireRol('admin', 'it'), async (req, res) => {
  try {
    const vals = EQUIPO_FIELDS.map(f => {
      const v = req.body[f] ?? '';
      return (f === 'numero_serie' && v === '') ? null : v;
    });
    const placeholders = vals.map((_, i) => `$${i + 1}`).join(',');
    const { rows } = await pool.query(
      `INSERT INTO equipos (${EQUIPO_FIELDS.join(',')}) VALUES (${placeholders}) RETURNING id`,
      vals
    );
    const newId = rows[0].id;
    const label = req.body.id_activo || req.body.numero_serie || String(newId);
    await pool.query(
      `INSERT INTO historial_equipos (equipo_id, equipo_label, usuario_id, usuario_nombre, campo, valor_ant, valor_nuevo)
       VALUES ($1,$2,$3,$4,'creacion','','Equipo registrado')`,
      [newId, label, req.user.id, req.user.nombre || req.user.usuario]
    );
    res.status(201).json({ id: newId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/equipos/:id — solo admin e IT
app.put('/api/equipos/:id', requireRol('admin', 'it'), async (req, res) => {
  try {
    const { rows: [old] } = await pool.query('SELECT * FROM equipos WHERE id = $1', [req.params.id]);
    if (!old) return res.status(404).json({ error: 'No encontrado' });

    const vals = EQUIPO_FIELDS.map(f => {
      const v = req.body[f] ?? '';
      return (f === 'numero_serie' && v === '') ? null : v;
    });
    vals.push(req.params.id);
    const sets = EQUIPO_FIELDS.map((f, i) => `${f} = $${i + 1}`).join(', ');
    await pool.query(`UPDATE equipos SET ${sets} WHERE id = $${EQUIPO_FIELDS.length + 1}`, vals);

    // Registrar cambios en historial
    const label = old.id_activo || old.numero_serie || req.params.id;
    for (let i = 0; i < EQUIPO_FIELDS.length; i++) {
      const campo = EQUIPO_FIELDS[i];
      const ant   = String(old[campo] ?? '');
      const nuevo = String(vals[i] ?? '');
      if (ant !== nuevo) {
        await pool.query(
          `INSERT INTO historial_equipos (equipo_id, equipo_label, usuario_id, usuario_nombre, campo, valor_ant, valor_nuevo)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [req.params.id, label, req.user.id, req.user.nombre || req.user.usuario, campo, ant, nuevo]
        );
      }
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/equipos/:id — admin e IT
app.delete('/api/equipos/:id', requireRol('admin', 'it'), async (req, res) => {
  try {
    await pool.query('DELETE FROM equipos WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/opciones
app.get('/api/opciones', async (req, res) => {
  try {
    const [p, e] = await Promise.all([
      pool.query("SELECT DISTINCT piso FROM equipos WHERE piso != '' ORDER BY piso"),
      pool.query("SELECT DISTINCT estado FROM equipos WHERE estado != '' ORDER BY estado"),
    ]);
    res.json({ pisos: p.rows.map(r => r.piso), estados: e.rows.map(r => r.estado) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/exportar — admin e IT
app.get('/api/exportar', requireRol('admin', 'it'), async (req, res) => {
  try {
    const { rows: equipos } = await pool.query('SELECT * FROM equipos ORDER BY piso, id_activo');
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Equipos');
    const cols = [
      { header: 'ID Activo',         key: 'id_activo',        width: 12 },
      { header: 'Cargador',          key: 'cargador',          width: 10 },
      { header: 'ID EX',             key: 'id_ex',             width: 10 },
      { header: 'Team',              key: 'team',              width: 18 },
      { header: 'Marca/Modelo',      key: 'marca_modelo',      width: 24 },
      { header: 'Procesador',        key: 'procesador',        width: 22 },
      { header: 'RAM',               key: 'ram',               width: 10 },
      { header: 'Disco Duro',        key: 'disco_duro',        width: 14 },
      { header: 'SO (Versión)',       key: 'so',                width: 14 },
      { header: 'Nº de Serie',       key: 'numero_serie',      width: 18 },
      { header: 'Usuario',           key: 'usuario',           width: 16 },
      { header: 'Estado',            key: 'estado',            width: 16 },
      { header: 'Observación',       key: 'observacion',       width: 28 },
      { header: 'Responsable',       key: 'responsable',       width: 20 },
      { header: 'Audífono',          key: 'audifonos',         width: 10 },
      { header: 'Mouse',             key: 'mouse',             width: 10 },
      { header: 'Monitor',           key: 'monitor',           width: 10 },
      { header: 'Adaptador Tp-Link', key: 'adaptador_tplink',  width: 18 },
      { header: 'Estuche',           key: 'estuche',           width: 10 },
    ];
    ws.columns = cols;
    const headerRow = ws.getRow(1);
    headerRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFAAAAAA' } }, right: { style: 'thin', color: { argb: 'FFAAAAAA' } } };
    });
    headerRow.height = 20;
    const pisoColors  = { 'PISO 2': 'FFDCE6F1', 'PISO 3': 'FFE2EFDA', 'PISO 4': 'FFFFF2CC', 'PISO 5': 'FFFCE4D6', 'PISO 7': 'FFEDEDED', 'BODEGA': 'FFF2F2F2' };
    const estadoColors = { 'En uso agente': 'FFBDD7EE', 'En uso TI': 'FFBDD7EE', 'LISTA': 'FFC6EFCE', 'NO LISTA': 'FFFFC7CE', 'REVISION': 'FFFFEB9C', 'NUEVO': 'FFE2D0F1' };
    const pisos = [...new Set(equipos.map(e => e.piso).filter(Boolean))];
    for (const piso of pisos) {
      const pisoRow = ws.addRow([piso]);
      pisoRow.getCell(1).font = { bold: true, size: 12, color: { argb: 'FF1E3A5F' } };
      pisoRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: pisoColors[piso] || 'FFF2F2F2' } };
      pisoRow.height = 18;
      ws.mergeCells(`A${pisoRow.number}:S${pisoRow.number}`);
      for (const eq of equipos.filter(e => e.piso === piso)) {
        const row = ws.addRow(cols.map(c => eq[c.key] || ''));
        row.eachCell((cell, colNum) => {
          cell.border = { bottom: { style: 'hair', color: { argb: 'FFCCCCCC' } }, right: { style: 'hair', color: { argb: 'FFCCCCCC' } } };
          if (colNum === 12 && eq.estado && estadoColors[eq.estado]) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: estadoColors[eq.estado] } };
            cell.font = { bold: true };
          }
        });
      }
    }
    ws.views = [{ state: 'frozen', ySplit: 1 }];
    ws.autoFilter = { from: 'A1', to: 'S1' };
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="inventario_${new Date().toISOString().slice(0,10)}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Historial de equipos ──────────────────────────────────────────────────────
app.get('/api/historial', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 200);
    const { rows } = await pool.query(
      `SELECT h.*, e.piso AS equipo_piso, e.marca_modelo AS equipo_modelo, e.numero_serie AS equipo_serie
       FROM historial_equipos h
       LEFT JOIN equipos e ON e.id = h.equipo_id
       ORDER BY h.created_at DESC LIMIT $1`,
      [limit]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/historial/equipo/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM historial_equipos WHERE equipo_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/historial/:id/nota', requireRol('admin', 'it'), async (req, res) => {
  try {
    await pool.query('UPDATE historial_equipos SET nota = $1 WHERE id = $2', [req.body.nota || '', req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Tareas IT ─────────────────────────────────────────────────────────────────
app.get('/api/tareas', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM tareas ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tareas', requireRol('admin', 'it'), async (req, res) => {
  try {
    const { titulo, descripcion, estado, piso, asignado_id, asignado_nombre } = req.body;
    if (!titulo) return res.status(400).json({ error: 'El título es obligatorio' });
    const { rows } = await pool.query(
      `INSERT INTO tareas (titulo, descripcion, estado, piso, asignado_id, asignado_nombre, creado_id, creado_nombre)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [titulo, descripcion || '', estado || 'Pendiente', piso || '',
       asignado_id || null, asignado_nombre || '',
       req.user.id, req.user.nombre || req.user.usuario]
    );
    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/tareas/:id', requireRol('admin', 'it'), async (req, res) => {
  try {
    const { titulo, descripcion, estado, piso, asignado_id, asignado_nombre } = req.body;
    await pool.query(
      `UPDATE tareas SET titulo=$1, descripcion=$2, estado=$3, piso=$4, asignado_id=$5, asignado_nombre=$6
       WHERE id=$7`,
      [titulo, descripcion || '', estado, piso || '', asignado_id || null, asignado_nombre || '', req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tareas/:id', requireRol('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM tareas WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Usuarios asignables (para dropdown de tareas) ─────────────────────────────
app.get('/api/usuarios/asignables', async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, nombre, usuario, rol FROM usuarios WHERE activo = true AND rol IN ('admin','it') ORDER BY nombre"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Tablero de agentes por piso/mesa ──────────────────────────────────────────
// El piso de cada agente se deriva en vivo del piso de sus equipos (el más
// frecuente si tiene varios), para que quede siempre sincronizado con
// Inventario. Solo la mesa (1 o 2) dentro de ese piso se persiste.
app.get('/api/agentes/tablero', async (req, res) => {
  try {
    const { rows: equipos } = await pool.query(
      "SELECT piso, responsable FROM equipos WHERE responsable IS NOT NULL AND responsable != '' AND piso IS NOT NULL AND piso != '' AND piso != 'BODEGA'"
    );

    const porAgente = new Map();
    for (const e of equipos) {
      const nombre = (e.responsable || '').trim();
      if (!nombre) continue;
      const key = nombre.toUpperCase();
      if (!porAgente.has(key)) porAgente.set(key, { nombre, pisos: new Map() });
      const info = porAgente.get(key);
      info.pisos.set(e.piso, (info.pisos.get(e.piso) || 0) + 1);
    }

    // piso derivado = el más frecuente entre los equipos de ese agente
    const derivados = new Map(); // key -> { nombre, piso }
    for (const [key, info] of porAgente) {
      let mejorPiso = null, mejorCount = -1;
      for (const [piso, count] of info.pisos) {
        if (count > mejorCount) { mejorPiso = piso; mejorCount = count; }
      }
      derivados.set(key, { nombre: info.nombre, piso: mejorPiso });
    }

    const { rows: asientosRows } = await pool.query('SELECT * FROM asientos_agentes');
    const asientosMap = new Map(asientosRows.map(a => [a.agente_key, a]));

    // ocupación actual por piso+mesa (solo contando agentes que siguen vigentes)
    const ocupacion = new Map();
    for (const [key, a] of asientosMap) {
      const info = derivados.get(key);
      if (!info) continue;
      const k = `${info.piso}|${a.mesa}`;
      ocupacion.set(k, (ocupacion.get(k) || 0) + 1);
    }

    // asignar mesa a agentes nuevos sin asiento persistido todavía
    for (const [key, info] of derivados) {
      if (asientosMap.has(key)) continue;
      const enMesa1 = ocupacion.get(`${info.piso}|1`) || 0;
      const mesa = enMesa1 < 7 ? 1 : 2;
      ocupacion.set(`${info.piso}|${mesa}`, (ocupacion.get(`${info.piso}|${mesa}`) || 0) + 1);
      await pool.query(
        'INSERT INTO asientos_agentes (agente_nombre, agente_key, mesa) VALUES ($1,$2,$3) ON CONFLICT (agente_key) DO NOTHING',
        [info.nombre, key, mesa]
      );
      asientosMap.set(key, { agente_key: key, agente_nombre: info.nombre, mesa });
    }

    const tablero = {};
    for (const [key, info] of derivados) {
      if (!tablero[info.piso]) tablero[info.piso] = { 1: [], 2: [] };
      const mesa = asientosMap.get(key)?.mesa === 2 ? 2 : 1;
      tablero[info.piso][mesa].push(info.nombre);
    }
    for (const piso of Object.keys(tablero)) {
      tablero[piso][1].sort((a, b) => a.localeCompare(b, 'es'));
      tablero[piso][2].sort((a, b) => a.localeCompare(b, 'es'));
    }

    res.json({ pisos: Object.keys(tablero).sort(), tablero });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/agentes/mover — mueve un agente a otro piso/mesa (admin e IT)
app.put('/api/agentes/mover', requireRol('admin', 'it'), async (req, res) => {
  try {
    const { agente, piso, mesa } = req.body;
    if (!agente || !piso || !(mesa === 1 || mesa === 2)) {
      return res.status(400).json({ error: 'Faltan datos (agente, piso, mesa)' });
    }
    const agenteTrim = agente.trim();
    const key = agenteTrim.toUpperCase();

    const { rows: equiposAgente } = await pool.query(
      'SELECT id, id_activo, numero_serie, piso FROM equipos WHERE UPPER(TRIM(responsable)) = $1',
      [key]
    );
    if (equiposAgente.length === 0) {
      return res.status(404).json({ error: 'No se encontró ningún equipo con ese responsable' });
    }

    for (const eq of equiposAgente) {
      if (eq.piso === piso) continue;
      await pool.query('UPDATE equipos SET piso = $1 WHERE id = $2', [piso, eq.id]);
      const label = eq.id_activo || eq.numero_serie || String(eq.id);
      await pool.query(
        `INSERT INTO historial_equipos (equipo_id, equipo_label, usuario_id, usuario_nombre, campo, valor_ant, valor_nuevo)
         VALUES ($1,$2,$3,$4,'piso',$5,$6)`,
        [eq.id, label, req.user.id, req.user.nombre || req.user.usuario, eq.piso, piso]
      );
    }

    await pool.query(
      `INSERT INTO asientos_agentes (agente_nombre, agente_key, mesa)
       VALUES ($1,$2,$3)
       ON CONFLICT (agente_key) DO UPDATE SET mesa = $3, updated_at = NOW()`,
      [agenteTrim, key, mesa]
    );

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Gestión de usuarios (solo admin) ─────────────────────────────────────────
app.get('/api/usuarios', requireRol('admin'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, nombre, usuario, rol, activo, created_at FROM usuarios ORDER BY created_at'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/usuarios', requireRol('admin'), async (req, res) => {
  try {
    const { nombre, usuario, password, rol } = req.body;
    if (!nombre || !usuario || !password || !rol) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }
    const hash = bcrypt.hashSync(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO usuarios (nombre, usuario, password_hash, rol) VALUES ($1,$2,$3,$4) RETURNING id',
      [nombre, usuario, hash, rol]
    );
    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'El nombre de usuario ya existe' });
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/usuarios/:id', requireRol('admin'), async (req, res) => {
  try {
    const { nombre, usuario, password, rol, activo } = req.body;
    if (password) {
      const hash = bcrypt.hashSync(password, 10);
      await pool.query(
        'UPDATE usuarios SET nombre=$1, usuario=$2, password_hash=$3, rol=$4, activo=$5 WHERE id=$6',
        [nombre, usuario, hash, rol, activo, req.params.id]
      );
    } else {
      await pool.query(
        'UPDATE usuarios SET nombre=$1, usuario=$2, rol=$3, activo=$4 WHERE id=$5',
        [nombre, usuario, rol, activo, req.params.id]
      );
    }
    res.json({ ok: true });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'El nombre de usuario ya existe' });
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/usuarios/:id', requireRol('admin'), async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ error: 'No puedes eliminar tu propio usuario' });
    }
    await pool.query('DELETE FROM usuarios WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Servir frontend compilado (producción) ────────────────────────────────────
const DIST = path.join(__dirname, 'frontend', 'dist');
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get('/{*splat}', (req, res) => res.sendFile(path.join(DIST, 'index.html')));
}

// ── Arrancar servidor ─────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3001');
const HOST = process.env.HOST || '127.0.0.1';

initPromise.then(() => {
  app.listen(PORT, HOST, () => {
    console.log(`Servidor en http://${HOST}:${PORT}`);
  });
});

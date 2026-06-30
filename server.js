const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');
const ExcelJS = require('exceljs');
require('dotenv').config();

const { pool, initPromise } = require('./database');
const { login, verificarToken } = require('./auth');

const app = express();

// CORS — en produccion pon la IP/dominio del servidor en CORS_ORIGIN
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',').map(s => s.trim());
app.use(cors({ origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins }));
app.use(express.json());

// Helper: construye parametros posicionales pg ($1, $2, ...)
function mkParams() {
  const params = [];
  const add = v => { params.push(v); return `$${params.length}`; };
  return { params, add };
}

const ACCESORIO_COLS = ['cargador','mouse','audifonos','monitor','estuche','adaptador_tplink'];

const EQUIPO_FIELDS = [
  'id_activo','cargador','id_ex','team','marca_modelo','procesador',
  'ram','disco_duro','so','numero_serie','usuario','estado',
  'observacion','responsable','audifonos','mouse','monitor',
  'adaptador_tplink','estuche','piso',
];

// ── Login (publico) ──────────────────────────────────────────────────────────
app.post('/api/login', (req, res) => {
  const { usuario, password } = req.body;
  const token = login(usuario, password);
  if (!token) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  res.json({ token });
});

// ── Rutas protegidas ─────────────────────────────────────────────────────────
app.use('/api', verificarToken);

// GET /api/equipos — con filtros opcionales
app.get('/api/equipos', async (req, res) => {
  try {
    const { piso, estado, estadoIn, search, ram, modelo, accesorio } = req.query;
    const { params, add } = mkParams();
    let q = 'SELECT * FROM equipos WHERE TRUE';

    if (piso)   q += ` AND piso = ${add(piso)}`;
    if (estado) q += ` AND estado = ${add(estado)}`;
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

    const result = await pool.query(q, params);
    res.json(result.rows);
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

// POST /api/equipos
app.post('/api/equipos', async (req, res) => {
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
    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/equipos/:id
app.put('/api/equipos/:id', async (req, res) => {
  try {
    const vals = EQUIPO_FIELDS.map(f => {
      const v = req.body[f] ?? '';
      return (f === 'numero_serie' && v === '') ? null : v;
    });
    vals.push(req.params.id);
    const sets = EQUIPO_FIELDS.map((f, i) => `${f} = $${i + 1}`).join(', ');
    await pool.query(
      `UPDATE equipos SET ${sets} WHERE id = $${EQUIPO_FIELDS.length + 1}`,
      vals
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/equipos/:id
app.delete('/api/equipos/:id', async (req, res) => {
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

// GET /api/exportar
app.get('/api/exportar', async (req, res) => {
  try {
    const { rows: equipos } = await pool.query(
      "SELECT * FROM equipos ORDER BY piso, id_activo"
    );

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
      cell.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border    = {
        bottom: { style: 'thin', color: { argb: 'FFAAAAAA' } },
        right:  { style: 'thin', color: { argb: 'FFAAAAAA' } },
      };
    });
    headerRow.height = 20;

    const pisos = [...new Set(equipos.map(e => e.piso).filter(Boolean))];
    const pisoColors  = {
      'PISO 2': 'FFDCE6F1', 'PISO 3': 'FFE2EFDA', 'PISO 4': 'FFFFF2CC',
      'PISO 5': 'FFFCE4D6', 'PISO 7': 'FFEDEDED', 'BODEGA': 'FFF2F2F2',
    };
    const estadoColors = {
      'En uso agente': 'FFBDD7EE', 'En uso TI': 'FFBDD7EE',
      'LISTA': 'FFC6EFCE', 'NO LISTA': 'FFFFC7CE',
      'REVISION': 'FFFFEB9C', 'NUEVO': 'FFE2D0F1',
    };

    for (const piso of pisos) {
      const pisoRow = ws.addRow([piso]);
      pisoRow.getCell(1).font = { bold: true, size: 12, color: { argb: 'FF1E3A5F' } };
      pisoRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: pisoColors[piso] || 'FFF2F2F2' } };
      pisoRow.height = 18;
      ws.mergeCells(`A${pisoRow.number}:S${pisoRow.number}`);

      for (const eq of equipos.filter(e => e.piso === piso)) {
        const row = ws.addRow(cols.map(c => eq[c.key] || ''));
        row.eachCell((cell, colNum) => {
          cell.border = {
            bottom: { style: 'hair', color: { argb: 'FFCCCCCC' } },
            right:  { style: 'hair', color: { argb: 'FFCCCCCC' } },
          };
          if (colNum === 12 && eq.estado && estadoColors[eq.estado]) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: estadoColors[eq.estado] } };
            cell.font = { bold: true };
          }
        });
      }
    }

    ws.views      = [{ state: 'frozen', ySplit: 1 }];
    ws.autoFilter = { from: 'A1', to: 'S1' };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="inventario_${new Date().toISOString().slice(0,10)}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Servir frontend compilado (produccion) ───────────────────────────────────
const DIST = path.join(__dirname, 'frontend', 'dist');
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get('*', (req, res) => res.sendFile(path.join(DIST, 'index.html')));
}

// ── Arrancar servidor ────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3001');
const HOST = process.env.HOST || '127.0.0.1';

initPromise.then(() => {
  app.listen(PORT, HOST, () => {
    console.log(`Servidor en http://${HOST}:${PORT}`);
    if (fs.existsSync(DIST)) console.log('Sirviendo frontend compilado.');
  });
});

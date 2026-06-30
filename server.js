const express = require('express');
const cors = require('cors');
const db = require('./database');
const ExcelJS = require('exceljs');
const { login, verificarToken } = require('./auth');

const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// ── Ruta pública: login ──
app.post('/api/login', (req, res) => {
  const { usuario, password } = req.body;
  const token = login(usuario, password);
  if (!token) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  res.json({ token });
});

// ── Todas las rutas siguientes requieren token ──
app.use('/api', verificarToken);

// GET all equipos with optional filters
app.get('/api/equipos', (req, res) => {
  const { piso, estado, estadoIn, search, ram, modelo, accesorio } = req.query;
  let query = 'SELECT * FROM equipos WHERE 1=1';
  const params = [];

  if (piso)   { query += ' AND piso = ?'; params.push(piso); }
  if (estado) { query += ' AND estado = ?'; params.push(estado); }
  if (estadoIn) {
    const vals = estadoIn.split(',').map(s => s.trim()).filter(Boolean);
    if (vals.length) {
      query += ` AND estado IN (${vals.map(() => '?').join(',')})`;
      params.push(...vals);
    }
  }
  if (ram)    { query += ' AND ram = ?'; params.push(ram); }
  if (modelo) { query += ' AND marca_modelo = ?'; params.push(modelo); }
  if (accesorio) {
    const COLS = ['cargador','mouse','audifonos','monitor','estuche','adaptador_tplink'];
    if (COLS.includes(accesorio)) {
      query += ` AND (${accesorio} = 'Si' OR ${accesorio} = 'Si 2')`;
    }
  }
  if (search) {
    query += ' AND (id_activo LIKE ? OR numero_serie LIKE ? OR marca_modelo LIKE ? OR team LIKE ? OR responsable LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s, s, s);
  }
  query += ' ORDER BY piso, id_activo';

  res.json(db.prepare(query).all(...params));
});

// GET single equipo
app.get('/api/equipos/:id', (req, res) => {
  const equipo = db.prepare('SELECT * FROM equipos WHERE id = ?').get(req.params.id);
  if (!equipo) return res.status(404).json({ error: 'No encontrado' });
  res.json(equipo);
});

// POST create equipo
app.post('/api/equipos', (req, res) => {
  const fields = [
    'id_activo','cargador','id_ex','team','marca_modelo','procesador',
    'ram','disco_duro','so','numero_serie','usuario','estado',
    'observacion','responsable','audifonos','mouse','monitor',
    'adaptador_tplink','estuche','piso'
  ];
  const body = req.body;
  const result = db.prepare(`
    INSERT INTO equipos (${fields.join(',')})
    VALUES (${fields.map(f => '@' + f).join(',')})
  `).run(Object.fromEntries(fields.map(f => [f, body[f] ?? ''])));
  res.status(201).json({ id: result.lastInsertRowid });
});

// PUT update equipo
app.put('/api/equipos/:id', (req, res) => {
  const fields = [
    'id_activo','cargador','id_ex','team','marca_modelo','procesador',
    'ram','disco_duro','so','numero_serie','usuario','estado',
    'observacion','responsable','audifonos','mouse','monitor',
    'adaptador_tplink','estuche','piso'
  ];
  const body = req.body;
  const sets = fields.map(f => `${f} = @${f}`).join(', ');
  db.prepare(`UPDATE equipos SET ${sets} WHERE id = @id`)
    .run({ ...Object.fromEntries(fields.map(f => [f, body[f] ?? ''])), id: req.params.id });
  res.json({ ok: true });
});

// DELETE equipo
app.delete('/api/equipos/:id', (req, res) => {
  db.prepare('DELETE FROM equipos WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// GET filter options (pisos, estados)
app.get('/api/opciones', (req, res) => {
  const pisos = db.prepare("SELECT DISTINCT piso FROM equipos WHERE piso != '' ORDER BY piso").all().map(r => r.piso);
  const estados = db.prepare("SELECT DISTINCT estado FROM equipos WHERE estado != '' ORDER BY estado").all().map(r => r.estado);
  res.json({ pisos, estados });
});

// GET exportar Excel
app.get('/api/exportar', async (req, res) => {
  const equipos = db.prepare("SELECT * FROM equipos ORDER BY piso, CAST(id_activo AS INTEGER)").all();

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Equipos');

  // Column widths
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

  // Header row style
  const headerRow = ws.getRow(1);
  headerRow.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FFAAAAAA' } },
      right:  { style: 'thin', color: { argb: 'FFAAAAAA' } },
    };
  });
  headerRow.height = 20;

  // Group by piso and write rows
  const pisos = [...new Set(equipos.map(e => e.piso).filter(Boolean))];
  const pisoColors = {
    'PISO 2': 'FFDCE6F1', 'PISO 3': 'FFE2EFDA', 'PISO 4': 'FFFFF2CC',
    'PISO 5': 'FFFCE4D6', 'PISO 7': 'FFEDEDED', 'BODEGA': 'FFF2F2F2',
  };
  const estadoColors = {
    'En uso agente': 'FFBDD7EE', 'En uso TI': 'FFBDD7EE',
    'LISTA': 'FFC6EFCE', 'NO LISTA': 'FFFFC7CE',
    'REVISION': 'FFFFEB9C', 'NUEVO': 'FFE2D0F1',
  };

  for (const piso of pisos) {
    // Piso header row
    const pisoRow = ws.addRow([piso]);
    pisoRow.getCell(1).font = { bold: true, size: 12, color: { argb: 'FF1E3A5F' } };
    pisoRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: pisoColors[piso] || 'FFF2F2F2' } };
    pisoRow.height = 18;
    ws.mergeCells(`A${pisoRow.number}:S${pisoRow.number}`);

    // Data rows for this piso
    const rows = equipos.filter(e => e.piso === piso);
    for (const eq of rows) {
      const row = ws.addRow(cols.map(c => eq[c.key] || ''));
      const bgColor = pisoColors[piso] ? pisoColors[piso].replace('FF', 'CC') : 'FFFFFFFF';
      row.eachCell((cell, colNum) => {
        cell.border = {
          bottom: { style: 'hair', color: { argb: 'FFCCCCCC' } },
          right:  { style: 'hair', color: { argb: 'FFCCCCCC' } },
        };
        // Color estado cell
        if (colNum === 12 && eq.estado && estadoColors[eq.estado]) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: estadoColors[eq.estado] } };
          cell.font = { bold: true };
        }
      });
    }
  }

  // Freeze header row
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  // Auto filter
  ws.autoFilter = { from: 'A1', to: 'S1' };

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="inventario_equipos_${new Date().toISOString().slice(0,10)}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
});

const PORT = 3001;
app.listen(PORT, '127.0.0.1', () => console.log(`API corriendo en http://localhost:${PORT} (solo local)`));

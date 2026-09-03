// Generación del workbook de Excel del inventario. Se comparte entre la
// exportación manual (GET /api/exportar) y el informe semanal automático
// (scripts/reporte-semanal.js), para que ambos se vean siempre igual.
const ExcelJS = require('exceljs');

const COLUMNS = [
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

const PISO_COLORS   = { 'PISO 2': 'FFDCE6F1', 'PISO 3': 'FFE2EFDA', 'PISO 4': 'FFFFF2CC', 'PISO 5': 'FFFCE4D6', 'PISO 7': 'FFEDEDED', 'BODEGA': 'FFF2F2F2' };
const ESTADO_COLORS = { 'En uso agente': 'FFBDD7EE', 'En uso TI': 'FFBDD7EE', 'LISTA': 'FFC6EFCE', 'NO LISTA': 'FFFFC7CE', 'REVISION': 'FFFFEB9C', 'NUEVO': 'FFE2D0F1' };

// agruparPorEdificio=true antepone el nombre del edificio a cada grupo de
// piso (necesario para el informe semanal, que junta todos los edificios;
// la exportación manual siempre queda dentro de un solo edificio, así que
// no lo necesita).
function construirWorkbookInventario(equipos, { agruparPorEdificio = false } = {}) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Equipos');
  ws.columns = COLUMNS;

  const headerRow = ws.getRow(1);
  headerRow.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFAAAAAA' } }, right: { style: 'thin', color: { argb: 'FFAAAAAA' } } };
  });
  headerRow.height = 20;

  const grupoDe = eq => agruparPorEdificio ? `${eq.edificio_nombre || 'Sin edificio'} — ${eq.piso || 'Sin piso'}` : eq.piso;
  const grupos = [...new Set(equipos.map(grupoDe).filter(Boolean))];

  for (const grupo of grupos) {
    const pisoRow = ws.addRow([grupo]);
    const pisoKey = agruparPorEdificio ? grupo.split(' — ').pop() : grupo;
    pisoRow.getCell(1).font = { bold: true, size: 12, color: { argb: 'FF1E3A5F' } };
    pisoRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PISO_COLORS[pisoKey] || 'FFF2F2F2' } };
    pisoRow.height = 18;
    ws.mergeCells(`A${pisoRow.number}:S${pisoRow.number}`);
    for (const eq of equipos.filter(e => grupoDe(e) === grupo)) {
      const row = ws.addRow(COLUMNS.map(c => eq[c.key] || ''));
      row.eachCell((cell, colNum) => {
        cell.border = { bottom: { style: 'hair', color: { argb: 'FFCCCCCC' } }, right: { style: 'hair', color: { argb: 'FFCCCCCC' } } };
        if (colNum === 12 && eq.estado && ESTADO_COLORS[eq.estado]) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ESTADO_COLORS[eq.estado] } };
          cell.font = { bold: true };
        }
      });
    }
  }

  ws.views = [{ state: 'frozen', ySplit: 1 }];
  ws.autoFilter = { from: 'A1', to: 'S1' };
  return wb;
}

module.exports = { construirWorkbookInventario };

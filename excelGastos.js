// Generación del workbook de Excel de gastos. Reemplaza el control manual de
// "una hoja por mes": agrupa por edificio con subtotales, igual que hacía el
// Excel original a mano, pero calculado en vivo desde la base de datos.
const ExcelJS = require('exceljs');

const COLUMNS = [
  { header: 'Edificio',       key: 'edificio_nombre', width: 14 },
  { header: 'Fecha',          key: 'fecha',            width: 12 },
  { header: 'Concepto',       key: 'concepto',         width: 32 },
  { header: 'Proveedor',      key: 'proveedor',        width: 20 },
  { header: 'Cantidad',       key: 'cantidad',         width: 10 },
  { header: 'Monto (USD)',    key: 'monto',            width: 14 },
  { header: 'Periodicidad',   key: 'periodicidad_label', width: 16 },
  { header: 'Estado',         key: 'estado_label',     width: 12 },
];

const PERIODICIDAD_LABEL = { mensual: 'Mensual', anual: 'Anual', unico: 'Único', segun_necesidad: 'Según necesidad' };
const ESTADO_LABEL       = { activo: 'Activo', cancelado: 'Cancelado', pendiente: 'Pendiente' };
const ESTADO_COLORS      = { activo: 'FFC6EFCE', cancelado: 'FFFFC7CE', pendiente: 'FFFFEB9C' };

function construirWorkbookGastos(gastos) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Gastos');
  ws.columns = COLUMNS;

  const headerRow = ws.getRow(1);
  headerRow.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFAAAAAA' } }, right: { style: 'thin', color: { argb: 'FFAAAAAA' } } };
  });
  headerRow.height = 20;

  const edificios = [...new Set(gastos.map(g => g.edificio_nombre))].sort((a, b) => a.localeCompare(b, 'es'));
  let totalGeneral = 0;

  for (const edificio of edificios) {
    const filas = gastos.filter(g => g.edificio_nombre === edificio);
    const edRow = ws.addRow([edificio]);
    edRow.getCell(1).font = { bold: true, size: 12, color: { argb: 'FF1E3A5F' } };
    edRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
    edRow.height = 18;
    ws.mergeCells(`A${edRow.number}:H${edRow.number}`);

    let subtotal = 0;
    for (const g of filas) {
      subtotal += parseFloat(g.monto);
      const row = ws.addRow(COLUMNS.map(c => {
        if (c.key === 'fecha') return new Date(g.fecha).toLocaleDateString('es-CL');
        if (c.key === 'periodicidad_label') return PERIODICIDAD_LABEL[g.periodicidad] || g.periodicidad;
        if (c.key === 'estado_label') return ESTADO_LABEL[g.estado] || g.estado;
        return g[c.key] ?? '';
      }));
      row.eachCell((cell, colNum) => {
        cell.border = { bottom: { style: 'hair', color: { argb: 'FFCCCCCC' } }, right: { style: 'hair', color: { argb: 'FFCCCCCC' } } };
        if (colNum === 8 && ESTADO_COLORS[g.estado]) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ESTADO_COLORS[g.estado] } };
          cell.font = { bold: true };
        }
      });
    }
    totalGeneral += subtotal;
    const subtotalRow = ws.addRow(['', '', '', '', 'Subtotal', subtotal.toFixed(2)]);
    subtotalRow.getCell(5).font = { bold: true };
    subtotalRow.getCell(6).font = { bold: true };
  }

  ws.addRow([]);
  const totalRow = ws.addRow(['', '', '', '', 'TOTAL', totalGeneral.toFixed(2)]);
  totalRow.getCell(5).font = { bold: true, size: 12 };
  totalRow.getCell(6).font = { bold: true, size: 12 };

  ws.views = [{ state: 'frozen', ySplit: 1 }];
  ws.autoFilter = { from: 'A1', to: 'H1' };
  return wb;
}

module.exports = { construirWorkbookGastos };

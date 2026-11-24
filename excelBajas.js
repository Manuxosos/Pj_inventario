// Generación del workbook de Excel de Bajas (equipos/accesorios dañados sin
// opción de reparación). Mismo patrón que excelGastos.js: agrupa por
// edificio con subtotal, calculado en vivo desde la base de datos.
const ExcelJS = require('exceljs');

const COLUMNS = [
  { header: 'Edificio',        key: 'edificio_nombre', width: 14 },
  { header: 'Fecha',           key: 'fecha',            width: 12 },
  { header: 'Categoría',       key: 'categoria_label',  width: 16 },
  { header: 'Descripción',     key: 'descripcion',      width: 30 },
  { header: 'Número de serie', key: 'numero_serie',     width: 18 },
  { header: 'Cantidad',        key: 'cantidad',         width: 10 },
  { header: 'Motivo',          key: 'motivo',           width: 28 },
  { header: 'Cargado por',     key: 'usuario_nombre',   width: 18 },
];

const CATEGORIA_LABEL = { laptop: 'Laptop', audifonos: 'Audífonos', monitores: 'Monitores', celulares: 'Celulares', otro: 'Otro' };

function construirWorkbookBajas(bajas) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Bajas');
  ws.columns = COLUMNS;

  const headerRow = ws.getRow(1);
  headerRow.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8B1E1E' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFAAAAAA' } }, right: { style: 'thin', color: { argb: 'FFAAAAAA' } } };
  });
  headerRow.height = 20;

  const edificios = [...new Set(bajas.map(b => b.edificio_nombre))].sort((a, b) => a.localeCompare(b, 'es'));
  let totalGeneral = 0;

  for (const edificio of edificios) {
    const filas = bajas.filter(b => b.edificio_nombre === edificio);
    const edRow = ws.addRow([edificio]);
    edRow.getCell(1).font = { bold: true, size: 12, color: { argb: 'FF8B1E1E' } };
    edRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
    edRow.height = 18;
    ws.mergeCells(`A${edRow.number}:H${edRow.number}`);

    let subtotal = 0;
    for (const b of filas) {
      subtotal += parseInt(b.cantidad);
      const row = ws.addRow(COLUMNS.map(c => {
        if (c.key === 'fecha') return new Date(b.fecha).toLocaleDateString('es-CL');
        if (c.key === 'categoria_label') return CATEGORIA_LABEL[b.categoria] || b.categoria;
        return b[c.key] ?? '';
      }));
      row.eachCell(cell => {
        cell.border = { bottom: { style: 'hair', color: { argb: 'FFCCCCCC' } }, right: { style: 'hair', color: { argb: 'FFCCCCCC' } } };
      });
    }
    totalGeneral += subtotal;
    const subtotalRow = ws.addRow(['', '', '', '', 'Subtotal', subtotal]);
    subtotalRow.getCell(5).font = { bold: true };
    subtotalRow.getCell(6).font = { bold: true };
  }

  ws.addRow([]);
  const totalRow = ws.addRow(['', '', '', '', 'TOTAL', totalGeneral]);
  totalRow.getCell(5).font = { bold: true, size: 12 };
  totalRow.getCell(6).font = { bold: true, size: 12 };

  ws.views = [{ state: 'frozen', ySplit: 1 }];
  ws.autoFilter = { from: 'A1', to: 'H1' };
  return wb;
}

module.exports = { construirWorkbookBajas };

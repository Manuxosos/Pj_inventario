// Informe mensual en Excel de todo el inventario (todos los edificios),
// enviado por correo. Pensado para correr desde cron, el 1 de cada mes:
//   0 18 1 * * cd /root/inventario && node scripts/reporte-mensual.js >> logs/reporte.log 2>&1
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const path = require('path');
const fs = require('fs');
const { pool, initPromise } = require('../database');
const { construirWorkbookInventario } = require('../excelInventario');
const { enviarConAdjunto } = require('../mailer');

const fecha = new Date().toISOString().slice(0, 10);
const archivo = path.join('/tmp', `inventario_informe_${fecha}.xlsx`);

(async () => {
  try {
    await initPromise;
    const { rows: equipos } = await pool.query(
      `SELECT e.*, ed.nombre AS edificio_nombre
       FROM equipos e LEFT JOIN edificios ed ON ed.id = e.edificio_id
       WHERE e.eliminado_en IS NULL
       ORDER BY ed.nombre, e.piso, e.id_activo`
    );
    const wb = construirWorkbookInventario(equipos, { agruparPorEdificio: true });
    await wb.xlsx.writeFile(archivo);
    await enviarConAdjunto({
      asunto: `Informe mensual de Inventario IT - ${fecha}`,
      texto: `Informe mensual automático del inventario (todos los edificios), ${fecha}. Total de equipos: ${equipos.length}.`,
      archivoPath: archivo,
      nombreArchivo: `inventario_informe_${fecha}.xlsx`,
    });
    fs.unlinkSync(archivo);
    console.log(`[${new Date().toISOString()}] Informe del ${fecha} enviado correctamente (${equipos.length} equipos).`);
    process.exit(0);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error en informe mensual:`, err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();

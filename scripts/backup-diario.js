// Backup diario de la base de datos, enviado por correo (fuera del
// servidor). Pensado para correr desde cron, ej.:
//   0 3 * * * cd /root/inventario && node scripts/backup-diario.js >> logs/backup.log 2>&1
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const { enviarConAdjunto } = require('../mailer');

const fecha = new Date().toISOString().slice(0, 10);
const archivo = path.join('/tmp', `inventario_backup_${fecha}.dump`);

function pgDump() {
  return new Promise((resolve, reject) => {
    execFile('pg_dump', [
      '-h', process.env.DB_HOST || 'localhost',
      '-p', process.env.DB_PORT || '5432',
      '-U', process.env.DB_USER,
      '-F', 'c',
      '-f', archivo,
      process.env.DB_NAME,
    ], { env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD } }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message));
      else resolve();
    });
  });
}

(async () => {
  try {
    await pgDump();
    await enviarConAdjunto({
      asunto: `Backup Inventario IT - ${fecha}`,
      texto: `Backup automático diario de la base de datos, ${fecha}.`,
      archivoPath: archivo,
      nombreArchivo: `inventario_backup_${fecha}.dump`,
    });
    fs.unlinkSync(archivo);
    console.log(`[${new Date().toISOString()}] Backup del ${fecha} enviado correctamente.`);
    process.exit(0);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Error en backup diario:`, err.message);
    process.exit(1);
  }
})();

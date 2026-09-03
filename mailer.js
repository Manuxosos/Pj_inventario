// Envío de correos con adjunto para los scripts de backup e informe
// automáticos (scripts/backup-diario.js, scripts/reporte-semanal.js).
// Usa Gmail vía contraseña de aplicación (SMTP_USER / SMTP_APP_PASSWORD en
// el .env) -- no la contraseña normal de la cuenta.
const nodemailer = require('nodemailer');

function crearTransporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error('SMTP_USER y SMTP_APP_PASSWORD deben estar definidos en el .env para enviar correos.');
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
}

async function enviarConAdjunto({ asunto, texto, archivoPath, nombreArchivo }) {
  const to = process.env.REPORT_EMAIL_TO;
  if (!to) throw new Error('REPORT_EMAIL_TO debe estar definido en el .env.');
  const transporter = crearTransporter();
  await transporter.sendMail({
    from: `Inventario IT <${process.env.SMTP_USER}>`,
    to,
    subject: asunto,
    text: texto,
    attachments: [{ filename: nombreArchivo, path: archivoPath }],
  });
}

module.exports = { enviarConAdjunto };

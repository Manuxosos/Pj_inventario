require('dotenv').config();
const { pool, initPromise } = require('./database');
const data = require('./seed_data.json');

const FIELDS = [
  'id_activo','cargador','id_ex','team','marca_modelo','procesador',
  'ram','disco_duro','so','numero_serie','usuario','estado',
  'observacion','responsable','audifonos','mouse','monitor',
  'adaptador_tplink','estuche','piso',
];

async function seed() {
  await initPromise;

  const { rows: check } = await pool.query('SELECT COUNT(*) n FROM equipos');
  if (parseInt(check[0].n) > 0) {
    console.log(`Ya hay ${check[0].n} equipos en la BD. Omitiendo seed.`);
    await pool.end();
    return;
  }

  const placeholders = FIELDS.map((_, i) => `$${i + 1}`).join(',');
  const insertSQL = `
    INSERT INTO equipos (${FIELDS.join(',')})
    VALUES (${placeholders})
    ON CONFLICT (numero_serie) DO NOTHING
  `;

  let insertados = 0;
  for (const row of data) {
    const vals = FIELDS.map(f => {
      const v = row[f] ?? '';
      return (f === 'numero_serie' && v === '') ? null : v;
    });
    await pool.query(insertSQL, vals);
    insertados++;
  }

  console.log(`Seed completado: ${insertados} registros procesados.`);

  await pool.query("UPDATE equipos SET cargador = 'Si' WHERE estado IN ('En uso agente', 'En uso TI')");
  console.log('Regla de cargadores aplicada.');

  await pool.end();
}

seed().catch(err => { console.error(err.message); process.exit(1); });

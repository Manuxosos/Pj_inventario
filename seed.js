const db = require('./database');
const data = require('./seed_data.json');

const insert = db.prepare(`
  INSERT OR IGNORE INTO equipos (
    id_activo, cargador, id_ex, team, marca_modelo, procesador,
    ram, disco_duro, so, numero_serie, usuario, estado,
    observacion, responsable, audifonos, mouse, monitor,
    adaptador_tplink, estuche, piso
  ) VALUES (
    @id_activo, @cargador, @id_ex, @team, @marca_modelo, @procesador,
    @ram, @disco_duro, @so, @numero_serie, @usuario, @estado,
    @observacion, @responsable, @audifonos, @mouse, @monitor,
    @adaptador_tplink, @estuche, @piso
  )
`);

const insertMany = db.transaction((rows) => {
  for (const row of rows) insert.run(row);
});

insertMany(data);
console.log(`Seeded ${data.length} equipos.`);

// Reglas de negocio post-seed
db.prepare("UPDATE equipos SET cargador = 'Si' WHERE estado IN ('En uso agente', 'En uso TI')").run();

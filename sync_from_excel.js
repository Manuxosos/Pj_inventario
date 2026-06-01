const db = require('./database');
const newData = require('./seed_data_new.json');

const upsert = db.prepare(`
  INSERT INTO equipos (
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
  ON CONFLICT(numero_serie) DO UPDATE SET
    id_activo        = excluded.id_activo,
    cargador         = excluded.cargador,
    id_ex            = excluded.id_ex,
    team             = excluded.team,
    marca_modelo     = excluded.marca_modelo,
    procesador       = excluded.procesador,
    ram              = excluded.ram,
    disco_duro       = excluded.disco_duro,
    so               = excluded.so,
    usuario          = excluded.usuario,
    estado           = excluded.estado,
    observacion      = excluded.observacion,
    responsable      = excluded.responsable,
    audifonos        = excluded.audifonos,
    mouse            = excluded.mouse,
    monitor          = excluded.monitor,
    adaptador_tplink = excluded.adaptador_tplink,
    estuche          = excluded.estuche,
    piso             = excluded.piso
`);

const insertNoSerial = db.prepare(`
  INSERT INTO equipos (
    id_activo, cargador, id_ex, team, marca_modelo, procesador,
    ram, disco_duro, so, numero_serie, usuario, estado,
    observacion, responsable, audifonos, mouse, monitor,
    adaptador_tplink, estuche, piso
  ) VALUES (
    @id_activo, @cargador, @id_ex, @team, @marca_modelo, @procesador,
    @ram, @disco_duro, @so, NULL, @usuario, @estado,
    @observacion, @responsable, @audifonos, @mouse, @monitor,
    @adaptador_tplink, @estuche, @piso
  )
`);

const sync = db.transaction((rows) => {
  let inserted = 0, updated = 0;
  for (const row of rows) {
    if (!row.numero_serie) {
      // Sin serial: insertar solo si no existe ya uno igual (mismo id_activo + modelo + estado + piso)
      const existe = db.prepare(
        "SELECT id FROM equipos WHERE numero_serie IS NULL AND COALESCE(id_activo,'') = ? AND marca_modelo = ? AND estado = ? AND piso = ?"
      ).get(row.id_activo || '', row.marca_modelo || '', row.estado || '', row.piso || '');
      if (!existe) { insertNoSerial.run(row); inserted++; }
    } else {
      const exists = db.prepare('SELECT id FROM equipos WHERE numero_serie = ?').get(row.numero_serie);
      upsert.run(row);
      if (exists) updated++; else inserted++;
    }
  }
  return { inserted, updated };
});

const result = sync(newData);

// Normalizar estados
db.prepare("UPDATE equipos SET estado = 'NUEVO' WHERE estado = 'NUEVA'").run();
// Regla de negocio: equipos en uso tienen cargador
db.prepare("UPDATE equipos SET cargador = 'Si' WHERE estado IN ('En uso agente', 'En uso TI')").run();

console.log(`Nuevos: ${result.inserted} | Actualizados: ${result.updated} | Total: ${newData.length}`);

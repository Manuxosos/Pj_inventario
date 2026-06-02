const db = require('./database');
console.log('=== ESTADOS ===');
console.log(db.prepare("SELECT estado, COUNT(*) n FROM equipos GROUP BY estado ORDER BY n DESC").all());
console.log('=== PISOS ===');
console.log(db.prepare("SELECT piso, COUNT(*) n FROM equipos GROUP BY piso ORDER BY n DESC").all());
console.log('=== MODELOS ===');
console.log(db.prepare("SELECT marca_modelo, COUNT(*) n FROM equipos WHERE marca_modelo != '' GROUP BY marca_modelo ORDER BY n DESC").all());
console.log('=== RAM ===');
console.log(db.prepare("SELECT ram, COUNT(*) n FROM equipos WHERE ram != '' GROUP BY ram ORDER BY n DESC").all());
console.log('=== ACCESORIOS ===');
const total = db.prepare("SELECT COUNT(*) n FROM equipos").get().n;
['cargador','mouse','audifonos','monitor','estuche','adaptador_tplink'].forEach(a => {
  const si = db.prepare(`SELECT COUNT(*) n FROM equipos WHERE ${a} = 'Si' OR ${a} = 'Si 2'`).get().n;
  console.log(`${a}: Si=${si} No=${total-si}`);
});

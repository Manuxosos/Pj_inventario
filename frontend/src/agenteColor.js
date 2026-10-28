// Color de la persona (avatar del usuario y ficha del agente). Antes salía
// de la misma paleta que los estados, y un agente "verde" se confundía con
// "Disponible". Ahora las personas usan el cian de la marca; el estado de su
// equipo se muestra aparte, con su color e icono reservados (semantica.js).
const COLOR_PERSONA = '#00f5ff';

export function colorAgente() {
  return COLOR_PERSONA;
}

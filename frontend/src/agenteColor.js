// Misma paleta que usa el Dashboard para gráficas, aplicada acá para que
// cada agente tenga un color distinto y consistente en toda la app.
const PALETA = ['#00e5ff', '#00e676', '#ffca28', '#ce93d8', '#f48fb1', '#82b1ff', '#ffab40'];

export function colorAgente(nombre) {
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) hash = (hash * 31 + nombre.charCodeAt(i)) >>> 0;
  return PALETA[hash % PALETA.length];
}

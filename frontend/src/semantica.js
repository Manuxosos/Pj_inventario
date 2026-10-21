// Sistema de color e iconos de la app. Cada color tiene UN significado y
// siempre va acompañado de un icono y un texto, nunca solo:
//
//   Cian (--neon-cyan)  → marca, navegación y cantidades (gráficos)
//   Estados reservados  → solo para el estado de un equipo (ESTADOS_EQUIPO)
//   Neutro + icono      → agrupaciones (edificio, piso, bodega) y personas
//
// Los colores de estado se validaron juntos y contra el cian de la marca
// para que se distingan también con daltonismo (protan/deutan).
import {
  UserCheck, PackageCheck, Wrench, Ban, CircleHelp,
  Building2, Layers,
  User, MessageSquare, MemoryStick, Cpu, HardDrive, Laptop, Hash, Tag,
  Headphones, Mouse, Monitor, Plug, Briefcase, Wifi, Users,
  PlusCircle, Trash2, RotateCcw,
} from 'lucide-react';

export const ESTADOS_EQUIPO = {
  'En uso':      { token: 'uso',        Icon: UserCheck,    desc: 'Asignado a un agente' },
  'Disponible':  { token: 'disponible', Icon: PackageCheck, desc: 'Listo para asignar' },
  'En revisión': { token: 'revision',   Icon: Wrench,       desc: 'En soporte o reparación' },
  'De baja':     { token: 'baja',       Icon: Ban,          desc: 'Retirado del inventario' },
};

const SIN_ESTADO = { token: 'sin', Icon: CircleHelp, desc: 'Sin estado registrado' };

// Devuelve { token, Icon, desc, color, clase } para un estado de equipo.
// `color` es la variable CSS lista para usar en style; `clase` es el badge.
export function metaEstado(estado) {
  const m = ESTADOS_EQUIPO[estado] || SIN_ESTADO;
  return { ...m, color: `var(--estado-${m.token})`, clase: `badge-estado badge-estado-${m.token}` };
}

export const IconoEdificio = Building2;
export const IconoPersonas = Users;

// Icono por campo del historial / ficha del equipo.
export const CAMPO_ICON = {
  id_activo: Tag, id_ex: Tag, numero_serie: Hash, marca_modelo: Laptop,
  procesador: Cpu, ram: MemoryStick, disco_duro: HardDrive, so: Laptop,
  responsable: User, usuario: User, team: Briefcase,
  piso: Layers, edificio: Building2, observacion: MessageSquare,
  audifonos: Headphones, mouse: Mouse, monitor: Monitor, cargador: Plug,
  adaptador_tplink: Wifi, estuche: Briefcase,
  creacion: PlusCircle, eliminacion: Trash2, restauracion: RotateCcw,
};

// ── RAM ───────────────────────────────────────────────────────────────────
// El Excel trae la RAM escrita de muchas formas ("8 GB", "16.00GB",
// "16 GB RAM"...). Se agrupa por capacidad real y se ordena de menor a
// mayor; lo que no se reconoce va a "Otro".
const RAM_VALIDAS = [2, 4, 6, 8, 12, 16, 20, 24, 32, 48, 64, 128];

export function grupoRam(raw) {
  if (!raw) return null;
  const m = String(raw).replace(',', '.').match(/(\d+(?:\.\d+)?)/);
  const gb = m ? Math.round(parseFloat(m[1])) : NaN;
  return RAM_VALIDAS.includes(gb) ? `${gb}GB` : 'Otro';
}

export function ordenRam(grupo) {
  return grupo === 'Otro' ? Infinity : parseInt(grupo);
}

// Escala secuencial de un solo tono (más RAM = más brillante). Validada:
// luminosidad monótona y pasos visibles sobre el fondo oscuro.
const RAMPA_RAM = ['#0b4f63', '#0a7590', '#049cbb', '#00c2e3', '#4fe3ff', '#b0f5ff'];
const COLOR_OTRO = '#334155';

// Asigna color según la posición de cada capacidad dentro de las presentes.
export function coloresRam(grupos) {
  const reales = grupos.filter(g => g !== 'Otro');
  const n = reales.length;
  const mapa = {};
  reales.forEach((g, i) => {
    const idx = n <= 1 ? RAMPA_RAM.length - 1 : Math.round((i / (n - 1)) * (RAMPA_RAM.length - 1));
    mapa[g] = RAMPA_RAM[idx];
  });
  mapa.Otro = COLOR_OTRO;
  return mapa;
}

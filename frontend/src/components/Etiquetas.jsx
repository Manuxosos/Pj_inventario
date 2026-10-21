import { Layers, Warehouse } from 'lucide-react';
import { metaEstado, IconoEdificio } from '../semantica';

// Estado de un equipo: color reservado + icono + texto.
export function EstadoBadge({ estado, size = 12 }) {
  const { Icon, clase, desc } = metaEstado(estado);
  return (
    <span className={`badge ${clase}`} title={desc}>
      <Icon size={size} /> {estado || 'Sin estado'}
    </span>
  );
}

// Icono de una ubicación: la bodega se distingue de los pisos.
export function IconoUbicacion({ piso, size = 12 }) {
  return /bodega/i.test(piso || '') ? <Warehouse size={size} /> : <Layers size={size} />;
}

// Agrupación (piso, bodega o edificio): neutra, identificada por su icono.
export function GrupoChip({ piso, edificio }) {
  return (
    <span className="chip-grupo">
      {edificio ? <IconoEdificio size={10} /> : <IconoUbicacion piso={piso} size={10} />} {edificio || piso}
    </span>
  );
}

// Leyenda de estados para vistas donde el color no va acompañado de texto
// (por ejemplo, el anillo de los asientos en Agentes).
export function LeyendaEstados({ estados, extra }) {
  return (
    <ul className="leyenda-estados">
      {estados.map(e => {
        const { Icon, color, desc } = metaEstado(e);
        return (
          <li key={e} title={desc} style={{ '--c': color }}>
            <Icon size={12} /> {e}
          </li>
        );
      })}
      {extra}
    </ul>
  );
}

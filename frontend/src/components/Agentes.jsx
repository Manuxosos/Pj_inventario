import { useState, useEffect } from 'react';
import { getAgentesTablero, moverAgente } from '../api';
import AgenteInfoModal from './AgenteInfoModal';
import { colorAgente } from '../agenteColor';
import './Agentes.css';

const ESTADO_RING = {
  'En uso':      '#00e5ff',
  'Disponible':  '#00e676',
  'En revisión': '#ffca28',
  'De baja':     '#f48fb1',
};

function iniciales(nombre) {
  return nombre.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

function splitFilas(agentes) {
  const mitad = Math.ceil(agentes.length / 2);
  return { arriba: agentes.slice(0, mitad), abajo: agentes.slice(mitad) };
}

function Asiento({ nombre, estado, draggable, dragging, onDragStart, onDragEnd, onClick }) {
  const color = colorAgente(nombre);
  const anillo = ESTADO_RING[estado] || 'transparent';
  return (
    <div
      className={`asiento ${draggable ? 'asiento-draggable' : 'asiento-clickable'} ${dragging ? 'asiento-dragging' : ''}`}
      draggable={draggable}
      onDragStart={draggable ? onDragStart : undefined}
      onDragEnd={draggable ? onDragEnd : undefined}
      onClick={onClick}
      title={estado ? `${nombre} · ${estado}` : nombre}
      style={{ '--agente-color': color, '--agente-glow': `${color}66` }}
    >
      <span className="asiento-anillo" style={{ borderColor: anillo }}>
        <span className="asiento-avatar">{iniciales(nombre)}</span>
      </span>
      <span className="asiento-nombre">{nombre}</span>
    </div>
  );
}

export default function Agentes({ rol, onOpenEquipo, onEditEquipo }) {
  const puedeMover = rol === 'admin' || rol === 'it';
  const [tablero, setTablero] = useState({});
  const [pisos, setPisos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dragOver, setDragOver] = useState(null); // `${piso}|${mesa}`
  const [dragging, setDragging] = useState(null); // nombre del agente en vuelo
  const [moviendo, setMoviendo] = useState(false);
  const [agenteSel, setAgenteSel] = useState(null); // { nombre, piso, mesa }

  const cargar = () => {
    getAgentesTablero().then(d => {
      setTablero(d.tablero || {});
      setPisos(d.pisos || []);
      setLoading(false);
    });
  };

  useEffect(() => { cargar(); }, []);

  const handleDragStart = (e, agente, pisoOrigen, mesaOrigen) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ agente, pisoOrigen, mesaOrigen }));
    e.dataTransfer.effectAllowed = 'move';
    setDragging(agente);
  };

  const handleDragEnd = () => {
    setDragging(null);
    setDragOver(null);
  };

  const handleDrop = async (e, pisoDestino, mesaDestino) => {
    e.preventDefault();
    setDragOver(null);
    const data = e.dataTransfer.getData('application/json');
    if (!data) return;
    const { agente, pisoOrigen, mesaOrigen } = JSON.parse(data);
    if (pisoOrigen === pisoDestino && mesaOrigen === mesaDestino) return;
    setMoviendo(true);
    try {
      await moverAgente(agente, pisoDestino, mesaDestino);
      cargar();
    } finally {
      setMoviendo(false);
    }
  };

  if (loading) return <div className="dash-loading">Cargando tablero de agentes...</div>;

  return (
    <div className="agentes-page">
      <div className="agentes-header">
        <div>
          <h2 className="agentes-title">Agentes por piso</h2>
          <p className="agentes-sub">
            {puedeMover
              ? 'Arrastrá un agente para moverlo de mesa o de piso, o hacé click para ver su información.'
              : 'Hacé click en un agente para ver su información.'}
          </p>
        </div>
      </div>

      {pisos.length === 0 ? (
        <div className="table-empty">No hay agentes con equipos asignados a ningún piso todavía.</div>
      ) : (
        <div className="agentes-pisos">
          {pisos.map(piso => (
            <div key={piso} className="agentes-piso-card card">
              <h3 className="agentes-piso-title">{piso}</h3>
              <div className="agentes-mesas">
                {[1, 2].map(mesa => {
                  const key = `${piso}|${mesa}`;
                  const agentes = tablero[piso]?.[mesa] || [];
                  const { arriba, abajo } = splitFilas(agentes);
                  return (
                    <div key={mesa} className="mesa-bloque">
                      <div className="mesa-label">Mesa {mesa}</div>
                      <div
                        className={`mesa-visual ${dragOver === key ? 'mesa-visual-over' : ''}`}
                        onDragOver={puedeMover ? (e) => { e.preventDefault(); setDragOver(key); } : undefined}
                        onDragLeave={puedeMover ? () => setDragOver(null) : undefined}
                        onDrop={puedeMover ? (e) => handleDrop(e, piso, mesa) : undefined}
                      >
                        {agentes.length === 0 ? (
                          <span className="mesa-vacia">Sin agentes</span>
                        ) : (
                          <>
                            <div className="mesa-fila mesa-fila-arriba">
                              {arriba.map(a => (
                                <Asiento key={a.nombre} nombre={a.nombre} estado={a.estado} draggable={puedeMover}
                                  dragging={dragging === a.nombre}
                                  onDragStart={(e) => handleDragStart(e, a.nombre, piso, mesa)}
                                  onDragEnd={handleDragEnd}
                                  onClick={() => setAgenteSel({ nombre: a.nombre, piso, mesa })} />
                              ))}
                            </div>
                            <div className="mesa-tablero" />
                            <div className="mesa-fila mesa-fila-abajo">
                              {abajo.map(a => (
                                <Asiento key={a.nombre} nombre={a.nombre} estado={a.estado} draggable={puedeMover}
                                  dragging={dragging === a.nombre}
                                  onDragStart={(e) => handleDragStart(e, a.nombre, piso, mesa)}
                                  onDragEnd={handleDragEnd}
                                  onClick={() => setAgenteSel({ nombre: a.nombre, piso, mesa })} />
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {moviendo && <div className="agentes-moviendo">Moviendo agente...</div>}

      {agenteSel && (
        <AgenteInfoModal
          nombre={agenteSel.nombre}
          piso={agenteSel.piso}
          mesa={agenteSel.mesa}
          onClose={() => setAgenteSel(null)}
          onOpenEquipo={onOpenEquipo}
          onEditEquipo={onEditEquipo}
        />
      )}
    </div>
  );
}

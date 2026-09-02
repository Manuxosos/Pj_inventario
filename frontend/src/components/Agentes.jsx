import { useState, useEffect } from 'react';
import { getAgentesTablero, moverAgente, setCapacidadMesa } from '../api';
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

export default function Agentes({ rol, onOpenEquipo, onEditEquipo, onGoToInventario, refresh }) {
  const puedeMover = rol === 'admin' || rol === 'it';
  const [tablero, setTablero] = useState({});
  const [pisos, setPisos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dragOver, setDragOver] = useState(null); // `${piso}|${mesa}`
  const [dragging, setDragging] = useState(null); // nombre del agente en vuelo
  const [moviendo, setMoviendo] = useState(false);
  const [agenteSel, setAgenteSel] = useState(null); // { nombre, piso, mesa }
  const [capacidad, setCapacidad] = useState(7);
  const [capacidadInput, setCapacidadInput] = useState('7');
  const [guardandoCapacidad, setGuardandoCapacidad] = useState(false);

  const cargar = () => {
    getAgentesTablero().then(d => {
      setTablero(d.tablero || {});
      setPisos(d.pisos || []);
      setCapacidad(d.capacidadMesa || 7);
      setCapacidadInput(String(d.capacidadMesa || 7));
      setLoading(false);
    });
  };

  useEffect(() => { cargar(); }, [refresh]);

  const handleGuardarCapacidad = async () => {
    const n = parseInt(capacidadInput);
    if (!Number.isInteger(n) || n < 1 || n > 50) return;
    setGuardandoCapacidad(true);
    try {
      await setCapacidadMesa(n);
      cargar();
    } finally {
      setGuardandoCapacidad(false);
    }
  };

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

  if (loading) return (
    <div className="agentes-pisos">
      {[1, 2, 3].map(i => (
        <div key={i} className="agentes-piso-card card">
          <div className="skeleton-bar" style={{ width: '30%', marginBottom: 14 }} />
          <div className="skeleton-bar" style={{ height: 130, borderRadius: 14, marginBottom: 18 }} />
          <div className="skeleton-bar" style={{ height: 130, borderRadius: 14 }} />
        </div>
      ))}
    </div>
  );

  return (
    <div className="agentes-page">
      <div className="agentes-header">
        <div>
          <h2 className="agentes-title">Agentes por piso</h2>
          <p className="agentes-sub">
            {puedeMover
              ? 'Arrastra un agente para moverlo de mesa o de piso, o haz click para ver su información.'
              : 'Haz click en un agente para ver su información.'}
          </p>
        </div>
        {puedeMover && (
          <div className="agentes-capacidad">
            <label className="agentes-capacidad-label">Agentes por mesa</label>
            <input
              type="number"
              min="1"
              max="50"
              className="agentes-capacidad-input"
              value={capacidadInput}
              onChange={e => setCapacidadInput(e.target.value)}
            />
            <button
              className="btn btn-secondary agentes-capacidad-btn"
              onClick={handleGuardarCapacidad}
              disabled={guardandoCapacidad || parseInt(capacidadInput) === capacidad}
            >
              {guardandoCapacidad ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        )}
      </div>

      {pisos.length === 0 ? (
        <div className="table-empty">
          <p>No hay agentes con equipos asignados a ningún piso todavía.</p>
          {puedeMover && onGoToInventario && (
            <button className="btn btn-primary btn-sm" onClick={onGoToInventario}>
              Ir a Inventario
            </button>
          )}
        </div>
      ) : (
        <div className="agentes-pisos">
          {pisos.map(piso => {
            const mesasUsadas = Object.keys(tablero[piso] || {}).map(Number);
            const maxMesa = mesasUsadas.length ? Math.max(...mesasUsadas) : 1;
            // se muestra una mesa vacía extra al final para poder arrastrar un
            // agente ahí y que el sistema genere esa mesa automáticamente
            const mesasARenderizar = Array.from(
              { length: maxMesa + (puedeMover ? 1 : 0) },
              (_, i) => i + 1
            );
            return (
            <div key={piso} className="agentes-piso-card card">
              <h3 className="agentes-piso-title">{piso}</h3>
              <div className="agentes-mesas">
                {mesasARenderizar.map(mesa => {
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
            );
          })}
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

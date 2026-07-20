import { useState, useEffect } from 'react';
import { getAgentesTablero, moverAgente } from '../api';
import './Agentes.css';

function iniciales(nombre) {
  return nombre.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

function splitFilas(agentes) {
  const mitad = Math.ceil(agentes.length / 2);
  return { arriba: agentes.slice(0, mitad), abajo: agentes.slice(mitad) };
}

function Asiento({ nombre, draggable, onDragStart }) {
  return (
    <div
      className={`asiento ${draggable ? 'asiento-draggable' : ''}`}
      draggable={draggable}
      onDragStart={draggable ? onDragStart : undefined}
      title={draggable ? 'Arrastrá para mover' : nombre}
    >
      <span className="asiento-avatar">{iniciales(nombre)}</span>
      <span className="asiento-nombre">{nombre}</span>
    </div>
  );
}

export default function Agentes({ rol }) {
  const puedeMover = rol === 'admin' || rol === 'it';
  const [tablero, setTablero] = useState({});
  const [pisos, setPisos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dragOver, setDragOver] = useState(null); // `${piso}|${mesa}`
  const [moviendo, setMoviendo] = useState(false);

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
              ? 'Arrastrá un agente para moverlo de mesa o de piso. El cambio se refleja en el inventario y en el historial.'
              : 'Vista de solo lectura de dónde está sentado cada agente.'}
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
                              {arriba.map(nombre => (
                                <Asiento key={nombre} nombre={nombre} draggable={puedeMover}
                                  onDragStart={(e) => handleDragStart(e, nombre, piso, mesa)} />
                              ))}
                            </div>
                            <div className="mesa-tablero" />
                            <div className="mesa-fila mesa-fila-abajo">
                              {abajo.map(nombre => (
                                <Asiento key={nombre} nombre={nombre} draggable={puedeMover}
                                  onDragStart={(e) => handleDragStart(e, nombre, piso, mesa)} />
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
    </div>
  );
}

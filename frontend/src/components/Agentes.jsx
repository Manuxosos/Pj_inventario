import { useState, useEffect } from 'react';
import { GripVertical } from 'lucide-react';
import { getAgentesTablero, moverAgente } from '../api';
import './Agentes.css';

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
                  return (
                    <div
                      key={mesa}
                      className={`agentes-mesa ${dragOver === key ? 'agentes-mesa-over' : ''}`}
                      onDragOver={puedeMover ? (e) => { e.preventDefault(); setDragOver(key); } : undefined}
                      onDragLeave={puedeMover ? () => setDragOver(null) : undefined}
                      onDrop={puedeMover ? (e) => handleDrop(e, piso, mesa) : undefined}
                    >
                      <div className="agentes-mesa-label">Mesa {mesa}</div>
                      <div className="agentes-mesa-surface" />
                      <div className="agentes-mesa-chips">
                        {agentes.length === 0 ? (
                          <span className="agentes-mesa-vacia">Sin agentes</span>
                        ) : (
                          agentes.map(nombre => (
                            <div
                              key={nombre}
                              className={`agente-chip ${puedeMover ? 'agente-chip-draggable' : ''}`}
                              draggable={puedeMover}
                              onDragStart={puedeMover ? (e) => handleDragStart(e, nombre, piso, mesa) : undefined}
                              title={puedeMover ? 'Arrastrá para mover' : nombre}
                            >
                              {puedeMover && <GripVertical size={12} className="agente-chip-grip" />}
                              <span>{nombre}</span>
                            </div>
                          ))
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

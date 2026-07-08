import { Users } from 'lucide-react';
import './PisoSimModal.css';

const CAPACIDAD_MESA = 8;

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function iniciales(nombre) {
  return nombre.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

function Seat({ nombre }) {
  return (
    <div className={`seat ${nombre ? 'seat-filled' : 'seat-empty'}`} title={nombre || 'Puesto libre'}>
      <span className="seat-avatar">{nombre ? iniciales(nombre) : ''}</span>
      <span className="seat-name">{nombre || ' '}</span>
    </div>
  );
}

export default function PisoSimModal({ piso, agentes, onClose }) {
  const mesas = chunk(agentes, CAPACIDAD_MESA);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box piso-sim-box">
        <div className="modal-header">
          <div>
            <h2>Distribución — {piso}</h2>
            <p className="piso-sim-sub"><Users size={13} /> {agentes.length} {agentes.length === 1 ? 'agente' : 'agentes'} con equipo en uso</p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body piso-sim-body">
          {agentes.length === 0 ? (
            <p className="piso-sim-empty">No hay agentes con equipos en uso registrados en este piso.</p>
          ) : (
            <div className="mesas-grid">
              {mesas.map((mesaAgentes, i) => {
                const padded = [...mesaAgentes, ...Array(CAPACIDAD_MESA - mesaAgentes.length).fill(null)];
                const top = padded.slice(0, 4);
                const bottom = padded.slice(4, 8);
                return (
                  <div className="mesa-card" key={i}>
                    <div className="mesa-label">Mesa {i + 1}</div>
                    <div className="mesa-table">
                      <div className="mesa-row">
                        {top.map((nombre, j) => <Seat key={j} nombre={nombre} />)}
                      </div>
                      <div className="mesa-surface" />
                      <div className="mesa-row">
                        {bottom.map((nombre, j) => <Seat key={j} nombre={nombre} />)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

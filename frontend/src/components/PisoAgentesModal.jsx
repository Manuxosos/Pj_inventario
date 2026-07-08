import { Users, User } from 'lucide-react';
import './PisoAgentesModal.css';

export default function PisoAgentesModal({ piso, agentes, onClose }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box piso-agentes-box">
        <div className="modal-header">
          <div>
            <h2>Agentes — {piso}</h2>
            <p className="piso-agentes-sub"><Users size={13} /> {agentes.length} {agentes.length === 1 ? 'agente' : 'agentes'}</p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {agentes.length === 0 ? (
            <p className="piso-agentes-empty">No hay agentes o responsables registrados en este piso.</p>
          ) : (
            <ul className="piso-agentes-list">
              {agentes.map((nombre, i) => (
                <li key={i} className="piso-agentes-item">
                  <User size={14} />
                  <span>{nombre}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

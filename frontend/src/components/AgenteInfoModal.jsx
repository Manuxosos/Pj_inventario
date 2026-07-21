import { useState, useEffect } from 'react';
import { X, Laptop } from 'lucide-react';
import { getEquipos } from '../api';
import { colorAgente } from '../agenteColor';
import './AgenteInfoModal.css';

function iniciales(nombre) {
  return nombre.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

const ESTADO_BADGE = {
  'En uso':      'badge-blue',
  'Disponible':  'badge-green',
  'En revisión': 'badge-yellow',
  'De baja':     'badge-red',
};

export default function AgenteInfoModal({ nombre, piso, mesa, onClose, onOpenEquipo }) {
  const [equipos, setEquipos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEquipos({ responsable: nombre }).then(d => { setEquipos(d); setLoading(false); });
  }, [nombre]);

  const color = colorAgente(nombre);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box agente-info-box">
        <div className="modal-header">
          <div className="agente-info-encabezado">
            <span className="agente-info-avatar" style={{ background: color, boxShadow: `0 0 10px ${color}66` }}>
              {iniciales(nombre)}
            </span>
            <div>
              <h2>{nombre}</h2>
              <p className="agente-info-sub">{piso} · Mesa {mesa}</p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body">
          <h3 className="section-title">Equipos asignados</h3>
          {loading ? (
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Cargando...</p>
          ) : equipos.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No tiene equipos asignados.</p>
          ) : (
            <div className="agente-info-equipos">
              {equipos.map(eq => (
                <div
                  key={eq.id}
                  className="agente-info-equipo"
                  onClick={() => { onOpenEquipo?.(eq.id); onClose(); }}
                  title="Ver detalle del equipo"
                >
                  <Laptop size={16} className="agente-info-equipo-icon" />
                  <div className="agente-info-equipo-datos">
                    <span className="agente-info-equipo-modelo">{eq.marca_modelo || 'Sin modelo'}</span>
                    <span className="agente-info-equipo-serie">NS: {eq.numero_serie || '—'} · ID: {eq.id_activo || '—'}</span>
                  </div>
                  {eq.estado && (
                    <span className={`badge ${ESTADO_BADGE[eq.estado] || 'badge-gray'}`}>{eq.estado}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

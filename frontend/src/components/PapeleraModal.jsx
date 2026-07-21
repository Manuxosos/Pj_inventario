import { useState, useEffect } from 'react';
import { Trash2, RotateCcw, X } from 'lucide-react';
import { getPapelera, restaurarEquipo, eliminarDefinitivo } from '../api';
import ConfirmModal from './ConfirmModal';
import './PapeleraModal.css';

function fmtDate(iso) {
  return new Date(iso).toLocaleString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function PapeleraModal({ onClose, onCambio }) {
  const [equipos, setEquipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(null);
  const [confirmarBorrado, setConfirmarBorrado] = useState(null); // { id, label }

  const cargar = () => {
    setLoading(true);
    getPapelera().then(d => { setEquipos(d); setLoading(false); });
  };

  useEffect(() => { cargar(); }, []);

  const handleRestaurar = async (eq) => {
    setProcesando(eq.id);
    await restaurarEquipo(eq.id);
    setEquipos(prev => prev.filter(e => e.id !== eq.id));
    setProcesando(null);
    onCambio?.();
  };

  const handleEliminarDefinitivo = async () => {
    if (!confirmarBorrado) return;
    setProcesando(confirmarBorrado.id);
    await eliminarDefinitivo(confirmarBorrado.id);
    setEquipos(prev => prev.filter(e => e.id !== confirmarBorrado.id));
    setProcesando(null);
    setConfirmarBorrado(null);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box papelera-box">
        <div className="modal-header">
          <h2>Papelera de equipos</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body">
          {loading ? (
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Cargando...</p>
          ) : equipos.length === 0 ? (
            <p className="papelera-vacia">La papelera está vacía.</p>
          ) : (
            <div className="papelera-lista">
              {equipos.map(eq => (
                <div key={eq.id} className="papelera-item">
                  <div className="papelera-item-datos">
                    <span className="papelera-item-modelo">{eq.marca_modelo || 'Sin modelo'}</span>
                    <span className="papelera-item-sub">
                      ID: {eq.id_activo || '—'} · NS: {eq.numero_serie || '—'} · Eliminado el {fmtDate(eq.eliminado_en)}
                    </span>
                  </div>
                  <div className="papelera-item-acciones">
                    <button className="btn btn-secondary btn-sm" disabled={procesando === eq.id}
                      onClick={() => handleRestaurar(eq)}>
                      <RotateCcw size={13} /> Restaurar
                    </button>
                    <button className="btn btn-danger btn-sm" disabled={procesando === eq.id}
                      onClick={() => setConfirmarBorrado({ id: eq.id, label: eq.marca_modelo || eq.id_activo || `Equipo #${eq.id}` })}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {confirmarBorrado && (
        <ConfirmModal
          title="Eliminar definitivamente"
          message={`¿Estás seguro? "${confirmarBorrado.label}" se va a borrar para siempre y no se puede deshacer.`}
          confirmLabel="Eliminar para siempre"
          onConfirm={handleEliminarDefinitivo}
          onCancel={() => setConfirmarBorrado(null)}
        />
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { getHistorial, updateNota } from '../api';
import { MessageSquare, MessageSquarePlus } from 'lucide-react';
import './Actividad.css';

const CAMPO_LABEL = {
  id_activo:'ID Activo', cargador:'Cargador', id_ex:'ID EX', team:'Team / Agente',
  marca_modelo:'Marca / Modelo', procesador:'Procesador', ram:'RAM',
  disco_duro:'Disco Duro', so:'Sistema Operativo', numero_serie:'Nº de Serie',
  usuario:'Usuario asignado', estado:'Estado', observacion:'Observación',
  responsable:'Responsable', audifonos:'Audífonos', mouse:'Mouse',
  monitor:'Monitor', adaptador_tplink:'Adaptador Tp-Link', estuche:'Estuche',
  piso:'Piso', creacion:'Creación',
};

function fmtDate(iso) {
  return new Date(iso).toLocaleString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function Actividad({ rol }) {
  const [entradas,  setEntradas]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [notaModal, setNotaModal] = useState(null); // { id, nota }

  const puedeNota = rol === 'admin' || rol === 'it';

  const cargar = () => {
    setLoading(true);
    getHistorial(100).then(d => { setEntradas(d); setLoading(false); });
  };

  useEffect(() => { cargar(); }, []);

  const handleGuardarNota = async (id, nota) => {
    await updateNota(id, nota);
    setEntradas(prev => prev.map(e => e.id === id ? { ...e, nota } : e));
    setNotaModal(null);
  };

  return (
    <div className="actividad-page">
      <div className="actividad-header">
        <div>
          <h2 className="actividad-title">Actividad reciente</h2>
          <p className="actividad-sub">Todos los cambios registrados en el inventario</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={cargar}>↺ Actualizar</button>
      </div>

      {loading ? (
        <div className="table-loading">Cargando...</div>
      ) : entradas.length === 0 ? (
        <div className="table-empty" style={{ padding: 48 }}>
          Aún no hay cambios registrados. Los cambios aparecerán aquí cuando se editen equipos.
        </div>
      ) : (
        <div className="actividad-feed card">
          {entradas.map((e, idx) => (
            <div key={e.id} className={`feed-item ${idx < entradas.length - 1 ? 'feed-item-border' : ''}`}>
              <div className="feed-dot" />
              <div className="feed-content">
                <div className="feed-top">
                  <span className="feed-equipo">{e.equipo_label || `Equipo #${e.equipo_id}`}</span>
                  {e.equipo_piso && <span className="feed-piso">{e.equipo_piso}</span>}
                  <span className="feed-time">{fmtDate(e.created_at)}</span>
                </div>

                <div className="feed-cambio">
                  <span className="feed-campo">{CAMPO_LABEL[e.campo] || e.campo}</span>
                  {e.campo !== 'creacion' ? (
                    <>
                      <span className="feed-ant">{e.valor_ant || '—'}</span>
                      <span className="feed-arrow">→</span>
                      <span className="feed-nuevo">{e.valor_nuevo || '—'}</span>
                    </>
                  ) : (
                    <span className="feed-nuevo">{e.valor_nuevo}</span>
                  )}
                </div>

                <div className="feed-bottom">
                  <span className="feed-usuario">por {e.usuario_nombre}</span>
                  {e.nota && <span className="feed-nota">"{e.nota}"</span>}
                  {puedeNota && (
                    <button
                      className={`btn-nota ${e.nota ? 'btn-nota-filled' : ''}`}
                      title={e.nota ? 'Editar nota' : 'Agregar nota'}
                      onClick={() => setNotaModal({ id: e.id, nota: e.nota || '' })}
                    >
                      {e.nota ? <MessageSquare size={12} /> : <MessageSquarePlus size={12} />}
                      {e.nota ? 'Editar nota' : 'Agregar nota'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {notaModal && (
        <NotaModal
          id={notaModal.id}
          notaInicial={notaModal.nota}
          onClose={() => setNotaModal(null)}
          onSaved={handleGuardarNota}
        />
      )}
    </div>
  );
}

function NotaModal({ id, notaInicial, onClose, onSaved }) {
  const [nota, setNota] = useState(notaInicial);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSave = async () => {
    setSaving(true);
    await onSaved(id, nota);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h2>{notaInicial ? 'Editar nota' : 'Agregar nota'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <section className="form-section">
            <div className="form-group">
              <label className="form-label">Nota sobre este cambio</label>
              <textarea
                className="form-input"
                rows={4}
                autoFocus
                value={nota}
                onChange={e => setNota(e.target.value)}
                placeholder="Ej: Pepito dejó la empresa, Juanito toma el equipo desde hoy..."
              />
            </div>
          </section>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
              {saving ? 'Guardando...' : 'Guardar nota'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { createEquipo, updateEquipo, getHistorialEquipo, updateNota, getOpciones } from '../api';
import { MessageSquare, MessageSquarePlus } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import './EquipoModal.css';

const OTRO_PISO = '__otro__';

const CAMPO_LABEL = {
  id_activo:'ID Activo', cargador:'Cargador', id_ex:'ID EX', team:'Team / Agente',
  marca_modelo:'Marca / Modelo', procesador:'Procesador', ram:'RAM',
  disco_duro:'Disco Duro', so:'Sistema Operativo', numero_serie:'Nº de Serie',
  usuario:'Usuario asignado', estado:'Estado', observacion:'Observación',
  responsable:'Responsable', audifonos:'Audífonos', mouse:'Mouse',
  monitor:'Monitor', adaptador_tplink:'Adaptador Tp-Link', estuche:'Estuche',
  piso:'Piso', creacion:'Creación', eliminacion:'Eliminación', restauracion:'Restauración',
};

function fmtDate(iso) {
  return new Date(iso).toLocaleString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

const FIELDS = [
  { key: 'id_activo', label: 'ID Activo', group: 'general' },
  { key: 'id_ex', label: 'ID EX', group: 'general' },
  { key: 'piso', label: 'Piso', group: 'general', type: 'piso' },
  { key: 'team', label: 'Agente / Team', group: 'general' },
  { key: 'responsable', label: 'Responsable IT', group: 'general' },
  { key: 'estado', label: 'Estado', group: 'general', type: 'select',
    options: ['En uso', 'Disponible', 'En revisión', 'De baja'] },
  { key: 'marca_modelo', label: 'Marca / Modelo', group: 'specs' },
  { key: 'procesador', label: 'Procesador', group: 'specs' },
  { key: 'ram', label: 'RAM', group: 'specs' },
  { key: 'disco_duro', label: 'Disco Duro', group: 'specs' },
  { key: 'so', label: 'Sistema Operativo', group: 'specs' },
  { key: 'numero_serie', label: 'Nº de Serie', group: 'specs' },
  { key: 'cargador', label: 'Cargador', group: 'accesorios', type: 'select', options: ['Si', 'No'] },
  { key: 'audifonos', label: 'Audífonos', group: 'accesorios', type: 'select', options: ['Si', 'No'] },
  { key: 'mouse', label: 'Mouse', group: 'accesorios', type: 'select', options: ['Si', 'Si 2', 'No'] },
  { key: 'monitor', label: 'Monitor', group: 'accesorios', type: 'select', options: ['Si', 'No'] },
  { key: 'adaptador_tplink', label: 'Adaptador Tp-Link', group: 'accesorios', type: 'select', options: ['Si', 'No'] },
  { key: 'estuche', label: 'Estuche', group: 'accesorios', type: 'select', options: ['Si', 'No'] },
  { key: 'observacion', label: 'Observación', group: 'otros', type: 'textarea' },
];

const GROUPS = [
  { key: 'general', label: 'Información General' },
  { key: 'specs', label: 'Especificaciones' },
  { key: 'accesorios', label: 'Accesorios' },
  { key: 'otros', label: 'Observaciones' },
];

const empty = () => Object.fromEntries(FIELDS.map(f => [f.key, '']));

export default function EquipoModal({ mode, equipo, rol, onClose, onSaved }) {
  const [form,      setForm]      = useState(equipo ? { ...equipo } : empty());
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');
  const [historial, setHistorial] = useState([]);
  const [notaEdit,  setNotaEdit]  = useState(null); // { id, nota }
  const [pisos,      setPisos]      = useState([]);
  const [pisoManual, setPisoManual] = useState(false);
  const [confirmDescartar, setConfirmDescartar] = useState(false);
  const isView = mode === 'view';
  const puedeNota = rol === 'admin' || rol === 'it';
  const snapshotInicial = useRef(JSON.stringify(form));

  const hayCambiosSinGuardar = () => !isView && JSON.stringify(form) !== snapshotInicial.current;

  const intentarCerrar = () => {
    if (hayCambiosSinGuardar()) setConfirmDescartar(true);
    else onClose();
  };

  useEffect(() => {
    if (isView && equipo?.id) {
      getHistorialEquipo(equipo.id).then(setHistorial);
    }
  }, [isView, equipo?.id]);

  useEffect(() => {
    if (!isView) getOpciones().then(o => setPisos(o.pisos || []));
  }, [isView]);

  useEffect(() => {
    if (form.piso && pisos.length && !pisos.includes(form.piso)) {
      setPisoManual(true);
    }
  }, [pisos]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGuardarNota = async (hId, nota) => {
    await updateNota(hId, nota);
    setHistorial(prev => prev.map(e => e.id === hId ? { ...e, nota } : e));
    setNotaEdit(null);
  };

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') intentarCerrar(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }); // sin deps: siempre usa la version mas reciente de intentarCerrar/form

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.numero_serie) { setError('El Nº de Serie es obligatorio.'); return; }
    setSaving(true);
    setError('');
    try {
      if (mode === 'edit') await updateEquipo(equipo.id, form);
      else await createEquipo(form);
      onSaved(mode === 'edit' ? 'Equipo actualizado correctamente' : 'Equipo creado correctamente');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar.');
      setSaving(false);
    }
  };

  const title = { create: 'Nuevo Equipo', edit: 'Editar Equipo', view: 'Detalle del Equipo' }[mode];

  if (notaEdit) return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setNotaEdit(null)}>
      <div className="modal-box" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h2>{notaEdit.nota ? 'Editar nota' : 'Agregar nota'}</h2>
          <button className="modal-close" onClick={() => setNotaEdit(null)}>✕</button>
        </div>
        <div className="modal-body">
          <section className="form-section">
            <div className="form-group">
              <label className="form-label">Nota sobre este cambio</label>
              <textarea className="form-input" rows={4} autoFocus
                value={notaEdit.nota}
                onChange={e => setNotaEdit(n => ({ ...n, nota: e.target.value }))}
                placeholder="Ej: Pepito dejó la empresa, Juanito toma el equipo..." />
            </div>
          </section>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => setNotaEdit(null)}>Cancelar</button>
            <button className="btn btn-primary" onClick={() => handleGuardarNota(notaEdit.id, notaEdit.nota)}>
              Guardar nota
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && intentarCerrar()}>
      <div className="modal-box">
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={intentarCerrar}>✕</button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          {GROUPS.map(group => {
            const groupFields = FIELDS.filter(f => f.group === group.key);
            return (
              <section key={group.key} className="form-section">
                <h3 className="section-title">{group.label}</h3>
                <div className="form-grid">
                  {groupFields.map(field => (
                    <div key={field.key} className={`form-group ${field.type === 'textarea' ? 'full-width' : ''}`}>
                      <label className="form-label">{field.label}</label>
                      {isView ? (
                        <div className="view-value">{form[field.key] || <span className="text-muted">—</span>}</div>
                      ) : field.type === 'piso' ? (
                        pisoManual ? (
                          <div className="piso-manual-group">
                            <input
                              className="form-input"
                              autoFocus
                              placeholder="Ej: PISO 6"
                              value={form.piso || ''}
                              onChange={e => setForm(f => ({ ...f, piso: e.target.value }))}
                            />
                            {pisos.length > 0 && (
                              <button type="button" className="btn-link-small" onClick={() => setPisoManual(false)}>
                                Elegir de la lista
                              </button>
                            )}
                          </div>
                        ) : (
                          <select
                            className="form-input"
                            value={form.piso || ''}
                            onChange={e => {
                              if (e.target.value === OTRO_PISO) {
                                setPisoManual(true);
                                setForm(f => ({ ...f, piso: '' }));
                              } else {
                                setForm(f => ({ ...f, piso: e.target.value }));
                              }
                            }}
                          >
                            <option value="">—</option>
                            {pisos.map(o => <option key={o} value={o}>{o}</option>)}
                            <option value={OTRO_PISO}>Otro (nuevo piso)...</option>
                          </select>
                        )
                      ) : field.type === 'textarea' ? (
                        <textarea
                          className="form-input"
                          rows={3}
                          value={form[field.key] || ''}
                          onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                        />
                      ) : field.type === 'select' ? (
                        <select
                          className="form-input"
                          value={form[field.key] || ''}
                          onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                        >
                          <option value="">—</option>
                          {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input
                          className="form-input"
                          value={form[field.key] || ''}
                          onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </section>
            );
          })}

          {/* Historial — solo en modo vista */}
          {isView && (
            <section className="form-section">
              <h3 className="section-title">Historial de cambios</h3>
              {historial.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>Sin cambios registrados.</p>
              ) : (
                <div className="historial-list">
                  {historial.map(h => (
                    <div key={h.id} className="historial-item">
                      <div className="historial-top">
                        <span className="historial-campo">{CAMPO_LABEL[h.campo] || h.campo}</span>
                        <span className="historial-time">{fmtDate(h.created_at)}</span>
                      </div>
                      {!['creacion', 'eliminacion', 'restauracion'].includes(h.campo) ? (
                        <div className="historial-cambio">
                          <span className="historial-ant">{h.valor_ant || '—'}</span>
                          <span className="historial-arrow">→</span>
                          <span className="historial-nuevo">{h.valor_nuevo || '—'}</span>
                        </div>
                      ) : (
                        <span className="historial-nuevo" style={{ fontSize: 12 }}>{h.valor_nuevo}</span>
                      )}
                      <div className="historial-footer">
                        <span className="historial-usuario">por {h.usuario_nombre}</span>
                        {h.nota && <span className="historial-nota">"{h.nota}"</span>}
                        {puedeNota && (
                          <button className={`btn-nota ${h.nota ? 'btn-nota-filled' : ''}`}
                            onClick={() => setNotaEdit({ id: h.id, nota: h.nota || '' })}>
                            {h.nota ? <MessageSquare size={11} /> : <MessageSquarePlus size={11} />}
                            {h.nota ? 'Editar nota' : 'Agregar nota'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {error && <div className="form-error">{error}</div>}

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={intentarCerrar}>
              {isView ? 'Cerrar' : 'Cancelar'}
            </button>
            {!isView && (
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Guardando...' : mode === 'edit' ? 'Guardar cambios' : 'Crear equipo'}
              </button>
            )}
          </div>
        </form>
      </div>

      {confirmDescartar && (
        <ConfirmModal
          title="Descartar cambios"
          message="Tenés cambios sin guardar. ¿Querés descartarlos y cerrar de todas formas?"
          confirmLabel="Descartar"
          onConfirm={onClose}
          onCancel={() => setConfirmDescartar(false)}
        />
      )}
    </div>
  );
}

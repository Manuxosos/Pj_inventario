import { useState, useEffect, useRef } from 'react';
import { getTareas, createTarea, updateTarea, deleteTarea, getUsuariosAsign } from '../api';
import { PlusCircle, Pencil, Trash2, CheckCircle2, Clock, XCircle, PlayCircle, AlertTriangle } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import './Tareas.css';

const ESTADOS = ['Pendiente', 'En curso', 'Finalizado', 'Cancelado'];

const ESTADO_META = {
  'Pendiente':  { cls: 'est-pending', Icon: Clock },
  'En curso':   { cls: 'est-active',  Icon: PlayCircle },
  'Finalizado': { cls: 'est-done',    Icon: CheckCircle2 },
  'Cancelado':  { cls: 'est-cancel',  Icon: XCircle },
};

const emptyForm = { titulo: '', descripcion: '', estado: 'Pendiente', piso: '', fecha_limite: '', asignado_id: '', asignado_nombre: '' };

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function estaAtrasada(t) {
  if (!t.fecha_limite || t.estado === 'Finalizado' || t.estado === 'Cancelado') return false;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  return new Date(t.fecha_limite) < hoy;
}

export default function Tareas({ rol, miId }) {
  const [tareas,    setTareas]    = useState([]);
  const [usuarios,  setUsuarios]  = useState([]);
  const [modal,     setModal]     = useState(null);
  const [filtro,    setFiltro]    = useState('');
  const [loading,   setLoading]   = useState(true);
  const [deleting,  setDeleting]  = useState(null);
  const [soloMias,  setSoloMias]  = useState(false);

  const puedeEditar = rol === 'admin' || rol === 'it';
  const esAdmin     = rol === 'admin';

  const cargar = () => {
    setLoading(true);
    Promise.all([getTareas(), getUsuariosAsign()]).then(([t, u]) => {
      setTareas(t);
      setUsuarios(u);
      setLoading(false);
    });
  };

  useEffect(() => { cargar(); }, []);

  const handleDelete = async (t) => {
    if (!confirm(`¿Eliminar la tarea "${t.titulo}"?`)) return;
    setDeleting(t.id);
    await deleteTarea(t.id);
    setTareas(prev => prev.filter(x => x.id !== t.id));
    setDeleting(null);
  };

  const tareasAgrupadas = ESTADOS.map(est => ({
    estado: est,
    items: tareas.filter(t =>
      t.estado === est &&
      (!soloMias || String(t.asignado_id) === String(miId)) &&
      (!filtro || t.titulo.toLowerCase().includes(filtro.toLowerCase()) ||
        (t.asignado_nombre || '').toLowerCase().includes(filtro.toLowerCase()) ||
        (t.piso || '').toLowerCase().includes(filtro.toLowerCase()))
    ),
  }));

  return (
    <div className="tareas-page">
      <div className="tareas-header">
        <div>
          <h2 className="tareas-title">Tareas IT</h2>
          <p className="tareas-sub">Seguimiento de trabajos y proyectos del equipo</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            className={`btn btn-sm ${soloMias ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setSoloMias(m => !m)}
          >
            Mis tareas
          </button>
          <input
            className="form-input search-input"
            placeholder="Buscar tarea..."
            value={filtro}
            onChange={e => setFiltro(e.target.value)}
            style={{ width: 200 }}
          />
          {puedeEditar && (
            <button className="btn btn-primary" onClick={() => setModal({ mode: 'create', data: { ...emptyForm } })}>
              <PlusCircle size={14} /> Nueva tarea
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="kanban">
          {ESTADOS.map(est => {
            const { cls, Icon } = ESTADO_META[est];
            return (
              <div key={est} className="kanban-col">
                <div className={`kanban-col-header ${cls}`}>
                  <Icon size={14} />
                  <span>{est}</span>
                </div>
                <div className="kanban-cards">
                  {[1, 2].map(i => (
                    <div key={i} className="tarea-card card" style={{ gap: 8 }}>
                      <div className="skeleton-bar" style={{ width: '80%' }} />
                      <div className="skeleton-bar" style={{ width: '50%', height: 10 }} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="kanban">
          {tareasAgrupadas.map(({ estado, items }) => {
            const { cls, Icon } = ESTADO_META[estado];
            return (
              <div key={estado} className="kanban-col">
                <div className={`kanban-col-header ${cls}`}>
                  <Icon size={14} />
                  <span>{estado}</span>
                  <span className="kanban-count">{items.length}</span>
                </div>
                <div className="kanban-cards">
                  {items.length === 0 && <p className="kanban-empty">Sin tareas</p>}
                  {items.map(t => (
                    <div key={t.id} className={`tarea-card card ${estaAtrasada(t) ? 'tarea-card-atrasada' : ''}`}>
                      <div className="tarea-card-top">
                        <p className="tarea-titulo">{t.titulo}</p>
                        {puedeEditar && (
                          <div className="tarea-actions">
                            <button className="btn btn-ghost btn-sm" title="Editar"
                              onClick={() => setModal({ mode: 'edit', data: { ...t, fecha_limite: t.fecha_limite ? String(t.fecha_limite).slice(0, 10) : '' } })}>
                              <Pencil size={13} />
                            </button>
                            {esAdmin && (
                              <button className="btn btn-ghost btn-sm danger-btn" title="Eliminar"
                                disabled={deleting === t.id}
                                onClick={() => handleDelete(t)}>
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      {t.descripcion && <p className="tarea-desc">{t.descripcion}</p>}
                      <div className="tarea-meta">
                        {t.piso && <span className="tarea-tag">{t.piso}</span>}
                        {t.asignado_nombre && <span className="tarea-tag tarea-tag-blue">👤 {t.asignado_nombre}</span>}
                        {t.fecha_limite && (
                          <span className={`tarea-tag ${estaAtrasada(t) ? 'tarea-tag-atrasada' : 'tarea-tag-fecha'}`}>
                            {estaAtrasada(t) && <AlertTriangle size={11} />}
                            {fmtDate(t.fecha_limite)}
                          </span>
                        )}
                      </div>
                      <p className="tarea-fecha">Creado por {t.creado_nombre} · {fmtDate(t.created_at)}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <TareaModal
          mode={modal.mode}
          data={modal.data}
          usuarios={usuarios}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); cargar(); }}
        />
      )}
    </div>
  );
}

function TareaModal({ mode, data, usuarios, onClose, onSaved }) {
  const [form, setForm]     = useState(data);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [confirmDescartar, setConfirmDescartar] = useState(false);
  const isEdit = mode === 'edit';
  const snapshotInicial = useRef(JSON.stringify(data));

  const intentarCerrar = () => {
    if (JSON.stringify(form) !== snapshotInicial.current) setConfirmDescartar(true);
    else onClose();
  };

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') intentarCerrar(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }); // sin deps: siempre usa la version mas reciente del form

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleAsignado = (id) => {
    const u = usuarios.find(u => String(u.id) === String(id));
    setForm(f => ({ ...f, asignado_id: id, asignado_nombre: u ? u.nombre : '' }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.titulo.trim()) { setError('El título es obligatorio.'); return; }
    setSaving(true);
    setError('');
    try {
      if (isEdit) await updateTarea(form.id, form);
      else        await createTarea(form);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar.');
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && intentarCerrar()}>
      <div className="modal-box" style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <h2>{isEdit ? 'Editar tarea' : 'Nueva tarea'}</h2>
          <button className="modal-close" onClick={intentarCerrar}>✕</button>
        </div>
        <form className="modal-body" onSubmit={handleSubmit}>
          <section className="form-section">
            <div className="form-grid">

              <div className="form-group full-width">
                <label className="form-label">Título</label>
                <input className="form-input" value={form.titulo}
                  onChange={e => set('titulo', e.target.value)}
                  placeholder="Ej: Arreglo de mesas Piso 5" />
              </div>

              <div className="form-group full-width">
                <label className="form-label">Descripción (opcional)</label>
                <textarea className="form-input" rows={3} value={form.descripcion}
                  onChange={e => set('descripcion', e.target.value)}
                  placeholder="Detalles de la tarea..." />
              </div>

              <div className="form-group">
                <label className="form-label">Estado</label>
                <select className="form-input" value={form.estado} onChange={e => set('estado', e.target.value)}>
                  {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Piso / Ubicación</label>
                <input className="form-input" value={form.piso}
                  onChange={e => set('piso', e.target.value)}
                  placeholder="Ej: PISO 5" />
              </div>

              <div className="form-group full-width">
                <label className="form-label">Fecha límite (opcional)</label>
                <input type="date" className="form-input" value={form.fecha_limite || ''}
                  onChange={e => set('fecha_limite', e.target.value)} />
              </div>

              <div className="form-group full-width">
                <label className="form-label">Asignado a</label>
                <select className="form-input" value={form.asignado_id || ''}
                  onChange={e => handleAsignado(e.target.value)}>
                  <option value="">Sin asignar</option>
                  {usuarios.map(u => (
                    <option key={u.id} value={u.id}>{u.nombre} ({u.rol})</option>
                  ))}
                </select>
              </div>

            </div>
          </section>

          {error && <div className="form-error">{error}</div>}

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={intentarCerrar}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear tarea'}
            </button>
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

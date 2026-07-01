import { useState, useEffect } from 'react';
import { getTareas, createTarea, updateTarea, deleteTarea, getUsuariosAsign } from '../api';
import { PlusCircle, Pencil, Trash2, CheckCircle2, Clock, XCircle, PlayCircle } from 'lucide-react';
import './Tareas.css';

const ESTADOS = ['Pendiente', 'En curso', 'Finalizado', 'Cancelado'];

const ESTADO_META = {
  'Pendiente':  { cls: 'est-pending', Icon: Clock },
  'En curso':   { cls: 'est-active',  Icon: PlayCircle },
  'Finalizado': { cls: 'est-done',    Icon: CheckCircle2 },
  'Cancelado':  { cls: 'est-cancel',  Icon: XCircle },
};

const emptyForm = { titulo: '', descripcion: '', estado: 'Pendiente', piso: '', asignado_id: '', asignado_nombre: '' };

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function Tareas({ rol }) {
  const [tareas,    setTareas]    = useState([]);
  const [usuarios,  setUsuarios]  = useState([]);
  const [modal,     setModal]     = useState(null);
  const [filtro,    setFiltro]    = useState('');
  const [loading,   setLoading]   = useState(true);
  const [deleting,  setDeleting]  = useState(null);

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
        <div className="table-loading">Cargando...</div>
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
                    <div key={t.id} className="tarea-card card">
                      <div className="tarea-card-top">
                        <p className="tarea-titulo">{t.titulo}</p>
                        {puedeEditar && (
                          <div className="tarea-actions">
                            <button className="btn btn-ghost btn-sm" title="Editar"
                              onClick={() => setModal({ mode: 'edit', data: { ...t } })}>
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
  const isEdit = mode === 'edit';

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

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
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <h2>{isEdit ? 'Editar tarea' : 'Nueva tarea'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
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
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear tarea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

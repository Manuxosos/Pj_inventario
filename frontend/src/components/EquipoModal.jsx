import { useState, useEffect } from 'react';
import { createEquipo, updateEquipo } from '../api';
import './EquipoModal.css';

const FIELDS = [
  { key: 'id_activo', label: 'ID Activo', group: 'general' },
  { key: 'id_ex', label: 'ID EX', group: 'general' },
  { key: 'piso', label: 'Piso', group: 'general' },
  { key: 'team', label: 'Agente / Team', group: 'general' },
  { key: 'responsable', label: 'Responsable IT', group: 'general' },
  { key: 'estado', label: 'Estado', group: 'general', type: 'select',
    options: ['En uso agente', 'En uso TI', 'NO LISTA', 'LISTA', 'REVISION', 'NUEVO'] },
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

export default function EquipoModal({ mode, equipo, onClose, onSaved }) {
  const [form, setForm] = useState(equipo ? { ...equipo } : empty());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isView = mode === 'view';

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.numero_serie) { setError('El Nº de Serie es obligatorio.'); return; }
    setSaving(true);
    setError('');
    try {
      if (mode === 'edit') await updateEquipo(equipo.id, form);
      else await createEquipo(form);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar.');
      setSaving(false);
    }
  };

  const title = { create: 'Nuevo Equipo', edit: 'Editar Equipo', view: 'Detalle del Equipo' }[mode];

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
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

          {error && <div className="form-error">{error}</div>}

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
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
    </div>
  );
}

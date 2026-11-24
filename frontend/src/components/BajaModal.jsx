import { useState } from 'react';
import { createBaja } from '../api';

export const BAJA_CATEGORIAS = [
  { value: 'laptop',    label: 'Laptop / Equipo' },
  { value: 'audifonos', label: 'Audífonos' },
  { value: 'monitores', label: 'Monitores' },
  { value: 'celulares', label: 'Celulares' },
  { value: 'otro',      label: 'Otro' },
];
export const BAJA_CATEGORIA_LABEL = Object.fromEntries(BAJA_CATEGORIAS.map(c => [c.value, c.label]));

// Modal para registrar una baja (equipo o accesorio dañado sin opción de
// reparación). Se usa desde dos lugares:
//  - EquiposList.jsx: pasando `equipo`, ya vinculado y con categoría/modelo/
//    serie bloqueados (viene de un registro real del inventario).
//  - Bajas.jsx: sin `equipo`, para algo encontrado dañado que nunca estuvo
//    cargado en el sistema (accesorio suelto o un equipo nunca inventariado).
export default function BajaModal({ equipo, esGlobal, edificioSel, edificios, onClose, onSaved }) {
  const esVinculado = !!equipo;
  const [form, setForm] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    categoria: esVinculado ? 'laptop' : 'otro',
    descripcion: equipo?.marca_modelo || '',
    numero_serie: equipo?.numero_serie || '',
    cantidad: 1,
    motivo: '',
    edificio_id: esVinculado ? (equipo.edificio_id ?? '') : (edificioSel ?? ''),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.fecha || !form.descripcion.trim()) { setError('Completa la fecha y la descripción.'); return; }
    if (esGlobal && !esVinculado && !form.edificio_id) { setError('Elige un edificio.'); return; }
    setSaving(true);
    setError('');
    try {
      await createBaja({ ...form, equipo_id: equipo?.id });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar.');
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h2>{esVinculado ? 'Dar de baja equipo' : 'Registrar baja'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        <form className="modal-body" onSubmit={handleSubmit}>
          <section className="form-section">
            {esVinculado && (
              <p className="form-hint">
                <strong>{equipo.marca_modelo || equipo.id_activo}</strong> se retirará del inventario activo y quedará registrado acá como dado de baja.
              </p>
            )}
            <div className="form-grid">

              {esGlobal && !esVinculado && (
                <div className="form-group full-width">
                  <label className="form-label">Edificio</label>
                  <select className="form-input" value={form.edificio_id} onChange={e => set('edificio_id', e.target.value)}>
                    <option value="">Elige un edificio</option>
                    {edificios.map(ed => <option key={ed.id} value={ed.id}>{ed.nombre}</option>)}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Fecha</label>
                <input
                  type="date"
                  className="form-input"
                  value={form.fecha}
                  onChange={e => set('fecha', e.target.value)}
                  onClick={e => { try { e.target.showPicker?.(); } catch { /* no soportado en este navegador */ } }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Categoría</label>
                <select className="form-input" value={form.categoria} onChange={e => set('categoria', e.target.value)} disabled={esVinculado}>
                  {BAJA_CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>

              <div className="form-group full-width">
                <label className="form-label">Descripción / modelo</label>
                <input className="form-input" value={form.descripcion} onChange={e => set('descripcion', e.target.value)}
                  placeholder="Ej: Audífonos Logitech H390" disabled={esVinculado} />
              </div>

              <div className="form-group">
                <label className="form-label">Número de serie (opcional)</label>
                <input className="form-input" value={form.numero_serie} onChange={e => set('numero_serie', e.target.value)} disabled={esVinculado} />
              </div>

              <div className="form-group">
                <label className="form-label">Cantidad</label>
                <input type="number" min="1" className="form-input" value={form.cantidad}
                  onChange={e => set('cantidad', e.target.value)} disabled={esVinculado} />
              </div>

              <div className="form-group full-width">
                <label className="form-label">Motivo (opcional)</label>
                <input className="form-input" value={form.motivo} onChange={e => set('motivo', e.target.value)}
                  placeholder="Ej: Se cayó y no enciende más" />
              </div>

            </div>
          </section>

          {error && <div className="form-error">{error}</div>}

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Dar de baja'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

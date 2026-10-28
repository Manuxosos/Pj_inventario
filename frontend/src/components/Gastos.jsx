import { useState, useEffect } from 'react';
import { getGastos, createGasto, updateGasto, deleteGasto, exportarGastos } from '../api';
import { PlusCircle, Pencil, Trash2, Download, Wallet } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import './Gastos.css';

const PERIODICIDADES = [
  { value: 'mensual',         label: 'Mensual' },
  { value: 'anual',           label: 'Anual' },
  { value: 'unico',           label: 'Único' },
  { value: 'segun_necesidad', label: 'Según necesidad' },
];
const PERIODICIDAD_LABEL = Object.fromEntries(PERIODICIDADES.map(p => [p.value, p.label]));

const ESTADOS = [
  { value: 'activo',    label: 'Activo',    badge: 'badge-green' },
  { value: 'pendiente', label: 'Pendiente', badge: 'badge-yellow' },
  { value: 'cancelado', label: 'Cancelado', badge: 'badge-red' },
];
const ESTADO_META = Object.fromEntries(ESTADOS.map(e => [e.value, e]));

function mesActual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function fmtMonto(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);
}

function fmtFecha(iso) {
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const FORM_VACIO = {
  fecha: new Date().toISOString().slice(0, 10),
  concepto: '', proveedor: '', cantidad: '', monto: '',
  periodicidad: 'unico', estado: 'activo', edificio_id: '',
};

export default function Gastos({ rol, esGlobal, edificioSel, edificios, refresh, showToast }) {
  const [gastos, setGastos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mes, setMes] = useState(mesActual());
  const [modal, setModal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [exportando, setExportando] = useState(false);

  const puedeEditar = rol === 'admin' || rol === 'it';
  const puedeExportar = rol === 'admin' || rol === 'observador';
  const mostrarColEdificio = esGlobal && edificioSel == null;

  const cargar = () => {
    setLoading(true);
    getGastos({ mes }).then(g => { setGastos(g); setLoading(false); });
  };

  useEffect(() => { cargar(); }, [refresh, mes]);

  const handleDelete = async () => {
    await deleteGasto(confirmDelete.id);
    setGastos(prev => prev.filter(g => g.id !== confirmDelete.id));
    setConfirmDelete(null);
  };

  const handleExportar = async () => {
    setExportando(true);
    try {
      const blob = await exportarGastos({ mes });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gastos_${mes}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      showToast?.('Excel exportado correctamente');
    } catch {
      showToast?.('Error al exportar', 'error');
    } finally {
      setExportando(false);
    }
  };

  const total = gastos.reduce((s, g) => s + parseFloat(g.monto), 0);
  const porEdificio = mostrarColEdificio
    ? Object.entries(gastos.reduce((acc, g) => {
        acc[g.edificio_nombre] = (acc[g.edificio_nombre] || 0) + parseFloat(g.monto);
        return acc;
      }, {})).sort((a, b) => a[0].localeCompare(b[0], 'es'))
    : [];

  return (
    <div className="gastos-page">
      <div className="gastos-header">
        <div>
          <h2 className="gastos-title">Gastos</h2>
          <p className="gastos-sub">Compras y suscripciones mensuales de IT</p>
        </div>
        <div className="gastos-header-acciones">
          <input type="month" className="form-input" value={mes} onChange={e => setMes(e.target.value)} />
          {puedeExportar && (
            <button className="btn btn-secondary" onClick={handleExportar} disabled={exportando}>
              <Download size={14} /> {exportando ? 'Exportando...' : 'Exportar Excel'}
            </button>
          )}
          {puedeEditar && (
            <button className="btn btn-primary" onClick={() => setModal({ mode: 'create', data: { ...FORM_VACIO, edificio_id: edificioSel ?? '' } })}>
              <PlusCircle size={14} /> Nuevo gasto
            </button>
          )}
        </div>
      </div>

      <div className="gastos-totales">
        <div className="stat-card card gastos-total-card">
          <span className="stat-num gastos-total-num"><Wallet size={20} /> {fmtMonto(total)}</span>
          <span className="stat-label">Total del mes</span>
        </div>
        {porEdificio.map(([nombre, monto]) => (
          <div key={nombre} className="stat-card card">
            <span className="stat-num">{fmtMonto(monto)}</span>
            <span className="stat-label">{nombre}</span>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="skeleton-bar" style={{ height: 200, borderRadius: 12 }} />
      ) : gastos.length === 0 ? (
        <div className="table-empty">
          <Wallet size={28} />
          <p>No hay gastos registrados para este mes.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="equip-table">
            <thead>
              <tr>
                {mostrarColEdificio && <th>Edificio</th>}
                <th>Fecha</th>
                <th>Concepto</th>
                <th>Proveedor</th>
                <th>Cant.</th>
                <th>Monto</th>
                <th>Periodicidad</th>
                <th>Estado</th>
                {puedeEditar && <th></th>}
              </tr>
            </thead>
            <tbody>
              {gastos.map(g => {
                const meta = ESTADO_META[g.estado];
                return (
                  <tr key={g.id} className="equip-row">
                    {mostrarColEdificio && <td>{g.edificio_nombre}</td>}
                    <td>{fmtFecha(g.fecha)}</td>
                    <td className="model-cell">{g.concepto}</td>
                    <td className="text-muted">{g.proveedor || '—'}</td>
                    <td>{g.cantidad ?? '—'}</td>
                    <td className="mono">{fmtMonto(g.monto)}</td>
                    <td className="text-muted small">{PERIODICIDAD_LABEL[g.periodicidad]}</td>
                    <td>{meta && <span className={`badge ${meta.badge}`}>{meta.label}</span>}</td>
                    {puedeEditar && (
                      <td className="actions-cell">
                        <button className="btn btn-ghost btn-sm" title="Editar"
                          onClick={() => setModal({ mode: 'edit', data: { ...g, fecha: String(g.fecha).slice(0, 10), cantidad: g.cantidad ?? '' } })}>
                          <Pencil size={13} />
                        </button>
                        {rol === 'admin' && (
                          <button className="btn btn-ghost btn-sm danger-btn" title="Eliminar" onClick={() => setConfirmDelete(g)}>
                            <Trash2 size={13} />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <GastoModal
          mode={modal.mode}
          data={modal.data}
          esGlobal={esGlobal}
          edificios={edificios}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); cargar(); }}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Eliminar gasto"
          message={`¿Estás seguro de que quieres eliminar "${confirmDelete.concepto}"?`}
          confirmLabel="Eliminar"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

function GastoModal({ mode, data, esGlobal, edificios, onClose, onSaved }) {
  const [form, setForm] = useState(data);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isEdit = mode === 'edit';

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.fecha || !form.concepto.trim()) { setError('Completa la fecha y el concepto.'); return; }
    if (esGlobal && !isEdit && !form.edificio_id) { setError('Elige un edificio.'); return; }
    setSaving(true);
    setError('');
    try {
      if (isEdit) await updateGasto(form.id, form);
      else await createGasto(form);
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
          <h2>{isEdit ? 'Editar gasto' : 'Nuevo gasto'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        <form className="modal-body" onSubmit={handleSubmit}>
          <section className="form-section">
            <div className="form-grid">

              {esGlobal && !isEdit && (
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
                <input type="date" className="form-input" value={form.fecha} onChange={e => set('fecha', e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Monto (USD)</label>
                <input type="number" min="0" step="0.01" className="form-input" value={form.monto} onChange={e => set('monto', e.target.value)} placeholder="0.00" />
              </div>

              <div className="form-group full-width">
                <label className="form-label">Concepto</label>
                <input className="form-input" value={form.concepto} onChange={e => set('concepto', e.target.value)} placeholder="Ej: Recarga OnlineSIM.io" />
              </div>

              <div className="form-group">
                <label className="form-label">Proveedor (opcional)</label>
                <input className="form-input" value={form.proveedor} onChange={e => set('proveedor', e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Cantidad (opcional)</label>
                <input type="number" min="1" className="form-input" value={form.cantidad} onChange={e => set('cantidad', e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">Periodicidad</label>
                <select className="form-input" value={form.periodicidad} onChange={e => set('periodicidad', e.target.value)}>
                  {PERIODICIDADES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Estado</label>
                <select className="form-input" value={form.estado} onChange={e => set('estado', e.target.value)}>
                  {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                </select>
              </div>

            </div>
          </section>

          {error && <div className="form-error">{error}</div>}

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear gasto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

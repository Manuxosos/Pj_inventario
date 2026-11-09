import { useState, useEffect } from 'react';
import {
  getGastos, createGasto, updateGasto, deleteGasto, exportarGastos,
  getGastosResumenMensual, getGastosPendientes,
} from '../api';
import {
  PlusCircle, Pencil, Trash2, Copy, Download, Wallet, History, AlertTriangle,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
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

const CATEGORIAS = [
  { value: 'internet',      label: 'Internet y telefonía' },
  { value: 'software',      label: 'Software' },
  { value: 'hardware',      label: 'Hardware' },
  { value: 'accesorios',    label: 'Accesorios' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'otro',          label: 'Otro' },
];
const CATEGORIA_LABEL = Object.fromEntries(CATEGORIAS.map(c => [c.value, c.label]));

const MES_CORTO = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
function fmtMesCorto(mesIso) {
  const [, m] = mesIso.split('-');
  return MES_CORTO[parseInt(m, 10) - 1] || mesIso;
}

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="tooltip-label">{label}</p>
      <p><strong>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(payload[0].value)}</strong></p>
    </div>
  );
};

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
  periodicidad: 'unico', estado: 'activo', categoria: 'otro', edificio_id: '',
};

export default function Gastos({ rol, esGlobal, edificioSel, edificios, refresh, showToast }) {
  const [gastos, setGastos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mes, setMes] = useState(mesActual());
  const [verTodos, setVerTodos] = useState(false);
  const [modal, setModal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [exportando, setExportando] = useState(false);
  const [resumenMensual, setResumenMensual] = useState([]);
  const [pendientes, setPendientes] = useState([]);

  const puedeEditar = rol === 'admin' || rol === 'it';
  const puedeExportar = rol === 'admin' || rol === 'observador';
  const mostrarColEdificio = esGlobal && edificioSel == null;

  const cargar = () => {
    setLoading(true);
    getGastos(verTodos ? {} : { mes }).then(g => { setGastos(g); setLoading(false); });
  };

  const cargarExtras = () => {
    getGastosResumenMensual().then(setResumenMensual);
    if (puedeEditar) getGastosPendientes().then(setPendientes);
  };

  useEffect(() => { cargar(); }, [refresh, mes, verTodos]);
  useEffect(() => { cargarExtras(); }, [refresh, edificioSel]);

  const handleDelete = async () => {
    await deleteGasto(confirmDelete.id);
    setGastos(prev => prev.filter(g => g.id !== confirmDelete.id));
    setConfirmDelete(null);
    cargarExtras();
  };

  const handleExportar = async () => {
    setExportando(true);
    try {
      const blob = await exportarGastos(verTodos ? {} : { mes });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = verTodos ? 'gastos_historial.xlsx' : `gastos_${mes}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      showToast?.('Excel exportado correctamente');
    } catch {
      showToast?.('Error al exportar', 'error');
    } finally {
      setExportando(false);
    }
  };

  const handleDuplicar = g => {
    setModal({
      mode: 'create',
      data: {
        ...FORM_VACIO,
        concepto: g.concepto, proveedor: g.proveedor || '', cantidad: g.cantidad ?? '',
        monto: g.monto, periodicidad: g.periodicidad, estado: g.estado, categoria: g.categoria || 'otro',
        edificio_id: g.edificio_id ?? edificioSel ?? '',
      },
    });
  };

  const handleCargarPendiente = p => {
    setModal({
      mode: 'create',
      data: {
        ...FORM_VACIO,
        concepto: p.concepto, proveedor: p.proveedor || '', monto: p.monto,
        periodicidad: 'mensual', categoria: p.categoria || 'otro',
        edificio_id: p.edificio_id ?? edificioSel ?? '',
      },
    });
  };

  const chartData = resumenMensual.map(r => ({ mes: fmtMesCorto(r.mes), mesIso: r.mes, total: r.total }));

  const handleClickMes = data => {
    if (!data?.mesIso) return;
    setVerTodos(false);
    setMes(data.mesIso);
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
          <input
            type="month"
            className="form-input"
            value={mes}
            onChange={e => setMes(e.target.value)}
            onClick={e => { try { e.target.showPicker?.(); } catch { /* no soportado en este navegador */ } }}
            disabled={verTodos}
          />
          <button
            type="button"
            className={`btn btn-secondary gastos-historial-btn${verTodos ? ' active' : ''}`}
            onClick={() => setVerTodos(v => !v)}
            title="Ver gastos de todos los meses"
          >
            <History size={14} /> {verTodos ? 'Viendo todo el historial' : 'Ver todo el historial'}
          </button>
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

      {pendientes.length > 0 && (
        <div className="gastos-pendientes-banner">
          <div className="gastos-pendientes-titulo">
            <AlertTriangle size={16} />
            Gastos recurrentes sin cargar este mes ({pendientes.length})
          </div>
          <ul className="gastos-pendientes-lista">
            {pendientes.map(p => (
              <li key={`${p.edificio_id}-${p.concepto}`}>
                <span>
                  {mostrarColEdificio && <strong>{p.edificio_nombre}: </strong>}
                  {p.concepto}
                  {p.proveedor && <span className="text-muted"> · {p.proveedor}</span>}
                </span>
                <button className="btn btn-ghost btn-sm" onClick={() => handleCargarPendiente(p)}>
                  Cargar ahora
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="gastos-totales">
        <div className="stat-card card gastos-total-card">
          <span className="stat-num gastos-total-num"><Wallet size={20} /> {fmtMonto(total)}</span>
          <span className="stat-label">{verTodos ? 'Total general' : 'Total del mes'}</span>
        </div>
        {porEdificio.map(([nombre, monto]) => (
          <div key={nombre} className="stat-card card">
            <span className="stat-num">{fmtMonto(monto)}</span>
            <span className="stat-label">{nombre}</span>
          </div>
        ))}
      </div>

      {chartData.length > 1 && (
        <div className="card gastos-chart-card">
          <p className="gastos-chart-titulo">Evolución mensual (últimos 12 meses) — click en una barra para ver ese mes</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 4, right: 10, left: -20, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,229,255,0.06)" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#3a6a88' }} axisLine={{ stroke: 'rgba(0,229,255,0.12)' }} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#3a6a88' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,229,255,0.08)' }} />
              <Bar dataKey="total" name="Total" radius={[4, 4, 0, 0]} maxBarSize={40} cursor="pointer" onClick={handleClickMes}>
                {chartData.map(d => (
                  <Cell key={d.mesIso} fill={!verTodos && d.mesIso === mes ? '#00ff9d' : '#00e5ff'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {loading ? (
        <div className="skeleton-bar" style={{ height: 200, borderRadius: 12 }} />
      ) : gastos.length === 0 ? (
        <div className="table-empty">
          <Wallet size={28} />
          <p>{verTodos ? 'No hay gastos registrados.' : 'No hay gastos registrados para este mes.'}</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="equip-table">
            <thead>
              <tr>
                {mostrarColEdificio && <th>Edificio</th>}
                <th>Fecha</th>
                <th>Categoría</th>
                <th>Concepto</th>
                <th>Proveedor</th>
                <th>Cant.</th>
                <th>Monto</th>
                <th>Periodicidad</th>
                <th>Estado</th>
                <th>Cargado por</th>
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
                    <td className="text-muted small">{CATEGORIA_LABEL[g.categoria] || '—'}</td>
                    <td className="model-cell">{g.concepto}</td>
                    <td className="text-muted">{g.proveedor || '—'}</td>
                    <td>{g.cantidad ?? '—'}</td>
                    <td className="mono">{fmtMonto(g.monto)}</td>
                    <td className="text-muted small">{PERIODICIDAD_LABEL[g.periodicidad]}</td>
                    <td>{meta && <span className={`badge ${meta.badge}`}>{meta.label}</span>}</td>
                    <td className="text-muted small">{g.usuario_nombre || '—'}</td>
                    {puedeEditar && (
                      <td className="actions-cell">
                        <button className="btn btn-ghost btn-sm" title="Editar"
                          onClick={() => setModal({ mode: 'edit', data: { ...g, fecha: String(g.fecha).slice(0, 10), cantidad: g.cantidad ?? '' } })}>
                          <Pencil size={13} />
                        </button>
                        <button className="btn btn-ghost btn-sm" title="Duplicar" onClick={() => handleDuplicar(g)}>
                          <Copy size={13} />
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
          onSaved={() => { setModal(null); cargar(); cargarExtras(); }}
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
                <input
                  type="date"
                  className="form-input"
                  value={form.fecha}
                  onChange={e => set('fecha', e.target.value)}
                  onClick={e => { try { e.target.showPicker?.(); } catch { /* no soportado en este navegador */ } }}
                />
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
                <label className="form-label">Categoría</label>
                <select className="form-input" value={form.categoria} onChange={e => set('categoria', e.target.value)}>
                  {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
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

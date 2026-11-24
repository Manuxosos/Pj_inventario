import { useState, useEffect } from 'react';
import { getBajas, deleteBaja, exportarBajas, getBajasResumenMensual } from '../api';
import { PlusCircle, Trash2, Download, Ban, History } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import BajaModal, { BAJA_CATEGORIA_LABEL } from './BajaModal';
import ConfirmModal from './ConfirmModal';
import './Bajas.css';

function mesActual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function fmtFecha(iso) {
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

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
      <p><strong>{payload[0].value} {payload[0].value === 1 ? 'unidad' : 'unidades'}</strong></p>
    </div>
  );
};

export default function Bajas({ rol, esGlobal, edificioSel, edificios, refresh, showToast }) {
  const [bajas, setBajas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mes, setMes] = useState(mesActual());
  const [verTodos, setVerTodos] = useState(false);
  const [modal, setModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [exportando, setExportando] = useState(false);
  const [resumenMensual, setResumenMensual] = useState([]);

  const puedeEditar = rol === 'admin' || rol === 'it';
  const puedeExportar = rol === 'admin' || rol === 'observador';
  const mostrarColEdificio = esGlobal && edificioSel == null;

  const cargar = () => {
    setLoading(true);
    getBajas(verTodos ? {} : { mes }).then(b => { setBajas(b); setLoading(false); });
  };

  useEffect(() => { cargar(); }, [refresh, mes, verTodos]);
  useEffect(() => { getBajasResumenMensual().then(setResumenMensual); }, [refresh, edificioSel]);

  const handleDelete = async () => {
    const r = await deleteBaja(confirmDelete.id);
    setBajas(prev => prev.filter(b => b.id !== confirmDelete.id));
    setConfirmDelete(null);
    getBajasResumenMensual().then(setResumenMensual);
    if (r.equipoRestaurado) showToast?.('Baja eliminada: el equipo vuelve al inventario activo');
  };

  const handleExportar = async () => {
    setExportando(true);
    try {
      const blob = await exportarBajas(verTodos ? {} : { mes });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = verTodos ? 'bajas_historial.xlsx' : `bajas_${mes}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      showToast?.('Excel exportado correctamente');
    } catch {
      showToast?.('Error al exportar', 'error');
    } finally {
      setExportando(false);
    }
  };

  const chartData = resumenMensual.map(r => ({ mes: fmtMesCorto(r.mes), mesIso: r.mes, total: r.total }));
  const handleClickMes = data => {
    if (!data?.mesIso) return;
    setVerTodos(false);
    setMes(data.mesIso);
  };

  const total = bajas.reduce((s, b) => s + parseInt(b.cantidad), 0);
  const porEdificio = mostrarColEdificio
    ? Object.entries(bajas.reduce((acc, b) => {
        acc[b.edificio_nombre] = (acc[b.edificio_nombre] || 0) + parseInt(b.cantidad);
        return acc;
      }, {})).sort((a, b) => a[0].localeCompare(b[0], 'es'))
    : [];
  const porCategoria = Object.entries(bajas.reduce((acc, b) => {
    acc[b.categoria] = (acc[b.categoria] || 0) + parseInt(b.cantidad);
    return acc;
  }, {})).sort((a, b) => b[1] - a[1]);

  return (
    <div className="bajas-page">
      <div className="bajas-header">
        <div>
          <h2 className="bajas-title">Bajas</h2>
          <p className="bajas-sub">Equipos y accesorios dañados sin opción de reparación</p>
        </div>
        <div className="bajas-header-acciones">
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
            className={`btn btn-secondary bajas-historial-btn${verTodos ? ' active' : ''}`}
            onClick={() => setVerTodos(v => !v)}
            title="Ver bajas de todos los meses"
          >
            <History size={14} /> {verTodos ? 'Viendo todo el historial' : 'Ver todo el historial'}
          </button>
          {puedeExportar && (
            <button className="btn btn-secondary" onClick={handleExportar} disabled={exportando}>
              <Download size={14} /> {exportando ? 'Exportando...' : 'Exportar Excel'}
            </button>
          )}
          {puedeEditar && (
            <button className="btn btn-primary" onClick={() => setModal(true)}>
              <PlusCircle size={14} /> Registrar baja
            </button>
          )}
        </div>
      </div>

      <div className="bajas-totales">
        <div className="stat-card card bajas-total-card">
          <span className="stat-num bajas-total-num"><Ban size={20} /> {total}</span>
          <span className="stat-label">{verTodos ? 'Total general' : 'Total del mes'}</span>
        </div>
        {porEdificio.map(([nombre, n]) => (
          <div key={nombre} className="stat-card card">
            <span className="stat-num">{n}</span>
            <span className="stat-label">{nombre}</span>
          </div>
        ))}
        {porCategoria.map(([cat, n]) => (
          <div key={cat} className="stat-card card bajas-categoria-card">
            <span className="stat-num">{n}</span>
            <span className="stat-label">{BAJA_CATEGORIA_LABEL[cat] || cat}</span>
          </div>
        ))}
      </div>

      {chartData.length > 1 && (
        <div className="card bajas-chart-card">
          <p className="bajas-chart-titulo">Evolución mensual (últimos 12 meses) — click en una barra para ver ese mes</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 4, right: 10, left: -20, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,229,255,0.06)" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#3a6a88' }} axisLine={{ stroke: 'rgba(0,229,255,0.12)' }} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#3a6a88' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,90,90,0.08)' }} />
              <Bar dataKey="total" name="Total" radius={[4, 4, 0, 0]} maxBarSize={40} cursor="pointer" onClick={handleClickMes}>
                {chartData.map(d => (
                  <Cell key={d.mesIso} fill={!verTodos && d.mesIso === mes ? '#00ff9d' : '#ff5a5a'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {loading ? (
        <div className="skeleton-bar" style={{ height: 200, borderRadius: 12 }} />
      ) : bajas.length === 0 ? (
        <div className="table-empty">
          <Ban size={28} />
          <p>{verTodos ? 'No hay bajas registradas.' : 'No hay bajas registradas para este mes.'}</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="equip-table">
            <thead>
              <tr>
                {mostrarColEdificio && <th>Edificio</th>}
                <th>Fecha</th>
                <th>Categoría</th>
                <th>Descripción</th>
                <th>Nº Serie</th>
                <th>Cant.</th>
                <th>Motivo</th>
                <th>Cargado por</th>
                {rol === 'admin' && <th></th>}
              </tr>
            </thead>
            <tbody>
              {bajas.map(b => (
                <tr key={b.id} className="equip-row">
                  {mostrarColEdificio && <td>{b.edificio_nombre}</td>}
                  <td>{fmtFecha(b.fecha)}</td>
                  <td className="text-muted small">{BAJA_CATEGORIA_LABEL[b.categoria] || b.categoria}</td>
                  <td className="model-cell">{b.descripcion}</td>
                  <td className="mono text-muted small">{b.numero_serie || '—'}</td>
                  <td>{b.cantidad}</td>
                  <td className="text-muted small">{b.motivo || '—'}</td>
                  <td className="text-muted small">{b.usuario_nombre || '—'}</td>
                  {rol === 'admin' && (
                    <td className="actions-cell">
                      <button className="btn btn-ghost btn-sm danger-btn" title="Eliminar" onClick={() => setConfirmDelete(b)}>
                        <Trash2 size={13} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <BajaModal
          esGlobal={esGlobal}
          edificioSel={edificioSel}
          edificios={edificios}
          onClose={() => setModal(false)}
          onSaved={() => { setModal(false); cargar(); getBajasResumenMensual().then(setResumenMensual); }}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Eliminar baja"
          message={`¿Estás seguro de que quieres eliminar este registro? ${confirmDelete.equipo_id ? 'El equipo vinculado volverá al inventario activo.' : ''}`}
          confirmLabel="Eliminar"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { getEquipos } from '../api';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { Laptop, Users, Package, Warehouse, AlertCircle } from 'lucide-react';
import './Dashboard.css';

const ESTADO_COLORS = {
  'En uso agente': '#06b6d4',
  'En uso TI':     '#f0a500',
  'LISTA':         '#10b981',
  'NO LISTA':      '#f43f5e',
  'REVISION':      '#f59e0b',
  'NUEVO':         '#8b5cf6',
};

const PALETTE = ['#06b6d4','#f0a500','#10b981','#8b5cf6','#f43f5e','#0891b2','#059669'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      {label && <p className="tooltip-label">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEquipos().then(d => { setTodos(d); setLoading(false); });
  }, []);

  if (loading) return <div className="dash-loading">Cargando dashboard...</div>;

  const count = (fn) => todos.filter(fn).length;

  const enUso   = count(e => e.estado === 'En uso agente' || e.estado === 'En uso TI');
  const lista   = count(e => e.estado === 'LISTA');
  const nuevo   = count(e => e.estado === 'NUEVO');
  const noLista = count(e => e.estado === 'NO LISTA');
  const revision= count(e => e.estado === 'REVISION');

  // Gráfica estados — sin redundancia: solo legend + tooltip
  const byEstado = Object.entries(
    todos.reduce((acc, e) => { const k = e.estado || 'Sin estado'; acc[k] = (acc[k]||0)+1; return acc; }, {})
  ).map(([name, value]) => ({ name, value }));

  // Gráfica pisos
  const byPiso = Object.entries(
    todos.reduce((acc, e) => { const k = e.piso || 'Sin piso'; acc[k] = (acc[k]||0)+1; return acc; }, {})
  ).map(([piso, total]) => ({ piso, total })).sort((a,b) => b.total - a.total);

  // Gráfica modelos top 5
  const byModelo = Object.entries(
    todos.reduce((acc, e) => { const k = e.marca_modelo || 'Sin modelo'; acc[k] = (acc[k]||0)+1; return acc; }, {})
  ).map(([modelo, total]) => ({ modelo, total })).sort((a,b) => b.total-a.total).slice(0,5);

  // Gráfica RAM — donut (normalizar "8 GB" y "8GB" como lo mismo)
  const normalizeRam = (r) => r ? r.replace(/\s+/g, '').toUpperCase() : 'N/A';
  const byRam = Object.entries(
    todos.reduce((acc, e) => { const k = normalizeRam(e.ram); acc[k] = (acc[k]||0)+1; return acc; }, {})
  ).map(([name, value]) => ({ name, value })).sort((a,b) => b.value-a.value);

  // Accesorios — stacked
  const accesorios = [
    { nombre: 'Cargador',  si: count(e => e.cargador === 'Si') },
    { nombre: 'Mouse',     si: count(e => e.mouse === 'Si' || e.mouse === 'Si 2') },
    { nombre: 'Audífonos', si: count(e => e.audifonos === 'Si') },
    { nombre: 'Monitor',   si: count(e => e.monitor === 'Si') },
    { nombre: 'Estuche',   si: count(e => e.estuche === 'Si') },
    { nombre: 'Adaptador', si: count(e => e.adaptador_tplink === 'Si') },
  ].map(a => ({ ...a, no: todos.length - a.si }));

  return (
    <div className="dashboard">

      {/* KPIs */}
      <div className="kpi-row">
        <KpiCard value={todos.length} label="Total Equipos"     color="blue"   icon={<Laptop size={22}/>} />
        <KpiCard value={enUso}        label="En Uso"            color="indigo" icon={<Users size={22}/>} />
        <KpiCard value={lista}        label="Disponibles"       color="green"  icon={<Package size={22}/>} />
        <KpiCard value={nuevo}        label="Nuevos en Caja"    color="purple" icon={<Warehouse size={22}/>} />
        <KpiCard value={noLista+revision} label="Revisión / No Lista" color="slate" icon={<AlertCircle size={22}/>} />
      </div>

      {/* Fila 1 */}
      <div className="dash-row-2">
        <div className="dash-card card">
          <h3 className="dash-card-title">Estado de equipos</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={byEstado} dataKey="value" nameKey="name" cx="50%" cy="50%"
                outerRadius={95} innerRadius={45} paddingAngle={2}>
                {byEstado.map((e,i) => <Cell key={i} fill={ESTADO_COLORS[e.name] || '#94a3b8'} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={10} formatter={(v) => <span className="legend-label">{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="dash-card card">
          <h3 className="dash-card-title">Equipos por piso</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byPiso} margin={{ top: 4, right: 16, left: -10, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="piso" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--table-hover)' }} />
              <Bar dataKey="total" name="Equipos" radius={[4,4,0,0]}>
                {byPiso.map((_,i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="dash-card card">
          <h3 className="dash-card-title">RAM</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={byRam} dataKey="value" nameKey="name" cx="50%" cy="50%"
                outerRadius={95} innerRadius={45} paddingAngle={2}>
                {byRam.map((_,i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={10} formatter={(v) => <span className="legend-label">{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Fila 2 */}
      <div className="dash-row-2">
        <div className="dash-card card" style={{ gridColumn: 'span 2' }}>
          <h3 className="dash-card-title">Modelos más frecuentes</h3>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={byModelo} layout="vertical" margin={{ top: 4, right: 24, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <YAxis dataKey="modelo" type="category" width={180} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--table-hover)' }} />
              <Bar dataKey="total" name="Equipos" fill="#2563eb" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="dash-card card">
          <h3 className="dash-card-title">Cobertura de accesorios</h3>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={accesorios} margin={{ top: 4, right: 16, left: -10, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="nombre" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--table-hover)' }} />
              <Legend iconType="circle" iconSize={10} formatter={(v) => <span className="legend-label">{v}</span>} />
              <Bar dataKey="si"  name="Con accesorio" fill="#22c55e" radius={[4,4,0,0]} stackId="a" />
              <Bar dataKey="no"  name="Sin accesorio" fill="var(--border)" radius={[4,4,0,0]} stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}

function KpiCard({ value, label, color, icon }) {
  return (
    <div className={`kpi-card kpi-${color}`}>
      <div className="kpi-icon">{icon}</div>
      <span className="kpi-num">{value}</span>
      <span className="kpi-label">{label}</span>
    </div>
  );
}

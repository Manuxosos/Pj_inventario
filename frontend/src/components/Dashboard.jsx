import { useState, useEffect } from 'react';
import { getEquipos } from '../api';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { Laptop, Users, Package, Warehouse, AlertCircle } from 'lucide-react';
import './Dashboard.css';

// Paleta neon equilibrada — colores separados en el espectro
const C = {
  cyan:   '#00e5ff',
  green:  '#00e676',
  amber:  '#ffca28',
  purple: '#ce93d8',
  pink:   '#f48fb1',
  blue:   '#82b1ff',
  orange: '#ffab40',
};

const ESTADO_COLORS = {
  'En uso agente': C.cyan,
  'En uso TI':     C.blue,
  'LISTA':         C.green,
  'NO LISTA':      C.pink,
  'REVISION':      C.amber,
  'NUEVO':         C.purple,
  'Sin estado':    '#334155',
};

// Colores para barras/pie que no choquen entre sí
const CHART_COLORS = [C.cyan, C.green, C.amber, C.purple, C.pink, C.blue, C.orange];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      {label && <p className="tooltip-label">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.fill || p.color }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

const CustomLegend = ({ payload }) => (
  <ul className="custom-legend">
    {payload.map((entry, i) => (
      <li key={i} className="legend-item">
        <span className="legend-dot" style={{ background: entry.color, boxShadow: `0 0 6px ${entry.color}` }} />
        <span className="legend-text">{entry.value}</span>
      </li>
    ))}
  </ul>
);

export default function Dashboard() {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEquipos().then(d => { setTodos(d); setLoading(false); });
  }, []);

  if (loading) return <div className="dash-loading">Cargando dashboard...</div>;

  const count = fn => todos.filter(fn).length;

  const enUso    = count(e => e.estado === 'En uso agente' || e.estado === 'En uso TI');
  const lista    = count(e => e.estado === 'LISTA');
  const nuevo    = count(e => e.estado === 'NUEVO');
  const revision = count(e => e.estado === 'NO LISTA' || e.estado === 'REVISION');

  // Estados — agrupar vacíos como "Sin estado"
  const byEstado = Object.entries(
    todos.reduce((acc, e) => {
      const k = e.estado || 'Sin estado';
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }))
   .sort((a, b) => b.value - a.value);

  // Pisos — ordenados de mayor a menor
  const byPiso = Object.entries(
    todos.reduce((acc, e) => { acc[e.piso || 'Sin piso'] = (acc[e.piso || 'Sin piso'] || 0) + 1; return acc; }, {})
  ).map(([piso, total]) => ({ piso, total }))
   .sort((a, b) => b.total - a.total);

  // Modelos — top 6
  const byModelo = Object.entries(
    todos.reduce((acc, e) => {
      if (!e.marca_modelo) return acc;
      acc[e.marca_modelo] = (acc[e.marca_modelo] || 0) + 1;
      return acc;
    }, {})
  ).map(([modelo, total]) => ({ modelo, total }))
   .sort((a, b) => b.total - a.total)
   .slice(0, 6);

  // RAM
  const byRam = Object.entries(
    todos.reduce((acc, e) => {
      const k = e.ram || 'Sin datos';
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }))
   .filter(r => r.name !== 'Sin datos')
   .sort((a, b) => b.value - a.value);

  // Accesorios — solo los que tienen datos reales
  const accesorios = [
    { nombre: 'Cargador',  si: count(e => e.cargador === 'Si') },
    { nombre: 'Mouse',     si: count(e => e.mouse === 'Si' || e.mouse === 'Si 2') },
    { nombre: 'Audífonos', si: count(e => e.audifonos === 'Si') },
  ].map(a => ({ ...a, no: todos.length - a.si }));

  return (
    <div className="dashboard">

      {/* KPIs */}
      <div className="kpi-row">
        <KpiCard value={todos.length} label="Total Equipos"      color="cyan"   icon={<Laptop size={20}/>} />
        <KpiCard value={enUso}        label="En Uso"             color="amber"  icon={<Users size={20}/>} />
        <KpiCard value={lista}        label="Disponibles"        color="green"  icon={<Package size={20}/>} />
        <KpiCard value={nuevo}        label="Nuevos en Caja"     color="purple" icon={<Warehouse size={20}/>} />
        <KpiCard value={revision}     label="Revisión / No Lista" color="pink"  icon={<AlertCircle size={20}/>} />
      </div>

      {/* Fila 1: Estado + Piso + RAM */}
      <div className="dash-row-3">

        <div className="dash-card card">
          <h3 className="dash-card-title">Estado de equipos</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={byEstado} dataKey="value" nameKey="name"
                cx="50%" cy="45%" outerRadius={85} innerRadius={42} paddingAngle={3}>
                {byEstado.map((e, i) => (
                  <Cell key={i} fill={ESTADO_COLORS[e.name] || '#334155'}
                    stroke="transparent" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="dash-card card">
          <h3 className="dash-card-title">Equipos por piso</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={byPiso} margin={{ top: 4, right: 10, left: -20, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,229,255,0.06)" vertical={false} />
              <XAxis dataKey="piso" tick={{ fontSize: 11, fill: '#3a6a88' }}
                axisLine={{ stroke: 'rgba(0,229,255,0.1)' }} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#3a6a88' }}
                axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,229,255,0.04)' }} />
              <Bar dataKey="total" name="Equipos" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {byPiso.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]}
                    style={{ filter: `drop-shadow(0 0 4px ${CHART_COLORS[i % CHART_COLORS.length]}66)` }} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="dash-card card">
          <h3 className="dash-card-title">RAM</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={byRam} dataKey="value" nameKey="name"
                cx="50%" cy="45%" outerRadius={85} innerRadius={42} paddingAngle={3}>
                {byRam.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i]}
                    stroke="transparent" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* Fila 2: Modelos + Accesorios */}
      <div className="dash-row-2col">

        <div className="dash-card card">
          <h3 className="dash-card-title">Modelos de equipos</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byModelo} layout="vertical"
              margin={{ top: 4, right: 30, left: 10, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,229,255,0.06)" horizontal={false} />
              <XAxis type="number" allowDecimals={false}
                tick={{ fontSize: 11, fill: '#3a6a88' }} axisLine={false} tickLine={false} />
              <YAxis dataKey="modelo" type="category" width={155}
                tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,229,255,0.04)' }} />
              <Bar dataKey="total" name="Equipos" radius={[0, 4, 4, 0]} maxBarSize={20}
                fill={C.cyan}
                style={{ filter: 'drop-shadow(0 0 4px rgba(0,229,255,0.4))' }} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="dash-card card">
          <h3 className="dash-card-title">Accesorios asignados</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={accesorios} margin={{ top: 4, right: 20, left: -20, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,229,255,0.06)" vertical={false} />
              <XAxis dataKey="nombre" tick={{ fontSize: 12, fill: '#94a3b8' }}
                axisLine={{ stroke: 'rgba(0,229,255,0.1)' }} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#3a6a88' }}
                axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,229,255,0.04)' }} />
              <Legend content={<CustomLegend />} />
              <Bar dataKey="si" name="Con accesorio" fill={C.green} radius={[4,4,0,0]}
                stackId="a" style={{ filter: 'drop-shadow(0 0 4px rgba(0,230,118,0.35))' }} />
              <Bar dataKey="no" name="Sin accesorio" fill="#0e2240" radius={[4,4,0,0]}
                stackId="a" />
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

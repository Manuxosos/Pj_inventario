import { useState, useEffect, useMemo } from 'react';
import { getEquipos, getHistorial } from '../api';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { Laptop, Users, Package, AlertCircle } from 'lucide-react';
import PisoAgentesModal from './PisoAgentesModal';
import './Dashboard.css';

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
  'En uso':      C.cyan,
  'Disponible':  C.green,
  'En revisión': C.amber,
  'De baja':     C.pink,
  'Sin estado':  '#334155',
};

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

const CAMPO_LABEL = {
  id_activo:'ID Activo', cargador:'Cargador', id_ex:'ID EX', team:'Agente',
  marca_modelo:'Marca / Modelo', procesador:'Procesador', ram:'RAM',
  disco_duro:'Disco Duro', so:'Sistema Operativo', numero_serie:'Nº Serie',
  usuario:'Usuario asignado', estado:'Estado', observacion:'Observación',
  responsable:'Responsable', audifonos:'Audífonos', mouse:'Mouse',
  monitor:'Monitor', adaptador_tplink:'Adaptador Tp-Link', estuche:'Estuche',
  piso:'Piso', creacion:'Creación',
};

function fmtDate(iso) {
  return new Date(iso).toLocaleString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// Normaliza RAM: elimina todos los espacios y pone en mayúsculas
// "8 GB" y "8GB" y "8gb" → "8GB"
function normRam(raw) {
  if (!raw) return '';
  return raw.trim().replace(/\s+/g, '').toUpperCase();
}

export default function Dashboard({ onNavigate, onOpenEquipo }) {
  const [todos,     setTodos]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [actividad, setActividad] = useState([]);
  const [pisoSeleccionado,   setPisoSeleccionado]   = useState(null);

  useEffect(() => {
    getEquipos().then(d => { setTodos(d); setLoading(false); });
    getHistorial(15).then(setActividad).catch(() => {});
  }, []);

  const agentesPiso = useMemo(() => {
    if (!pisoSeleccionado) return [];
    // normalizado (mayúsculas) -> nombre a mostrar (primera aparición), para no
    // duplicar al mismo agente por diferencias de mayúsculas/minúsculas
    const map = new Map();
    todos.forEach(e => {
      if (e.piso !== pisoSeleccionado) return;
      const raw = (e.responsable || '').trim();
      if (!raw) return;
      const key = raw.toUpperCase();
      if (!map.has(key)) map.set(key, raw);
    });
    return [...map.values()].sort((a, b) => a.localeCompare(b, 'es'));
  }, [pisoSeleccionado, todos]);

  if (loading) return <div className="dash-loading">Cargando dashboard...</div>;

  const count = fn => todos.filter(fn).length;

  const enUso    = count(e => e.estado === 'En uso');
  const lista    = count(e => e.estado === 'Disponible');
  const revision = count(e => e.estado === 'En revisión');

  // Estados
  const byEstado = Object.entries(
    todos.reduce((acc, e) => {
      const k = e.estado || 'Sin estado';
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }))
   .sort((a, b) => b.value - a.value);

  // Pisos
  const byPiso = Object.entries(
    todos.reduce((acc, e) => {
      const k = e.piso || 'Sin piso';
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {})
  ).map(([piso, total]) => ({ piso, total }))
   .sort((a, b) => b.total - a.total);

  // Modelos — top 8
  const byModelo = Object.entries(
    todos.reduce((acc, e) => {
      if (!e.marca_modelo) return acc;
      acc[e.marca_modelo] = (acc[e.marca_modelo] || 0) + 1;
      return acc;
    }, {})
  ).map(([modelo, total]) => ({ modelo, total }))
   .sort((a, b) => b.total - a.total)
   .slice(0, 8);

  // RAM — normalizada para evitar duplicados por espacios/capitalización
  const ramMap = {};
  for (const e of todos) {
    const k = normRam(e.ram);
    if (!k) continue;
    ramMap[k] = (ramMap[k] || 0) + 1;
  }
  const byRam = Object.entries(ramMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const nav = onNavigate || (() => {});

  return (
    <div className="dashboard">

      {/* KPIs */}
      <div className="kpi-row">
        <KpiCard value={todos.length} label="Total Equipos"       color="cyan"   icon={<Laptop size={20}/>}
          onClick={() => nav({})} />
        <KpiCard value={enUso}    label="En Uso"       color="amber"  icon={<Users size={20}/>}
          onClick={() => nav({ estado: 'En uso' })} />
        <KpiCard value={lista}    label="Disponibles"  color="green"  icon={<Package size={20}/>}
          onClick={() => nav({ estado: 'Disponible' })} />
        <KpiCard value={revision} label="En Revisión"  color="pink"   icon={<AlertCircle size={20}/>}
          onClick={() => nav({ estado: 'En revisión' })} />
      </div>

      {/* Fila 1: Estado + Piso + RAM */}
      <div className="dash-row-3">

        {/* Estado */}
        <div className="dash-card card">
          <h3 className="dash-card-title">Estado de equipos</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={byEstado} dataKey="value" nameKey="name"
                cx="50%" cy="45%" outerRadius={85} innerRadius={42} paddingAngle={3}
                onClick={(e) => e.name !== 'Sin estado' && nav({ estado: e.name })}
                style={{ cursor: 'pointer' }}>
                {byEstado.map((e, i) => (
                  <Cell key={i} fill={ESTADO_COLORS[e.name] || '#334155'} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Piso */}
        <div className="dash-card card">
          <h3 className="dash-card-title">Equipos por piso</h3>
          <p className="dash-card-hint">Click en una barra para ver los agentes de ese piso</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byPiso} margin={{ top: 4, right: 10, left: -20, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,229,255,0.06)" vertical={false} />
              <XAxis dataKey="piso" tick={{ fontSize: 11, fill: '#3a6a88' }}
                axisLine={{ stroke: 'rgba(0,229,255,0.1)' }} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#3a6a88' }}
                axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,229,255,0.08)' }} />
              <Bar dataKey="total" name="Equipos" radius={[4, 4, 0, 0]} maxBarSize={40}
                style={{ cursor: 'pointer' }}
                onClick={(data) => setPisoSeleccionado(data.piso)}>
                {byPiso.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]}
                    style={{ filter: `drop-shadow(0 0 4px ${CHART_COLORS[i % CHART_COLORS.length]}66)` }} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* RAM */}
        <div className="dash-card card">
          <h3 className="dash-card-title">RAM</h3>
          <p className="dash-card-hint">Click en un segmento para filtrar</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={byRam} dataKey="value" nameKey="name"
                cx="50%" cy="45%" outerRadius={85} innerRadius={42} paddingAngle={3}
                onClick={(e) => nav({ ram: e.name })}
                style={{ cursor: 'pointer' }}>
                {byRam.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* Fila 2: Modelos + Actividad reciente */}
      <div className="dash-row-modelos-act">

        {/* Modelos */}
        <div className="dash-card card">
          <h3 className="dash-card-title">Modelos de equipos</h3>
          <p className="dash-card-hint">Click en una barra para ver esos equipos en el inventario</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byModelo} layout="vertical"
              margin={{ top: 4, right: 30, left: 10, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,229,255,0.06)" horizontal={false} />
              <XAxis type="number" allowDecimals={false}
                tick={{ fontSize: 11, fill: '#3a6a88' }} axisLine={false} tickLine={false} />
              <YAxis dataKey="modelo" type="category" width={155}
                tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,229,255,0.04)' }} />
              <Bar dataKey="total" name="Equipos" radius={[0, 4, 4, 0]} maxBarSize={22}
                style={{ cursor: 'pointer' }}
                onClick={(data) => nav({ modelo: data.modelo })}>
                {byModelo.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]}
                    style={{ filter: `drop-shadow(0 0 4px ${CHART_COLORS[i % CHART_COLORS.length]}66)` }} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Actividad reciente */}
        <div className="dash-card card dash-actividad-card">
          <h3 className="dash-card-title">Actividad reciente</h3>
          {actividad.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: '12px 0' }}>Sin actividad registrada aún.</p>
          ) : (
            <div className="dash-feed">
              {actividad.map((h, i) => (
                <div key={h.id}
                  className={`dash-feed-item dash-feed-clickable ${i < actividad.length - 1 ? 'dash-feed-border' : ''}`}
                  onClick={() => onOpenEquipo?.(h.equipo_id)}>
                  <span className="dash-feed-dot" />
                  <div className="dash-feed-content">
                    <div className="dash-feed-top">
                      <span className="dash-feed-equipo">{h.equipo_modelo || `Equipo #${h.equipo_id}`}</span>
                      {h.equipo_serie && <span className="dash-feed-serie">NS: {h.equipo_serie}</span>}
                      {h.equipo_piso && <span className="dash-feed-piso">{h.equipo_piso}</span>}
                      <span className="dash-feed-time">{fmtDate(h.created_at)}</span>
                    </div>
                    {h.campo === 'creacion' ? (
                      <span style={{ fontSize: 12, color: 'var(--neon-green)' }}>{h.valor_nuevo}</span>
                    ) : (
                      <div className="dash-feed-cambio">
                        <span className="dash-feed-campo">{CAMPO_LABEL[h.campo] || h.campo}:</span>
                        <span className="dash-feed-ant">{h.valor_ant || '—'}</span>
                        <span style={{ color: 'var(--text-muted)' }}>→</span>
                        <span className="dash-feed-nuevo">{h.valor_nuevo || '—'}</span>
                      </div>
                    )}
                    {h.nota && <span className="dash-feed-nota">"{h.nota}"</span>}
                    <span className="dash-feed-usuario">por {h.usuario_nombre}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {pisoSeleccionado && (
        <PisoAgentesModal piso={pisoSeleccionado} agentes={agentesPiso} onClose={() => setPisoSeleccionado(null)} />
      )}

    </div>
  );
}

function KpiCard({ value, label, color, icon, onClick }) {
  return (
    <div className={`kpi-card kpi-${color}`} onClick={onClick} style={{ cursor: 'pointer' }}>
      <div className="kpi-icon">{icon}</div>
      <span className="kpi-num">{value}</span>
      <span className="kpi-label">{label}</span>
    </div>
  );
}

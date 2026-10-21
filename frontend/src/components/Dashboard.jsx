import { useState, useEffect, useMemo } from 'react';
import { getEquipos, getHistorial } from '../api';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { Laptop, Headphones, Monitor, Smartphone, ArrowRight } from 'lucide-react';
import PisoAgentesModal from './PisoAgentesModal';
import AccesorioCard from './AccesorioCard';
import { AUDIFONO_TIPOS } from '../accesorioConfig';
import { CAMPO_LABEL } from '../campoLabel';
import { metaEstado, grupoRam, ordenRam, coloresRam, CAMPO_ICON } from '../semantica';
import { EstadoBadge, GrupoChip } from './Etiquetas';
import './Dashboard.css';

// Gráficos de una sola serie (equipos por piso, por modelo) usan un solo
// color: el cian de la marca. Pintar cada barra distinto sugería categorías
// con significado propio y chocaba con los colores de estado.
const COLOR_DATO = '#00e5ff';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      {label && <p className="tooltip-label">{label}</p>}
      {payload.map((p, i) => (
        <p key={i}>
          <span className="legend-dot" style={{ background: p.payload?.fill || p.fill || p.color }} />
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

function fmtDate(iso) {
  return new Date(iso).toLocaleString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function Dashboard({ onNavigate, onOpenEquipo, refresh, rol, esGlobal, edificioSel }) {
  const [todos,     setTodos]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [actividad, setActividad] = useState([]);
  const [pisoSeleccionado,   setPisoSeleccionado]   = useState(null);

  useEffect(() => {
    getEquipos().then(d => { setTodos(d); setLoading(false); });
    getHistorial(15).then(setActividad).catch(() => {});
  }, [refresh]);

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

  if (loading) return <DashboardSkeleton />;

  const count = fn => todos.filter(fn).length;

  const enUso    = count(e => e.estado === 'En uso');
  const lista    = count(e => e.estado === 'Disponible');
  const revision = count(e => e.estado === 'En revisión');

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

  // RAM — agrupada por capacidad real y ordenada de menor a mayor. Es una
  // magnitud, así que usa una escala de un solo tono (más RAM = más brillo).
  const ramMap = {};
  for (const e of todos) {
    const k = grupoRam(e.ram);
    if (!k) continue;
    ramMap[k] = (ramMap[k] || 0) + 1;
  }
  const ramGrupos = Object.keys(ramMap).sort((a, b) => ordenRam(a) - ordenRam(b));
  const ramColor = coloresRam(ramGrupos);
  const byRam = ramGrupos.map(name => ({ name, value: ramMap[name], fill: ramColor[name] }));

  const nav = onNavigate || (() => {});

  return (
    <div className="dashboard">

      {/* KPIs */}
      <div className="kpi-row">
        <KpiCard value={todos.length} label="Total Equipos" color="var(--neon-cyan)" Icon={Laptop}
          onClick={() => nav({})} />
        <KpiEstado estado="En uso"      value={enUso}    label="En Uso"      onClick={() => nav({ estado: 'En uso' })} />
        <KpiEstado estado="Disponible"  value={lista}    label="Disponibles" onClick={() => nav({ estado: 'Disponible' })} />
        <KpiEstado estado="En revisión" value={revision} label="En Revisión" onClick={() => nav({ estado: 'En revisión' })} />
      </div>

      <div className="accesorios-row">
        <AccesorioCard categoria="audifonos" titulo="Audífonos disponibles" Icono={Headphones}
          atributoOptions={AUDIFONO_TIPOS} rol={rol} esGlobal={esGlobal} edificioSel={edificioSel} refresh={refresh} />
        <AccesorioCard categoria="monitores" titulo="Monitores disponibles" Icono={Monitor}
          rol={rol} esGlobal={esGlobal} edificioSel={edificioSel} refresh={refresh} />
        <AccesorioCard categoria="celulares" titulo="Celulares disponibles" Icono={Smartphone}
          rol={rol} esGlobal={esGlobal} edificioSel={edificioSel} refresh={refresh} />
      </div>

      {/* Fila 1: Piso + RAM */}
      <div className="dash-row-2col">

        {/* Piso */}
        <div className="dash-card card">
          <h3 className="dash-card-title">Equipos por piso</h3>
          <p className="dash-card-hint">Click en una barra para ver los agentes de ese piso</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byPiso} margin={{ top: 4, right: 10, left: -20, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,229,255,0.06)" vertical={false} />
              <XAxis dataKey="piso" tick={{ fontSize: 12, fill: '#3a6a88' }}
                axisLine={{ stroke: 'rgba(0,229,255,0.1)' }} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#3a6a88' }}
                axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,229,255,0.08)' }} />
              <Bar dataKey="total" name="Equipos" radius={[4, 4, 0, 0]} maxBarSize={40}
                fill={COLOR_DATO} style={{ cursor: 'pointer', filter: `drop-shadow(0 0 4px ${COLOR_DATO}66)` }}
                onClick={(data) => setPisoSeleccionado(data.piso)}>
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* RAM */}
        <div className="dash-card card">
          <h3 className="dash-card-title">RAM</h3>
          <p className="dash-card-hint">De menor a mayor capacidad · click en un segmento para filtrar</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={byRam} dataKey="value" nameKey="name"
                cx="50%" cy="45%" outerRadius={85} innerRadius={42} paddingAngle={3}
                onClick={(e) => e.name !== 'Otro' && nav({ ram: e.name })}
                style={{ cursor: 'pointer' }}>
                {byRam.map(r => (
                  <Cell key={r.name} fill={r.fill} stroke="var(--surface)" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              {/* La leyenda sigue el orden de capacidad, no el alfabético de recharts */}
              <Legend content={() => <CustomLegend payload={byRam.map(r => ({ value: r.name, color: r.fill }))} />} />
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
                tick={{ fontSize: 12, fill: '#3a6a88' }} axisLine={false} tickLine={false} />
              <YAxis dataKey="modelo" type="category" width={155}
                tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,229,255,0.04)' }} />
              <Bar dataKey="total" name="Equipos" radius={[0, 4, 4, 0]} maxBarSize={22}
                fill={COLOR_DATO} style={{ cursor: 'pointer', filter: `drop-shadow(0 0 4px ${COLOR_DATO}66)` }}
                onClick={(data) => nav({ modelo: data.modelo })}>
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Actividad reciente */}
        <div className="dash-card card dash-actividad-card">
          <h3 className="dash-card-title">Actividad reciente</h3>
          {actividad.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: '12px 0' }}>Sin actividad registrada aún.</p>
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
                      {h.equipo_piso && <GrupoChip piso={h.equipo_piso} />}
                      <span className="dash-feed-time">{fmtDate(h.created_at)}</span>
                    </div>
                    <FeedCambio h={h} />
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

function KpiCard({ value, label, color, Icon, onClick, title }) {
  return (
    <div className="kpi-card kpi-tono" onClick={onClick} title={title} style={{ cursor: 'pointer', '--c': color }}>
      <div className="kpi-icon"><Icon size={20} /></div>
      <span className="kpi-num">{value}</span>
      <span className="kpi-label">{label}</span>
    </div>
  );
}

// KPI de un estado de equipo: usa el color e icono reservados de ese estado,
// los mismos que ven las etiquetas del inventario y los asientos de Agentes.
function KpiEstado({ estado, ...props }) {
  const { color, Icon, desc } = metaEstado(estado);
  return <KpiCard {...props} color={color} Icon={Icon} title={desc} />;
}

const CAMPOS_EVENTO = { creacion: 'disponible', restauracion: 'disponible', eliminacion: 'baja' };

// Una línea del historial: icono del campo + valor anterior (tachado) →
// valor nuevo. Los cambios de estado se muestran con su etiqueta de estado.
function FeedCambio({ h }) {
  const Icon = CAMPO_ICON[h.campo];
  if (CAMPOS_EVENTO[h.campo]) {
    return (
      <span className="dash-feed-evento" style={{ '--c': `var(--estado-${CAMPOS_EVENTO[h.campo]})` }}>
        {Icon && <Icon size={12} />} {h.valor_nuevo}
      </span>
    );
  }
  const esEstado = h.campo === 'estado';
  return (
    <div className="dash-feed-cambio">
      <span className="dash-feed-campo">
        {Icon && <Icon size={12} />} {CAMPO_LABEL[h.campo] || h.campo}:
      </span>
      {esEstado && h.valor_ant ? <EstadoBadge estado={h.valor_ant} size={10} /> : <span className="dash-feed-ant">{h.valor_ant || '—'}</span>}
      <ArrowRight size={11} className="dash-feed-flecha" />
      {esEstado && h.valor_nuevo ? <EstadoBadge estado={h.valor_nuevo} size={10} /> : <span className="dash-feed-nuevo">{h.valor_nuevo || '—'}</span>}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="dashboard">
      <div className="kpi-row">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="kpi-card" style={{ gap: 10 }}>
            <div className="skeleton-bar" style={{ width: 28, height: 28, borderRadius: '50%' }} />
            <div className="skeleton-bar" style={{ width: '60%', height: 22 }} />
            <div className="skeleton-bar" style={{ width: '80%' }} />
          </div>
        ))}
      </div>
      <div className="dash-row-2col">
        {[1, 2].map(i => (
          <div key={i} className="dash-card card" style={{ gap: 12 }}>
            <div className="skeleton-bar" style={{ width: '40%' }} />
            <div className="skeleton-bar" style={{ height: 180, borderRadius: 12 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

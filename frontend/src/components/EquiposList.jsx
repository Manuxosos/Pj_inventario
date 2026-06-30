import { useState, useEffect } from 'react';
import { getEquipos, getOpciones, deleteEquipo } from '../api';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import './EquiposList.css';

const ESTADOS = ['En uso agente', 'En uso TI', 'NO LISTA', 'LISTA', 'REVISION', 'NUEVO'];

const ESTADO_BADGE = {
  'En uso agente': 'badge-blue',
  'En uso TI':     'badge-blue',
  'LISTA':         'badge-green',
  'NO LISTA':      'badge-red',
  'REVISION':      'badge-yellow',
  'NUEVO':         'badge-purple',
};

function getBadgeClass(estado) {
  return ESTADO_BADGE[estado] || 'badge-gray';
}

const ACCESORIO_LABEL = {
  cargador: 'Cargador', mouse: 'Mouse', audifonos: 'Audífonos',
  monitor: 'Monitor', estuche: 'Estuche', adaptador_tplink: 'Adaptador Tp-Link',
};

export default function EquiposList({ refresh, externalFilters, onEdit, onView }) {
  const [equipos, setEquipos] = useState([]);
  const [todos, setTodos] = useState([]);
  const [opciones, setOpciones] = useState({ pisos: [] });
  const emptyFilters = { ...emptyFilters };
  const [filters, setFilters] = useState({ ...emptyFilters, ...(externalFilters || {}) });
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  // Cargar totales globales (sin filtros) para los stats
  useEffect(() => {
    getEquipos().then(setTodos);
    getOpciones().then(setOpciones);
  }, [refresh]);

  // Cargar equipos filtrados para la tabla
  useEffect(() => {
    setLoading(true);
    const params = {};
    if (filters.search)   params.search   = filters.search;
    if (filters.piso)     params.piso     = filters.piso;
    if (filters.estado)   params.estado   = filters.estado;
    if (filters.estadoIn) params.estadoIn = filters.estadoIn;
    if (filters.ram)      params.ram      = filters.ram;
    if (filters.modelo)   params.modelo   = filters.modelo;
    if (filters.accesorio) params.accesorio = filters.accesorio;
    getEquipos(params).then(data => {
      setEquipos(data);
      setLoading(false);
    });
  }, [refresh, filters]);

  const handleDelete = async (id, idActivo) => {
    if (!confirm(`¿Eliminar equipo ${idActivo}?`)) return;
    setDeleting(id);
    await deleteEquipo(id);
    setEquipos(e => e.filter(x => x.id !== id));
    setTodos(e => e.filter(x => x.id !== id));
    setDeleting(null);
  };

  const enUso   = todos.filter(e => e.estado === 'En uso agente' || e.estado === 'En uso TI').length;
  const enBodega = todos.filter(e => e.piso === 'BODEGA').length;

  return (
    <div>
      {/* Stats — siempre totales globales */}
      <div className="stats-row">
        <div className="stat-card card">
          <span className="stat-num">{todos.length}</span>
          <span className="stat-label">Total Equipos</span>
        </div>
        <div className="stat-card card">
          <span className="stat-num">{enUso}</span>
          <span className="stat-label">En Uso</span>
        </div>
        <div className="stat-card card">
          <span className="stat-num">{enBodega}</span>
          <span className="stat-label">En Bodega</span>
        </div>
        <div className="stat-card card">
          <span className="stat-num">{opciones.pisos.length}</span>
          <span className="stat-label">Pisos</span>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar card">
        <input
          className="form-input search-input"
          placeholder="Buscar por ID, serial, modelo, agente..."
          value={filters.search}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
        />
        <select
          className="form-input"
          value={filters.piso}
          onChange={e => setFilters(f => ({ ...f, piso: e.target.value }))}
        >
          <option value="">Todos los pisos</option>
          {opciones.pisos.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select
          className="form-input"
          value={filters.estado}
          onChange={e => setFilters(f => ({ ...f, estado: e.target.value }))}
        >
          <option value="">Todos los estados</option>
          {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        {(filters.search || filters.piso || filters.estado || filters.estadoIn || filters.ram || filters.modelo || filters.accesorio) && (
          <button className="btn btn-ghost btn-sm" onClick={() => setFilters({ ...emptyFilters })}>
            Limpiar
          </button>
        )}
      </div>

      {/* Chip de filtro activo desde dashboard */}
      {(filters.ram || filters.modelo || filters.estadoIn || filters.accesorio) && (
        <div className="active-filter-bar">
          <span className="active-filter-label">Filtro activo:</span>
          {filters.ram      && <span className="active-filter-chip">RAM: {filters.ram}</span>}
          {filters.modelo   && <span className="active-filter-chip">Modelo: {filters.modelo}</span>}
          {filters.estadoIn && <span className="active-filter-chip">Estado: {filters.estadoIn.split(',').join(' / ')}</span>}
          {filters.accesorio && <span className="active-filter-chip">{ACCESORIO_LABEL[filters.accesorio] || filters.accesorio}: Con accesorio</span>}
          <button className="btn btn-ghost btn-sm" onClick={() => setFilters({ ...emptyFilters })}>
            × Quitar
          </button>
        </div>
      )}

      {/* Table */}
      <div className="table-wrapper card">
        {loading ? (
          <div className="table-loading">Cargando...</div>
        ) : equipos.length === 0 ? (
          <div className="table-empty">No se encontraron equipos.</div>
        ) : (
          <table className="equip-table">
            <thead>
              <tr>
                <th>ID Activo</th>
                <th>Piso</th>
                <th>Marca / Modelo</th>
                <th>Procesador</th>
                <th>RAM</th>
                <th>Disco</th>
                <th>Nº Serie</th>
                <th>Estado</th>
                <th>Responsable</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {equipos.map(eq => (
                <tr key={eq.id} className="equip-row">
                  <td><span className="id-badge">{eq.id_activo || '—'}</span></td>
                  <td className="text-muted">{eq.piso || '—'}</td>
                  <td className="model-cell">{eq.marca_modelo || '—'}</td>
                  <td className="text-muted small">{eq.procesador || '—'}</td>
                  <td>{eq.ram || '—'}</td>
                  <td>{eq.disco_duro || '—'}</td>
                  <td className="mono text-muted small">{eq.numero_serie || '—'}</td>
                  <td>
                    {eq.estado
                      ? <span className={`badge ${getBadgeClass(eq.estado)}`}>{eq.estado}</span>
                      : <span className="text-muted">—</span>
                    }
                  </td>
                  <td>{eq.responsable || '—'}</td>
                  <td className="actions-cell">
                    <button className="btn btn-ghost btn-sm" onClick={() => onView(eq)} title="Ver detalle"><Eye size={14}/></button>
                    <button className="btn btn-ghost btn-sm" onClick={() => onEdit(eq)} title="Editar"><Pencil size={14}/></button>
                    <button className="btn btn-ghost btn-sm danger-btn" onClick={() => handleDelete(eq.id, eq.id_activo)} disabled={deleting === eq.id} title="Eliminar"><Trash2 size={14}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

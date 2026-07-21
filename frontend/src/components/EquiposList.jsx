import { useState, useEffect, useMemo } from 'react';
import { getEquipos, getOpciones, deleteEquipo, updateEquipo, exportarExcel } from '../api';
import { Eye, Pencil, Trash2, ChevronUp, ChevronDown, ChevronsUpDown, X, Download, Trash } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import PapeleraModal from './PapeleraModal';
import './EquiposList.css';

const COLUMNAS = [
  { key: 'id_activo',    label: 'ID Activo' },
  { key: 'piso',         label: 'Piso' },
  { key: 'marca_modelo', label: 'Marca / Modelo' },
  { key: 'procesador',   label: 'Procesador' },
  { key: 'ram',          label: 'RAM' },
  { key: 'disco_duro',   label: 'Disco' },
  { key: 'numero_serie', label: 'Nº Serie' },
  { key: 'estado',       label: 'Estado' },
  { key: 'responsable',  label: 'Responsable' },
];

const ESTADOS = ['En uso', 'Disponible', 'En revisión', 'De baja'];

const ESTADO_BADGE = {
  'En uso':       'badge-blue',
  'Disponible':   'badge-green',
  'En revisión':  'badge-yellow',
  'De baja':      'badge-red',
};

function getBadgeClass(estado) {
  return ESTADO_BADGE[estado] || 'badge-gray';
}

const ACCESORIO_LABEL = {
  cargador: 'Cargador', mouse: 'Mouse', audifonos: 'Audífonos',
  monitor: 'Monitor', estuche: 'Estuche', adaptador_tplink: 'Adaptador Tp-Link',
};

const FILTERS_KEY = 'inventario_filtros_v1';
const SORT_KEY = 'inventario_orden_v1';
const FILTROS_VACIOS = { search: '', piso: '', estado: '', estadoIn: '', ram: '', modelo: '', accesorio: '' };

function leerGuardado(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export default function EquiposList({ refresh, externalFilters, rol, onEdit, onView, showToast }) {
  const puedeEditar = rol === 'admin' || rol === 'it';
  const esAdmin = rol === 'admin';
  const [equipos, setEquipos] = useState([]);
  const [todos, setTodos] = useState([]);
  const [opciones, setOpciones] = useState({ pisos: [] });
  const [filters, setFilters] = useState(() => ({
    ...FILTROS_VACIOS,
    ...(externalFilters || leerGuardado(FILTERS_KEY) || {}),
  }));
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // { id, label } | { ids: [] }
  const [sortConfig, setSortConfig] = useState(() => leerGuardado(SORT_KEY) || { key: null, direction: 'asc' });
  const [seleccion, setSeleccion] = useState(new Set());
  const [nuevoEstadoLote, setNuevoEstadoLote] = useState('');
  const [nuevoPisoLote, setNuevoPisoLote] = useState('');
  const [aplicandoLote, setAplicandoLote] = useState(false);
  const [papeleraAbierta, setPapeleraAbierta] = useState(false);
  const [exportando, setExportando] = useState(false);

  const handleSort = (key) => {
    setSortConfig(prev => prev.key === key
      ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      : { key, direction: 'asc' });
  };

  const equiposOrdenados = useMemo(() => {
    if (!sortConfig.key) return equipos;
    const { key, direction } = sortConfig;
    return [...equipos].sort((a, b) => {
      const av = (a[key] ?? '').toString();
      const bv = (b[key] ?? '').toString();
      if (!av && bv) return 1;
      if (av && !bv) return -1;
      if (!av && !bv) return 0;
      const cmp = av.localeCompare(bv, 'es', { numeric: true, sensitivity: 'base' });
      return direction === 'asc' ? cmp : -cmp;
    });
  }, [equipos, sortConfig]);

  // Persistir filtros y orden para recordarlos la próxima vez
  useEffect(() => { localStorage.setItem(FILTERS_KEY, JSON.stringify(filters)); }, [filters]);
  useEffect(() => { localStorage.setItem(SORT_KEY, JSON.stringify(sortConfig)); }, [sortConfig]);

  const buildParams = () => {
    const params = {};
    if (filters.search)   params.search   = filters.search;
    if (filters.piso)     params.piso     = filters.piso;
    if (filters.estado)   params.estado   = filters.estado;
    if (filters.estadoIn) params.estadoIn = filters.estadoIn;
    if (filters.ram)      params.ram      = filters.ram;
    if (filters.modelo)   params.modelo   = filters.modelo;
    if (filters.accesorio) params.accesorio = filters.accesorio;
    return params;
  };

  const cargarTodos = () => {
    getEquipos().then(setTodos);
    getOpciones().then(setOpciones);
  };

  // Cargar totales globales (sin filtros) para los stats
  useEffect(() => { cargarTodos(); }, [refresh]);

  // Cargar equipos filtrados para la tabla
  useEffect(() => {
    setLoading(true);
    getEquipos(buildParams()).then(data => {
      setEquipos(data);
      setLoading(false);
    });
    setSeleccion(new Set());
  }, [refresh, filters]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    if (confirmDelete.ids) {
      setAplicandoLote(true);
      await Promise.all(confirmDelete.ids.map(id => deleteEquipo(id)));
      const idsSet = new Set(confirmDelete.ids);
      setEquipos(e => e.filter(x => !idsSet.has(x.id)));
      setTodos(e => e.filter(x => !idsSet.has(x.id)));
      setSeleccion(new Set());
      setAplicandoLote(false);
      setConfirmDelete(null);
      showToast?.(`${idsSet.size} equipos movidos a la papelera`);
      return;
    }
    setDeleting(confirmDelete.id);
    setConfirmDelete(null);
    await deleteEquipo(confirmDelete.id);
    setEquipos(e => e.filter(x => x.id !== confirmDelete.id));
    setTodos(e => e.filter(x => x.id !== confirmDelete.id));
    setDeleting(null);
    showToast?.('Equipo movido a la papelera');
  };

  const toggleSeleccion = (id) => {
    setSeleccion(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSeleccionarTodos = () => {
    setSeleccion(prev =>
      prev.size === equiposOrdenados.length ? new Set() : new Set(equiposOrdenados.map(e => e.id))
    );
  };

  const aplicarCambioLote = async (campo, valor) => {
    if (!valor || seleccion.size === 0) return;
    setAplicandoLote(true);
    const seleccionados = equipos.filter(e => seleccion.has(e.id));
    await Promise.all(seleccionados.map(eq => updateEquipo(eq.id, { ...eq, [campo]: valor })));
    const actualizar = list => list.map(e => seleccion.has(e.id) ? { ...e, [campo]: valor } : e);
    setEquipos(actualizar);
    setTodos(actualizar);
    setNuevoEstadoLote('');
    setNuevoPisoLote('');
    setAplicandoLote(false);
    setSeleccion(new Set());
  };

  const handleExportar = async () => {
    setExportando(true);
    try {
      const blob = await exportarExcel(buildParams());
      const fecha = new Date().toISOString().slice(0, 10);
      const nombreArchivo = `inventario_equipos_${fecha}.xlsx`;
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: nombreArchivo,
          types: [{ description: 'Excel', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        showToast?.('Excel exportado correctamente');
      } catch (e) {
        if (e.name !== 'AbortError') {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = nombreArchivo;
          a.click();
          URL.revokeObjectURL(url);
          showToast?.('Excel exportado correctamente');
        }
      }
    } catch (err) {
      showToast?.('Error al exportar', 'error');
    } finally {
      setExportando(false);
    }
  };

  const hayFiltrosActivos = Object.values(filters).some(Boolean);
  const enUso   = todos.filter(e => e.estado === 'En uso').length;
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
        {hayFiltrosActivos && (
          <button className="btn btn-ghost btn-sm" onClick={() => setFilters({ ...FILTROS_VACIOS })}>
            Limpiar
          </button>
        )}

        <div className="filters-bar-spacer" />

        {puedeEditar && (
          <button className="btn btn-secondary" onClick={handleExportar} disabled={exportando}>
            <Download size={14} /> {exportando ? 'Exportando...' : hayFiltrosActivos ? 'Exportar filtrado' : 'Exportar Excel'}
          </button>
        )}
        {esAdmin && (
          <button className="btn btn-ghost" onClick={() => setPapeleraAbierta(true)} title="Ver equipos eliminados">
            <Trash size={14} /> Papelera
          </button>
        )}
      </div>

      {/* Chip de filtro activo desde dashboard */}
      {(filters.ram || filters.modelo || filters.estadoIn || filters.estado || filters.accesorio) && (
        <div className="active-filter-bar">
          <span className="active-filter-label">Filtro activo:</span>
          {filters.estado    && <span className="active-filter-chip">Estado: {filters.estado}</span>}
          {filters.estadoIn  && <span className="active-filter-chip">Estado: {filters.estadoIn.split(',').join(' / ')}</span>}
          {filters.ram       && <span className="active-filter-chip">RAM: {filters.ram}</span>}
          {filters.modelo    && <span className="active-filter-chip">Modelo: {filters.modelo}</span>}
          {filters.accesorio && <span className="active-filter-chip">{ACCESORIO_LABEL[filters.accesorio] || filters.accesorio}: Con accesorio</span>}
          <button className="btn btn-ghost btn-sm" onClick={() => setFilters({ ...FILTROS_VACIOS })}>
            × Quitar
          </button>
        </div>
      )}

      {/* Table */}
      <div className="table-wrapper card">
        {loading ? (
          <TableSkeleton conCheckbox={puedeEditar} />
        ) : equipos.length === 0 ? (
          <div className="table-empty">No se encontraron equipos.</div>
        ) : (
          <table className="equip-table">
            <thead>
              <tr>
                {puedeEditar && (
                  <th className="checkbox-th">
                    <input
                      type="checkbox"
                      checked={seleccion.size > 0 && seleccion.size === equiposOrdenados.length}
                      ref={el => { if (el) el.indeterminate = seleccion.size > 0 && seleccion.size < equiposOrdenados.length; }}
                      onChange={toggleSeleccionarTodos}
                    />
                  </th>
                )}
                {COLUMNAS.map(col => {
                  const active = sortConfig.key === col.key;
                  return (
                    <th key={col.key} className="sortable-th" onClick={() => handleSort(col.key)}>
                      <span className="th-content">
                        {col.label}
                        {active
                          ? (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
                          : <ChevronsUpDown size={12} className="th-sort-idle" />}
                      </span>
                    </th>
                  );
                })}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {equiposOrdenados.map(eq => (
                <tr key={eq.id} className={`equip-row ${seleccion.has(eq.id) ? 'equip-row-selected' : ''}`}>
                  {puedeEditar && (
                    <td className="checkbox-td">
                      <input type="checkbox" checked={seleccion.has(eq.id)} onChange={() => toggleSeleccion(eq.id)} />
                    </td>
                  )}
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
                    {puedeEditar && onEdit && (
                      <button className="btn btn-ghost btn-sm" onClick={() => onEdit(eq)} title="Editar"><Pencil size={14}/></button>
                    )}
                    {puedeEditar && (
                      <button className="btn btn-ghost btn-sm danger-btn"
                        onClick={() => setConfirmDelete({ id: eq.id, label: eq.id_activo || eq.marca_modelo || `Equipo #${eq.id}` })}
                        disabled={deleting === eq.id} title="Eliminar"><Trash2 size={14}/></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {confirmDelete && (
        <ConfirmModal
          title={confirmDelete.ids ? `Eliminar ${confirmDelete.ids.length} equipos` : 'Eliminar equipo'}
          message={confirmDelete.ids
            ? `¿Estás seguro de que querés mover los ${confirmDelete.ids.length} equipos seleccionados a la papelera?`
            : `¿Estás seguro de que querés mover el equipo "${confirmDelete.label}" a la papelera?`}
          confirmLabel="Mover a la papelera"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {papeleraAbierta && (
        <PapeleraModal
          onClose={() => setPapeleraAbierta(false)}
          onCambio={() => { cargarTodos(); getEquipos(buildParams()).then(setEquipos); }}
        />
      )}

      {puedeEditar && seleccion.size > 0 && (
        <div className="bulk-bar">
          <span className="bulk-bar-count">{seleccion.size} seleccionado{seleccion.size === 1 ? '' : 's'}</span>

          <div className="bulk-bar-group">
            <select className="form-input" value={nuevoEstadoLote} onChange={e => setNuevoEstadoLote(e.target.value)} disabled={aplicandoLote}>
              <option value="">Cambiar estado a...</option>
              {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            <button className="btn btn-secondary btn-sm" disabled={!nuevoEstadoLote || aplicandoLote}
              onClick={() => aplicarCambioLote('estado', nuevoEstadoLote)}>
              Aplicar
            </button>
          </div>

          <div className="bulk-bar-group">
            <select className="form-input" value={nuevoPisoLote} onChange={e => setNuevoPisoLote(e.target.value)} disabled={aplicandoLote}>
              <option value="">Cambiar piso a...</option>
              {opciones.pisos.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <button className="btn btn-secondary btn-sm" disabled={!nuevoPisoLote || aplicandoLote}
              onClick={() => aplicarCambioLote('piso', nuevoPisoLote)}>
              Aplicar
            </button>
          </div>

          <button className="btn btn-danger btn-sm" disabled={aplicandoLote}
            onClick={() => setConfirmDelete({ ids: [...seleccion] })}>
            <Trash2 size={13} /> Eliminar
          </button>

          <button className="btn-icon-neon bulk-bar-cerrar" onClick={() => setSeleccion(new Set())} title="Cancelar selección">
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

function TableSkeleton({ conCheckbox }) {
  const cols = COLUMNAS.length + (conCheckbox ? 1 : 0) + 1;
  return (
    <table className="equip-table">
      <tbody>
        {Array.from({ length: 8 }).map((_, i) => (
          <tr key={i} className="equip-row">
            {Array.from({ length: cols }).map((_, j) => (
              <td key={j}><div className="skeleton-bar" style={{ animationDelay: `${(i * cols + j) * 0.02}s` }} /></td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

import { useState, useEffect } from 'react';
import { Headphones, Pencil, Trash2, X, Check } from 'lucide-react';
import { getAudifonosStock, crearAudifono, actualizarAudifono, eliminarAudifono } from '../api';
import './AudifonosCard.css';

const TIPO_LABEL = { bluetooth: 'Bluetooth', 'usb_2.4ghz': 'USB 2.4GHz' };
const TIPOS = [
  { value: 'bluetooth', label: 'Bluetooth' },
  { value: 'usb_2.4ghz', label: 'USB 2.4GHz' },
];

const FILA_VACIA = { modelo: '', tipo_conexion: 'bluetooth', cantidad: '0' };

// Se usa tanto en el Dashboard como en la pestaña de Inventario (vista
// "Audífonos"). Se comporta distinto según el contexto:
// - Si hay un edificio puntual en foco (IT siempre; admin/observador con
//   uno elegido en el selector) muestra la lista de modelos de ESE
//   edificio, editable si el rol puede (admin/it), solo lectura si es
//   observador.
// - Si es admin/observador mirando "Todos los edificios" (sin uno
//   puntual elegido) muestra los modelos de todos los edificios,
//   agrupados, de solo lectura.
export default function AudifonosCard({ rol, esGlobal, edificioSel, refresh }) {
  const puedeEditar = rol === 'admin' || rol === 'it';
  const mostrarTodos = esGlobal && edificioSel == null;

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [editandoId, setEditandoId] = useState(null);
  const [editForm, setEditForm] = useState(FILA_VACIA);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const [agregando, setAgregando] = useState(false);
  const [nuevoForm, setNuevoForm] = useState(FILA_VACIA);

  const cargar = () => {
    setLoading(true);
    getAudifonosStock()
      .then(rows => setItems(rows))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); setAgregando(false); setEditandoId(null); }, [refresh, mostrarTodos, edificioSel]);

  const empezarEditar = (item) => {
    setEditandoId(item.id);
    setEditForm({ modelo: item.modelo, tipo_conexion: item.tipo_conexion, cantidad: String(item.cantidad) });
    setError('');
  };

  const cancelarEditar = () => { setEditandoId(null); setError(''); };

  const guardarEditar = async (id) => {
    setGuardando(true);
    setError('');
    try {
      await actualizarAudifono(id, editForm);
      setEditandoId(null);
      cargar();
    } catch (err) {
      setError(err?.response?.data?.error || 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (id) => {
    if (!window.confirm('¿Eliminar este modelo de la lista?')) return;
    setGuardando(true);
    try {
      await eliminarAudifono(id);
      cargar();
    } finally {
      setGuardando(false);
    }
  };

  const agregar = async () => {
    setGuardando(true);
    setError('');
    try {
      await crearAudifono(nuevoForm);
      setNuevoForm(FILA_VACIA);
      setAgregando(false);
      cargar();
    } catch (err) {
      setError(err?.response?.data?.error || 'No se pudo agregar');
    } finally {
      setGuardando(false);
    }
  };

  const renderFila = (item) => {
    if (editandoId === item.id) {
      return (
        <li key={item.id} className="audifonos-fila audifonos-fila-edit">
          <input
            className="form-input"
            value={editForm.modelo}
            onChange={e => setEditForm(f => ({ ...f, modelo: e.target.value }))}
            placeholder="Modelo"
          />
          <select
            className="form-input"
            value={editForm.tipo_conexion}
            onChange={e => setEditForm(f => ({ ...f, tipo_conexion: e.target.value }))}
          >
            {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <input
            type="number" min="0" max="9999"
            className="form-input audifonos-cantidad-input"
            value={editForm.cantidad}
            onChange={e => setEditForm(f => ({ ...f, cantidad: e.target.value }))}
          />
          <button className="btn btn-ghost btn-sm" disabled={guardando} onClick={() => guardarEditar(item.id)} title="Guardar" aria-label="Guardar">
            <Check size={15} />
          </button>
          <button className="btn btn-ghost btn-sm" disabled={guardando} onClick={cancelarEditar} title="Cancelar" aria-label="Cancelar">
            <X size={15} />
          </button>
        </li>
      );
    }
    return (
      <li key={item.id} className="audifonos-fila">
        <span className="audifonos-modelo">{item.modelo}</span>
        <span className="audifonos-tipo">{TIPO_LABEL[item.tipo_conexion] || item.tipo_conexion}</span>
        <strong className="audifonos-cantidad">{item.cantidad}</strong>
        {puedeEditar && (
          <span className="audifonos-acciones">
            <button className="btn btn-ghost btn-sm" onClick={() => empezarEditar(item)} title="Editar" aria-label="Editar">
              <Pencil size={14} />
            </button>
            <button className="btn btn-ghost btn-sm danger-btn" onClick={() => eliminar(item.id)} title="Eliminar" aria-label="Eliminar">
              <Trash2 size={14} />
            </button>
          </span>
        )}
      </li>
    );
  };

  return (
    <div className="audifonos-card card">
      <div className="audifonos-card-header">
        <Headphones size={16} />
        <h3>Audífonos disponibles</h3>
      </div>

      {loading ? (
        <div className="skeleton-bar" style={{ height: 24, borderRadius: 6 }} />
      ) : mostrarTodos ? (
        items.length === 0 ? (
          <p className="audifonos-vacio">No hay audífonos cargados todavía.</p>
        ) : (
          Object.entries(
            items.reduce((acc, it) => {
              (acc[it.edificio_nombre] ||= []).push(it);
              return acc;
            }, {})
          ).map(([edificio, filas]) => (
            <div key={edificio} className="audifonos-grupo">
              <h4 className="audifonos-grupo-titulo">{edificio}</h4>
              <ul className="audifonos-lista">
                {filas.map(it => (
                  <li key={it.id} className="audifonos-fila audifonos-fila-solo-lectura">
                    <span className="audifonos-modelo">{it.modelo}</span>
                    <span className="audifonos-tipo">{TIPO_LABEL[it.tipo_conexion] || it.tipo_conexion}</span>
                    <strong className="audifonos-cantidad">{it.cantidad}</strong>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )
      ) : (
        <>
          {items.length === 0 ? (
            <p className="audifonos-vacio">No hay modelos cargados todavía.</p>
          ) : (
            <ul className="audifonos-lista">{items.map(renderFila)}</ul>
          )}

          {error && <p className="audifonos-error">{error}</p>}

          {puedeEditar && (
            agregando ? (
              <div className="audifonos-fila audifonos-fila-edit audifonos-fila-nueva">
                <input
                  className="form-input"
                  value={nuevoForm.modelo}
                  onChange={e => setNuevoForm(f => ({ ...f, modelo: e.target.value }))}
                  placeholder="Modelo (ej. Logitech H390)"
                  autoFocus
                />
                <select
                  className="form-input"
                  value={nuevoForm.tipo_conexion}
                  onChange={e => setNuevoForm(f => ({ ...f, tipo_conexion: e.target.value }))}
                >
                  {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <input
                  type="number" min="0" max="9999"
                  className="form-input audifonos-cantidad-input"
                  value={nuevoForm.cantidad}
                  onChange={e => setNuevoForm(f => ({ ...f, cantidad: e.target.value }))}
                />
                <button className="btn btn-ghost btn-sm" disabled={guardando} onClick={agregar} title="Agregar" aria-label="Agregar">
                  <Check size={15} />
                </button>
                <button className="btn btn-ghost btn-sm" disabled={guardando} onClick={() => { setAgregando(false); setError(''); }} title="Cancelar" aria-label="Cancelar">
                  <X size={15} />
                </button>
              </div>
            ) : (
              <button className="btn btn-secondary btn-sm audifonos-btn-agregar" onClick={() => setAgregando(true)}>
                + Agregar modelo
              </button>
            )
          )}
        </>
      )}
    </div>
  );
}

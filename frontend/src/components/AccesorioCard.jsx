import { useState, useEffect } from 'react';
import { Pencil, Trash2, X, Check } from 'lucide-react';
import { getAccesorios, crearAccesorio, actualizarAccesorio, eliminarAccesorio } from '../api';
import './AccesorioCard.css';

// Se usa tanto en el Dashboard como en la pestaña de Inventario, una
// instancia por categoría (audífonos, monitores, celulares). Se comporta
// distinto según el contexto:
// - Si hay un edificio puntual en foco (IT siempre; admin/observador con
//   uno elegido en el selector) muestra la lista de modelos de ESE
//   edificio, editable si el rol puede (admin/it), solo lectura si es
//   observador.
// - Si es admin/observador mirando "Todos los edificios" (sin uno
//   puntual elegido) muestra los modelos de todos los edificios,
//   agrupados, de solo lectura.
//
// `atributoOptions` (opcional): lista [{value,label}] cuando la categoría
// tiene un segundo campo distintivo además de modelo/cantidad (hoy solo
// audífonos, con el tipo de conexión). Si no se pasa, el formulario y la
// tabla se reducen a modelo + cantidad.
export default function AccesorioCard({ categoria, titulo, Icono, atributoOptions, rol, esGlobal, edificioSel, refresh }) {
  const puedeEditar = rol === 'admin' || rol === 'it';
  const mostrarTodos = esGlobal && edificioSel == null;
  const tieneAtributo = !!atributoOptions;
  const atributoLabelDe = (valor) => atributoOptions?.find(o => o.value === valor)?.label || valor;

  const filaVacia = { categoria, modelo: '', atributo: atributoOptions?.[0]?.value || null, cantidad: '0' };

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [editandoId, setEditandoId] = useState(null);
  const [editForm, setEditForm] = useState(filaVacia);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const [agregando, setAgregando] = useState(false);
  const [nuevoForm, setNuevoForm] = useState(filaVacia);

  const cargar = () => {
    setLoading(true);
    getAccesorios(categoria)
      .then(rows => setItems(rows))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); setAgregando(false); setEditandoId(null); }, [refresh, mostrarTodos, edificioSel, categoria]);

  const empezarEditar = (item) => {
    setEditandoId(item.id);
    setEditForm({ categoria, modelo: item.modelo, atributo: item.atributo, cantidad: String(item.cantidad) });
    setError('');
  };

  const cancelarEditar = () => { setEditandoId(null); setError(''); };

  const guardarEditar = async (id) => {
    setGuardando(true);
    setError('');
    try {
      await actualizarAccesorio(id, editForm);
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
      await eliminarAccesorio(id);
      cargar();
    } finally {
      setGuardando(false);
    }
  };

  const agregar = async () => {
    setGuardando(true);
    setError('');
    try {
      await crearAccesorio(nuevoForm);
      setNuevoForm(filaVacia);
      setAgregando(false);
      cargar();
    } catch (err) {
      setError(err?.response?.data?.error || 'No se pudo agregar');
    } finally {
      setGuardando(false);
    }
  };

  const renderFormulario = (form, setForm, onGuardar, onCancelar, esNuevo) => (
    <div className={`accesorio-fila accesorio-fila-edit ${esNuevo ? 'accesorio-fila-nueva' : ''}`}>
      <input
        className="form-input"
        value={form.modelo}
        onChange={e => setForm(f => ({ ...f, modelo: e.target.value }))}
        placeholder={esNuevo ? 'Modelo (ej. Logitech H390)' : 'Modelo'}
        autoFocus={esNuevo}
      />
      {tieneAtributo && (
        <select
          className="form-input"
          value={form.atributo}
          onChange={e => setForm(f => ({ ...f, atributo: e.target.value }))}
        >
          {atributoOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}
      <input
        type="number" min="0" max="9999"
        className="form-input accesorio-cantidad-input"
        value={form.cantidad}
        onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))}
      />
      <button className="btn btn-ghost btn-sm" disabled={guardando} onClick={onGuardar} title={esNuevo ? 'Agregar' : 'Guardar'} aria-label={esNuevo ? 'Agregar' : 'Guardar'}>
        <Check size={15} />
      </button>
      <button className="btn btn-ghost btn-sm" disabled={guardando} onClick={onCancelar} title="Cancelar" aria-label="Cancelar">
        <X size={15} />
      </button>
    </div>
  );

  const renderFila = (item) => {
    if (editandoId === item.id) {
      return (
        <li key={item.id}>
          {renderFormulario(editForm, setEditForm, () => guardarEditar(item.id), cancelarEditar, false)}
        </li>
      );
    }
    return (
      <li key={item.id} className="accesorio-fila">
        <span className="accesorio-modelo">{item.modelo}</span>
        {tieneAtributo && <span className="accesorio-atributo">{atributoLabelDe(item.atributo)}</span>}
        <strong className="accesorio-cantidad">{item.cantidad}</strong>
        {puedeEditar && (
          <span className="accesorio-acciones">
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
    <div className="accesorio-card card">
      <div className="accesorio-card-header">
        <Icono size={16} />
        <h3>{titulo}</h3>
      </div>

      {loading ? (
        <div className="skeleton-bar" style={{ height: 24, borderRadius: 6 }} />
      ) : mostrarTodos ? (
        items.length === 0 ? (
          <p className="accesorio-vacio">No hay {titulo.toLowerCase()} cargados todavía.</p>
        ) : (
          Object.entries(
            items.reduce((acc, it) => {
              (acc[it.edificio_nombre] ||= []).push(it);
              return acc;
            }, {})
          ).map(([edificio, filas]) => (
            <div key={edificio} className="accesorio-grupo">
              <h4 className="accesorio-grupo-titulo">{edificio}</h4>
              <ul className="accesorio-lista">
                {filas.map(it => (
                  <li key={it.id} className="accesorio-fila accesorio-fila-solo-lectura">
                    <span className="accesorio-modelo">{it.modelo}</span>
                    {tieneAtributo && <span className="accesorio-atributo">{atributoLabelDe(it.atributo)}</span>}
                    <strong className="accesorio-cantidad">{it.cantidad}</strong>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )
      ) : (
        <>
          {items.length === 0 ? (
            <p className="accesorio-vacio">No hay modelos cargados todavía.</p>
          ) : (
            <ul className="accesorio-lista">{items.map(renderFila)}</ul>
          )}

          {error && <p className="accesorio-error">{error}</p>}

          {puedeEditar && (
            agregando
              ? renderFormulario(nuevoForm, setNuevoForm, agregar, () => { setAgregando(false); setError(''); }, true)
              : (
                <button className="btn btn-secondary btn-sm accesorio-btn-agregar" onClick={() => setAgregando(true)}>
                  + Agregar modelo
                </button>
              )
          )}
        </>
      )}
    </div>
  );
}

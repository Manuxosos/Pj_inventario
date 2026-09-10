import { useState, useEffect } from 'react';
import { Headphones } from 'lucide-react';
import { getAudifonosDisponibles, setAudifonosDisponibles, getEdificios } from '../api';
import './AudifonosCard.css';

// Se usa tanto en el Dashboard como en la pestaña de Inventario (vista
// "Audífonos"). Se comporta distinto según el contexto:
// - Si hay un edificio puntual en foco (IT siempre; admin/observador con
//   uno elegido en el selector) muestra un único número, editable si el
//   rol puede (admin/it), solo lectura si es observador.
// - Si es admin/observador mirando "Todos los edificios" (sin uno
//   puntual elegido) muestra una lista con todos los edificios y su
//   cantidad, de solo lectura.
export default function AudifonosCard({ rol, esGlobal, edificioSel, refresh }) {
  const puedeEditar = rol === 'admin' || rol === 'it';
  const mostrarLista = esGlobal && edificioSel == null;

  const [loading, setLoading] = useState(true);
  const [valor, setValor] = useState(0);
  const [input, setInput] = useState('0');
  const [guardando, setGuardando] = useState(false);
  const [lista, setLista] = useState([]);

  const cargar = () => {
    setLoading(true);
    if (mostrarLista) {
      getEdificios()
        .then(rows => setLista(rows))
        .catch(() => setLista([]))
        .finally(() => setLoading(false));
    } else {
      getAudifonosDisponibles()
        .then(d => {
          setValor(d.audifonos_disponibles ?? 0);
          setInput(String(d.audifonos_disponibles ?? 0));
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => { cargar(); }, [refresh, mostrarLista, edificioSel]);

  const handleGuardar = async () => {
    const n = parseInt(input);
    if (!Number.isInteger(n) || n < 0 || n > 9999) return;
    setGuardando(true);
    try {
      await setAudifonosDisponibles(n);
      cargar();
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="audifonos-card card">
      <div className="audifonos-card-header">
        <Headphones size={16} />
        <h3>Audífonos disponibles</h3>
      </div>

      {loading ? (
        <div className="skeleton-bar" style={{ height: 24, borderRadius: 6 }} />
      ) : mostrarLista ? (
        lista.length === 0 ? (
          <p className="audifonos-vacio">No hay edificios registrados todavía.</p>
        ) : (
          <ul className="audifonos-lista">
            {lista.map(ed => (
              <li key={ed.id}>
                <span>{ed.nombre}</span>
                <strong>{ed.audifonos_disponibles}</strong>
              </li>
            ))}
          </ul>
        )
      ) : puedeEditar ? (
        <div className="audifonos-edit">
          <input
            type="number"
            min="0"
            max="9999"
            className="form-input"
            value={input}
            onChange={e => setInput(e.target.value)}
          />
          <button
            className="btn btn-secondary"
            onClick={handleGuardar}
            disabled={guardando || parseInt(input) === valor}
          >
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      ) : (
        <span className="audifonos-valor">{valor}</span>
      )}
    </div>
  );
}

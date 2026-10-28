import { useState, useEffect } from 'react';
import { getTickets, createTicket, deleteTicket } from '../api';
import { PlusCircle, Trash2, Package, Wrench, HelpCircle, MoreHorizontal, Ticket as TicketIcon } from 'lucide-react';
import './Tickets.css';

const CATEGORIAS = [
  { value: 'accesorio',    label: 'Cambio de accesorio',  Icon: Package },
  { value: 'instalacion',  label: 'Instalación',          Icon: PlusCircle },
  { value: 'reparacion',   label: 'Reparación',           Icon: Wrench },
  { value: 'soporte',      label: 'Soporte / consulta',   Icon: HelpCircle },
  { value: 'otro',         label: 'Otro',                 Icon: MoreHorizontal },
];

const CATEGORIA_META = Object.fromEntries(CATEGORIAS.map(c => [c.value, c]));

function fmtFechaHora(iso) {
  return new Date(iso).toLocaleString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function Tickets({ rol, refresh }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [deleting, setDeleting] = useState(null);

  const [categoria, setCategoria] = useState('accesorio');
  const [descripcion, setDescripcion] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const puedeRegistrar = rol === 'admin' || rol === 'it';
  const esAdmin = rol === 'admin';

  const cargar = () => {
    setLoading(true);
    getTickets().then(t => { setTickets(t); setLoading(false); });
  };

  useEffect(() => { cargar(); }, [refresh]);

  const handleRegistrar = async (e) => {
    e.preventDefault();
    if (!descripcion.trim()) { setError('Describe qué hiciste.'); return; }
    setGuardando(true);
    setError('');
    try {
      await createTicket({ categoria, descripcion });
      setDescripcion('');
      cargar();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo registrar.');
    } finally {
      setGuardando(false);
    }
  };

  const handleDelete = async (t) => {
    if (!confirm('¿Eliminar este registro de la bitácora?')) return;
    setDeleting(t.id);
    await deleteTicket(t.id);
    setTickets(prev => prev.filter(x => x.id !== t.id));
    setDeleting(null);
  };

  const filtrados = tickets.filter(t =>
    !filtro ||
    t.descripcion.toLowerCase().includes(filtro.toLowerCase()) ||
    t.usuario_nombre.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <div className="tickets-page">
      <div className="tickets-header">
        <div>
          <h2 className="tickets-title">Tickets</h2>
          <p className="tickets-sub">Bitácora de servicios ya realizados por IT: qué se hizo, quién y cuándo</p>
        </div>
        <input
          className="form-input search-input"
          placeholder="Buscar en la bitácora..."
          value={filtro}
          onChange={e => setFiltro(e.target.value)}
          style={{ width: 220 }}
        />
      </div>

      {puedeRegistrar && (
        <form className="ticket-alta card" onSubmit={handleRegistrar}>
          <select className="form-input" value={categoria} onChange={e => setCategoria(e.target.value)} style={{ maxWidth: 220 }}>
            {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <input
            className="form-input ticket-alta-desc"
            placeholder="Ej: Cambio de audífonos a Juan Pérez, piso 3"
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={guardando}>
            <PlusCircle size={14} /> {guardando ? 'Registrando...' : 'Registrar'}
          </button>
        </form>
      )}
      {error && <div className="form-error" style={{ marginBottom: 16 }}>{error}</div>}

      {loading ? (
        <div className="tickets-lista">
          {[1, 2, 3].map(i => (
            <div key={i} className="ticket-card card">
              <div className="skeleton-bar" style={{ width: '60%' }} />
              <div className="skeleton-bar" style={{ width: '30%', height: 10 }} />
            </div>
          ))}
        </div>
      ) : filtrados.length === 0 ? (
        <div className="table-empty">
          <TicketIcon size={28} />
          <p>{tickets.length === 0 ? 'Todavía no hay nada registrado en la bitácora.' : 'Nada coincide con la búsqueda.'}</p>
        </div>
      ) : (
        <div className="tickets-lista">
          {filtrados.map(t => {
            const { label, Icon } = CATEGORIA_META[t.categoria] || CATEGORIAS[CATEGORIAS.length - 1];
            return (
              <div key={t.id} className="ticket-card card">
                <div className="ticket-card-icon"><Icon size={16} /></div>
                <div className="ticket-card-cuerpo">
                  <div className="ticket-card-top">
                    <span className="ticket-categoria">{label}</span>
                    {esAdmin && (
                      <button className="btn btn-ghost btn-sm danger-btn" title="Eliminar"
                        disabled={deleting === t.id} onClick={() => handleDelete(t)}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                  <p className="ticket-desc">{t.descripcion}</p>
                  <p className="ticket-meta">{t.usuario_nombre} · {fmtFechaHora(t.created_at)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { Search, Laptop, User, CheckSquare, X } from 'lucide-react';
import { getEquipos, getAgentesTablero, getTareas } from '../api';
import './GlobalSearch.css';

export default function GlobalSearch({ onClose, onOpenEquipo, onGoToTab }) {
  const [query, setQuery] = useState('');
  const [equiposRes, setEquiposRes] = useState([]);
  const [agentesTodos, setAgentesTodos] = useState([]);
  const [tareasTodos, setTareasTodos] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    getAgentesTablero().then(d => {
      const flat = [];
      Object.entries(d.tablero || {}).forEach(([piso, mesas]) => {
        Object.values(mesas).forEach(lista => {
          lista.forEach(a => flat.push({ nombre: a.nombre, piso }));
        });
      });
      setAgentesTodos(flat);
    });
    getTareas().then(setTareasTodos);
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (!query.trim()) { setEquiposRes([]); return; }
    const t = setTimeout(() => {
      getEquipos({ search: query.trim() }).then(d => setEquiposRes(d.slice(0, 6)));
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  const q = query.trim().toLowerCase();
  const agentesRes = q
    ? agentesTodos.filter(a => a.nombre.toLowerCase().includes(q)).slice(0, 6)
    : [];
  const tareasRes = q
    ? tareasTodos.filter(t =>
        t.titulo.toLowerCase().includes(q) ||
        (t.asignado_nombre || '').toLowerCase().includes(q)
      ).slice(0, 6)
    : [];

  const sinResultados = q && equiposRes.length === 0 && agentesRes.length === 0 && tareasRes.length === 0;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box global-search-box">
        <div className="global-search-input-wrap">
          <Search size={16} className="global-search-icon" />
          <input
            ref={inputRef}
            className="global-search-input"
            placeholder="Buscar equipos, agentes o tareas..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="global-search-body">
          {!q ? (
            <p className="global-search-hint">Escribí para buscar en todo el sistema.</p>
          ) : sinResultados ? (
            <p className="global-search-hint">Sin resultados para "{query}".</p>
          ) : (
            <>
              {equiposRes.length > 0 && (
                <div className="global-search-grupo">
                  <span className="global-search-grupo-titulo">Equipos</span>
                  {equiposRes.map(eq => (
                    <div key={eq.id} className="global-search-item"
                      onClick={() => { onOpenEquipo(eq.id); onClose(); }}>
                      <Laptop size={14} className="global-search-item-icon" />
                      <span className="global-search-item-texto">
                        {eq.marca_modelo || 'Sin modelo'} <span className="global-search-item-sub">· {eq.id_activo || eq.numero_serie || '—'} · {eq.piso || 'Sin piso'}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {agentesRes.length > 0 && (
                <div className="global-search-grupo">
                  <span className="global-search-grupo-titulo">Agentes</span>
                  {agentesRes.map(a => (
                    <div key={a.nombre} className="global-search-item"
                      onClick={() => { onGoToTab('agentes'); onClose(); }}>
                      <User size={14} className="global-search-item-icon" />
                      <span className="global-search-item-texto">
                        {a.nombre} <span className="global-search-item-sub">· {a.piso}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {tareasRes.length > 0 && (
                <div className="global-search-grupo">
                  <span className="global-search-grupo-titulo">Tareas</span>
                  {tareasRes.map(t => (
                    <div key={t.id} className="global-search-item"
                      onClick={() => { onGoToTab('tareas'); onClose(); }}>
                      <CheckSquare size={14} className="global-search-item-icon" />
                      <span className="global-search-item-texto">
                        {t.titulo} <span className="global-search-item-sub">· {t.estado}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

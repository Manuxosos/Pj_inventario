import { useState, useEffect } from 'react';
import { Users, Layers } from 'lucide-react';
import { getAgentesEdificios } from '../api';
import EdificioIso from './EdificioIso';
import EdificioPopup from './EdificioPopup';
import './Agentes.css';

// Vista de Agentes: un icono 3D por edificio. Al hacer click se abre su
// ventana con los pisos y, dentro de cada piso, las mesas y agentes.
export default function Agentes({ rol, esGlobal, onOpenEquipo, onEditEquipo, onGoToInventario, refresh, showToast }) {
  const [edificios, setEdificios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [abierto, setAbierto] = useState(null); // { edificio, origen: {x, y} }

  const cargar = () => getAgentesEdificios().then(d => { setEdificios(d); setLoading(false); });
  useEffect(() => { cargar(); }, [refresh]);

  const abrir = (ed, e) => {
    // La ventana crece desde el icono: se guarda su desplazamiento respecto
    // del centro de la pantalla.
    const r = e.currentTarget.getBoundingClientRect();
    setAbierto({
      edificio: ed,
      origen: { x: r.left + r.width / 2 - window.innerWidth / 2, y: r.top + r.height / 2 - window.innerHeight / 2 },
    });
  };

  return (
    <div className="agentes-page">
      <div className="agentes-header">
        <div>
          <h2 className="agentes-title">Agentes por edificio</h2>
          <p className="agentes-sub">Elige un edificio para ver sus pisos, mesas y agentes.</p>
        </div>
      </div>

      {loading ? (
        <div className="edificios-grid">
          {[1, 2, 3, 4].map(i => <div key={i} className="edificio-card card"><div className="skeleton-bar" style={{ height: 170, borderRadius: 12 }} /></div>)}
        </div>
      ) : edificios.length === 0 ? (
        <div className="table-empty">
          <p>No hay edificios con agentes todavía.</p>
          {onGoToInventario && <button className="btn btn-primary btn-sm" onClick={onGoToInventario}>Ir a Inventario</button>}
        </div>
      ) : (
        <div className="edificios-grid">
          {edificios.map((ed, i) => (
            <button
              key={ed.id}
              className={`edificio-card card ${abierto?.edificio.id === ed.id ? 'edificio-card-abierta' : ''}`}
              style={{ '--i': i }}
              onClick={(e) => abrir(ed, e)}
            >
              <span className="edificio-escena">
                <EdificioIso nombre={ed.nombre} pisos={ed.pisos.length || 1} size={150} />
              </span>
              <span className="edificio-nombre">{ed.nombre}</span>
              <span className="edificio-datos">
                <span><Users size={13} /> {ed.agentes} agentes</span>
                <span><Layers size={13} /> {ed.pisos.length} {ed.pisos.length === 1 ? 'piso' : 'pisos'}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {abierto && (
        <EdificioPopup
          edificio={abierto.edificio}
          origen={abierto.origen}
          edificios={edificios}
          rol={rol}
          esGlobal={esGlobal}
          onClose={() => setAbierto(null)}
          onCambio={cargar}
          onOpenEquipo={onOpenEquipo}
          onEditEquipo={onEditEquipo}
          showToast={showToast}
        />
      )}
    </div>
  );
}

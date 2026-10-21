import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown, ArrowRightLeft, Users } from 'lucide-react';
import { getAgentesTablero, moverAgente, setCapacidadMesa, trasladarAgente } from '../api';
import AgenteInfoModal from './AgenteInfoModal';
import EdificioIso from './EdificioIso';
import { metaEstado, ESTADOS_EQUIPO } from '../semantica';
import { LeyendaEstados, IconoUbicacion } from './Etiquetas';
import './EdificioPopup.css';

function iniciales(nombre) {
  return nombre.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

function splitFilas(agentes) {
  const mitad = Math.ceil(agentes.length / 2);
  return { arriba: agentes.slice(0, mitad), abajo: agentes.slice(mitad) };
}

// Orden natural de pisos ("PISO 2" antes que "PISO 10"); de arriba hacia
// abajo como en un corte del edificio.
const ordenPisos = (lista) => [...lista].sort((a, b) => b.localeCompare(a, 'es', { numeric: true }));

function Asiento({ nombre, estado, draggable, dragging, onDragStart, onDragEnd, onClick }) {
  // El color del asiento es el del estado del equipo asignado al agente
  // (el mismo de las etiquetas del inventario), con su icono en la esquina.
  const { color, Icon, desc } = metaEstado(estado);
  return (
    <div
      className={`asiento ${draggable ? 'asiento-draggable' : 'asiento-clickable'} ${dragging ? 'asiento-dragging' : ''}`}
      draggable={draggable}
      onDragStart={draggable ? onDragStart : undefined}
      onDragEnd={draggable ? onDragEnd : undefined}
      onClick={onClick}
      title={`${nombre} · ${estado || 'Sin estado'} (${desc})`}
      style={{ '--agente-color': color }}
    >
      <span className="asiento-anillo">
        <span className="asiento-avatar">{iniciales(nombre)}</span>
        <span className="asiento-estado"><Icon size={9} /></span>
      </span>
      <span className="asiento-nombre">{nombre}</span>
    </div>
  );
}

// Ventana de un edificio: se abre creciendo desde su icono, muestra los pisos
// apilados y cada piso se despliega con sus mesas y agentes. Arrastrar un
// agente a otra mesa (o a otro piso desplegado) lo mueve como antes; soltarlo
// sobre otro edificio de la barra superior abre el traslado / intercambio.
export default function EdificioPopup({ edificio, origen, edificios, rol, esGlobal, onClose, onCambio, onOpenEquipo, onEditEquipo, showToast }) {
  const puedeMover = rol === 'admin' || rol === 'it';
  const puedeTrasladar = rol === 'admin' && esGlobal;
  const [tablero, setTablero] = useState({});
  const [pisos, setPisos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [abiertos, setAbiertos] = useState(new Set());
  const [dragOver, setDragOver] = useState(null);      // `${piso}|${mesa}` o `ed:${id}`
  const [dragging, setDragging] = useState(null);      // { agente, piso, mesa }
  const [moviendo, setMoviendo] = useState(false);
  const [agenteSel, setAgenteSel] = useState(null);
  const [capacidad, setCapacidad] = useState(7);
  const [capacidadInput, setCapacidadInput] = useState('7');
  const [traslado, setTraslado] = useState(null);      // { agente, piso, mesa, destino }
  const [cerrando, setCerrando] = useState(false);
  const primeraCarga = useRef(true);

  const cargar = () => getAgentesTablero(edificio.id).then(d => {
    setTablero(d.tablero || {});
    const lista = ordenPisos(d.pisos || []);
    setPisos(lista);
    setCapacidad(d.capacidadMesa || 7);
    setCapacidadInput(String(d.capacidadMesa || 7));
    // Al abrir, el piso de arriba queda desplegado para mostrar el contenido
    if (primeraCarga.current && lista.length) setAbiertos(new Set([lista[0]]));
    primeraCarga.current = false;
    setLoading(false);
  });

  useEffect(() => { cargar(); }, [edificio.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const cerrar = () => {
    if (cerrando) return;
    setCerrando(true);
    const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTimeout(onClose, reducido ? 0 : 240);
  };

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !agenteSel && !traslado) cerrar(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const togglePiso = (piso) => setAbiertos(prev => {
    const s = new Set(prev);
    if (s.has(piso)) s.delete(piso); else s.add(piso);
    return s;
  });

  const handleDragStart = (e, agente, piso, mesa) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ agente, piso, mesa }));
    e.dataTransfer.effectAllowed = 'move';
    setDragging({ agente, piso, mesa });
  };
  const handleDragEnd = () => { setDragging(null); setDragOver(null); };

  const leerDrag = (e) => {
    const data = e.dataTransfer.getData('application/json');
    return data ? JSON.parse(data) : null;
  };

  const handleDropMesa = async (e, pisoDestino, mesaDestino) => {
    e.preventDefault();
    setDragOver(null);
    const d = leerDrag(e);
    if (!d || (d.piso === pisoDestino && d.mesa === mesaDestino)) return;
    setMoviendo(true);
    try {
      await moverAgente(d.agente, pisoDestino, mesaDestino, edificio.id);
      await cargar();
      onCambio?.();
    } finally {
      setMoviendo(false);
    }
  };

  const handleDropEdificio = (e, destino) => {
    e.preventDefault();
    setDragOver(null);
    const d = leerDrag(e);
    if (d) setTraslado({ ...d, destino });
  };

  const handleGuardarCapacidad = async () => {
    const n = parseInt(capacidadInput);
    if (!Number.isInteger(n) || n < 1 || n > 50) return;
    await setCapacidadMesa(n, edificio.id);
    cargar();
  };

  const otros = edificios.filter(ed => ed.id !== edificio.id);
  const totalAgentes = pisos.reduce((s, p) => s + Object.values(tablero[p] || {}).reduce((t, m) => t + m.length, 0), 0);

  // Portal al body: la sección vive dentro de un contenedor animado que crea
  // su propio contexto de apilamiento y dejaría la ventana bajo la barra.
  return createPortal(
    <div className={`edp-overlay ${cerrando ? 'edp-cerrando' : ''}`} onClick={e => e.target === e.currentTarget && cerrar()}>
      <div
        className="edp-caja"
        role="dialog"
        aria-modal="true"
        aria-label={`Edificio ${edificio.nombre}`}
        style={{ '--ox': `${origen?.x ?? 0}px`, '--oy': `${origen?.y ?? 0}px` }}
      >
        <header className="edp-header">
          <div className="edp-titulo">
            <EdificioIso nombre={edificio.nombre} pisos={edificio.pisos?.length || 1} size={64} activo />
            <div>
              <h2>{edificio.nombre}</h2>
              <p className="edp-sub">
                <Users size={13} /> {totalAgentes} agentes · {pisos.length} {pisos.length === 1 ? 'piso' : 'pisos'}
              </p>
            </div>
          </div>
          <div className="edp-controles">
            {puedeMover && (
              <label className="edp-capacidad">
                Agentes por mesa
                <input type="number" min="1" max="50" className="form-input" value={capacidadInput}
                  onChange={e => setCapacidadInput(e.target.value)} />
                <button className="btn btn-secondary btn-sm" onClick={handleGuardarCapacidad}
                  disabled={parseInt(capacidadInput) === capacidad}>Guardar</button>
              </label>
            )}
            <button className="modal-close" onClick={cerrar} aria-label="Cerrar"><X size={18} /></button>
          </div>
        </header>

        <div className="edp-barra">
          <LeyendaEstados estados={Object.keys(ESTADOS_EQUIPO)} />
          {puedeTrasladar && otros.length > 0 && (
            <div className={`edp-destinos ${dragging ? 'edp-destinos-activos' : ''}`}>
              <span className="edp-destinos-label"><ArrowRightLeft size={13} /> Arrastra un agente a otro edificio para trasladarlo</span>
              <div className="edp-destinos-lista">
                {otros.map(ed => (
                  <div
                    key={ed.id}
                    className={`edp-destino ${dragOver === `ed:${ed.id}` ? 'edp-destino-over' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(`ed:${ed.id}`); }}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={(e) => handleDropEdificio(e, ed)}
                  >
                    <EdificioIso nombre={ed.nombre} pisos={ed.pisos?.length || 1} size={34} />
                    {ed.nombre}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="edp-cuerpo">
          {loading ? (
            <div className="skeleton-bar" style={{ height: 160, borderRadius: 14 }} />
          ) : pisos.length === 0 ? (
            <p className="edp-vacio">Este edificio no tiene agentes con equipos asignados a un piso.</p>
          ) : (
            pisos.map((piso, idx) => {
              const abierto = abiertos.has(piso);
              const mesasUsadas = Object.keys(tablero[piso] || {}).map(Number);
              const maxMesa = mesasUsadas.length ? Math.max(...mesasUsadas) : 1;
              // una mesa vacía extra al final permite crear una mesa nueva arrastrando
              const mesas = Array.from({ length: maxMesa + (puedeMover ? 1 : 0) }, (_, i) => i + 1);
              const nAgentes = Object.values(tablero[piso] || {}).reduce((t, m) => t + m.length, 0);
              return (
                <section key={piso} className={`edp-piso ${abierto ? 'edp-piso-abierto' : ''}`} style={{ '--i': idx }}>
                  <button className="edp-piso-losa" onClick={() => togglePiso(piso)} aria-expanded={abierto}>
                    <IconoUbicacion piso={piso} size={16} />
                    <span className="edp-piso-nombre">{piso}</span>
                    <span className="edp-piso-meta">{nAgentes} agentes · {maxMesa} {maxMesa === 1 ? 'mesa' : 'mesas'}</span>
                    <ChevronDown size={16} className="edp-piso-chevron" />
                  </button>
                  <div className="edp-piso-contenido">
                    <div className="edp-piso-interior">
                      <div className="agentes-mesas">
                        {mesas.map(mesa => {
                          const key = `${piso}|${mesa}`;
                          const agentes = tablero[piso]?.[mesa] || [];
                          const { arriba, abajo } = splitFilas(agentes);
                          const fila = (lista) => lista.map(a => (
                            <Asiento key={a.nombre} nombre={a.nombre} estado={a.estado} draggable={puedeMover}
                              dragging={dragging?.agente === a.nombre}
                              onDragStart={(e) => handleDragStart(e, a.nombre, piso, mesa)}
                              onDragEnd={handleDragEnd}
                              onClick={() => setAgenteSel({ nombre: a.nombre, piso, mesa })} />
                          ));
                          return (
                            <div key={mesa} className="mesa-bloque">
                              <div className="mesa-label">Mesa {mesa}</div>
                              <div
                                className={`mesa-visual ${dragOver === key ? 'mesa-visual-over' : ''}`}
                                onDragOver={puedeMover ? (e) => { e.preventDefault(); setDragOver(key); } : undefined}
                                onDragLeave={puedeMover ? () => setDragOver(null) : undefined}
                                onDrop={puedeMover ? (e) => handleDropMesa(e, piso, mesa) : undefined}
                              >
                                {agentes.length === 0 ? (
                                  <span className="mesa-vacia">{puedeMover ? 'Suelta aquí para crear esta mesa' : 'Sin agentes'}</span>
                                ) : (
                                  <>
                                    <div className="mesa-fila mesa-fila-arriba">{fila(arriba)}</div>
                                    <div className="mesa-tablero" />
                                    <div className="mesa-fila mesa-fila-abajo">{fila(abajo)}</div>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </section>
              );
            })
          )}
        </div>

        {moviendo && <div className="agentes-moviendo">Moviendo agente...</div>}
      </div>

      {agenteSel && (
        <AgenteInfoModal
          nombre={agenteSel.nombre}
          piso={agenteSel.piso}
          mesa={agenteSel.mesa}
          onClose={() => setAgenteSel(null)}
          onOpenEquipo={onOpenEquipo}
          onEditEquipo={onEditEquipo}
        />
      )}

      {traslado && (
        <TrasladoDialog
          traslado={traslado}
          origen={edificio}
          onClose={() => setTraslado(null)}
          onHecho={async (msg) => {
            setTraslado(null);
            await cargar();
            onCambio?.();
            showToast?.(msg);
          }}
        />
      )}
    </div>,
    document.body
  );
}

// Confirmación del traslado: elegir el piso de destino y, si se quiere, un
// agente de ese piso con quien intercambiarse.
function TrasladoDialog({ traslado, origen, onClose, onHecho }) {
  const { agente, destino } = traslado;
  const [destTablero, setDestTablero] = useState(null);
  const [piso, setPiso] = useState('');
  const [modo, setModo] = useState('trasladar'); // 'trasladar' | 'intercambiar'
  const [conQuien, setConQuien] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getAgentesTablero(destino.id).then(d => {
      setDestTablero(d);
      const lista = ordenPisos(d.pisos || []);
      setPiso(lista.includes(traslado.piso) ? traslado.piso : (lista[0] || traslado.piso));
    });
  }, [destino.id, traslado.piso]);

  const pisosDestino = destTablero ? ordenPisos(destTablero.pisos || []) : [];
  const agentesPiso = destTablero && piso
    ? Object.values(destTablero.tablero?.[piso] || {}).flat().map(a => a.nombre).sort((a, b) => a.localeCompare(b, 'es'))
    : [];

  const confirmar = async () => {
    if (!piso.trim()) { setError('Elige o escribe el piso de destino.'); return; }
    if (modo === 'intercambiar' && !conQuien) { setError('Elige con qué agente intercambiar.'); return; }
    setGuardando(true);
    setError('');
    try {
      const r = await trasladarAgente({
        agente, origen: origen.id, destino: destino.id, piso: piso.trim(),
        intercambiarCon: modo === 'intercambiar' ? conQuien : undefined,
      });
      onHecho(r.intercambio
        ? `${agente} y ${conQuien} intercambiados (${r.equipos} equipos movidos)`
        : `${agente} trasladado a ${destino.nombre} (${r.equipos} equipos movidos)`);
    } catch (err) {
      setError(err?.response?.data?.error || 'No se pudo completar el traslado.');
      setGuardando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box traslado-box" role="dialog" aria-modal="true" aria-label="Trasladar agente">
        <div className="modal-header">
          <h2>Trasladar agente</h2>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        </div>
        <div className="modal-body traslado-cuerpo">
          <div className="traslado-ruta">
            <div className="traslado-ed"><EdificioIso nombre={origen.nombre} pisos={origen.pisos?.length || 1} size={56} /><span>{origen.nombre}</span><small>{traslado.piso} · Mesa {traslado.mesa}</small></div>
            <ArrowRightLeft size={22} className="traslado-flecha" />
            <div className="traslado-ed"><EdificioIso nombre={destino.nombre} pisos={destino.pisos?.length || 1} size={56} activo /><span>{destino.nombre}</span><small>{piso || '—'}</small></div>
          </div>
          <p className="traslado-agente"><strong>{agente}</strong> y todos sus equipos pasarán a {destino.nombre}. Cada equipo quedará registrado en el historial.</p>

          <div className="traslado-modos" role="radiogroup" aria-label="Tipo de cambio">
            <label className={`traslado-modo ${modo === 'trasladar' ? 'activo' : ''}`}>
              <input type="radio" name="modo" checked={modo === 'trasladar'} onChange={() => setModo('trasladar')} />
              Solo trasladar
            </label>
            <label className={`traslado-modo ${modo === 'intercambiar' ? 'activo' : ''}`}>
              <input type="radio" name="modo" checked={modo === 'intercambiar'} onChange={() => setModo('intercambiar')} />
              Intercambiar con un agente de {destino.nombre}
            </label>
          </div>

          <div className="form-group">
            <label htmlFor="traslado-piso">Piso de destino</label>
            {destTablero === null ? (
              <div className="skeleton-bar" style={{ height: 36 }} />
            ) : pisosDestino.length ? (
              <select id="traslado-piso" className="form-input" value={piso} onChange={e => { setPiso(e.target.value); setConQuien(''); }}>
                {pisosDestino.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            ) : (
              <input id="traslado-piso" className="form-input" value={piso} onChange={e => setPiso(e.target.value)} placeholder="Ej: PISO 1" />
            )}
          </div>

          {modo === 'intercambiar' && (
            <div className="form-group">
              <label htmlFor="traslado-con">Agente que pasa a {origen.nombre}</label>
              <select id="traslado-con" className="form-input" value={conQuien} onChange={e => setConQuien(e.target.value)}>
                <option value="">Elige un agente de {piso || 'ese piso'}</option>
                {agentesPiso.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              {conQuien && <small className="text-muted">{conQuien} toma {traslado.piso}, mesa {traslado.mesa}, en {origen.nombre}.</small>}
            </div>
          )}

          {error && <p className="traslado-error">{error}</p>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={guardando}>Cancelar</button>
          <button className="btn btn-primary" onClick={confirmar} disabled={guardando || destTablero === null}>
            <ArrowRightLeft size={14} /> {guardando ? 'Trasladando...' : modo === 'intercambiar' ? 'Intercambiar' : 'Trasladar'}
          </button>
        </div>
      </div>
    </div>
  );
}

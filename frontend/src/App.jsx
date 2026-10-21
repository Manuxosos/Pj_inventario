import { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { Home, LayoutDashboard, ClipboardList, Users, CheckSquare, PlusCircle, Monitor, LogOut, Armchair, Search, Building2, Menu, X } from 'lucide-react';
import Login from './components/Login';
import { getEquipo, getEdificios, setEdificioActivo } from './api';
import Toast from './components/Toast';
import { colorAgente } from './agenteColor';
import './App.css';

// Carga diferida: cada pestaña (y sus dependencias pesadas, como recharts
// en Dashboard) se descarga recien cuando se necesita, en vez de ir toda
// junta en el bundle inicial.
const EquiposList  = lazy(() => import('./components/EquiposList'));
const EquipoModal  = lazy(() => import('./components/EquipoModal'));
const Inicio       = lazy(() => import('./components/Inicio'));
const Dashboard    = lazy(() => import('./components/Dashboard'));
const Usuarios     = lazy(() => import('./components/Usuarios'));
const Tareas       = lazy(() => import('./components/Tareas'));
const Agentes      = lazy(() => import('./components/Agentes'));
const GlobalSearch = lazy(() => import('./components/GlobalSearch'));

const INACTIVIDAD_MS = 15 * 60 * 1000;
// El edificio elegido se recuerda en la pestaña del navegador para que
// recargar una sección (F5) no vuelva a "Todos los edificios".
const EDIFICIO_KEY = 'edificioSel';

function iniciales(nombre) {
  return nombre.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

function getUserInfo() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

function leerEdificioGuardado() {
  const v = sessionStorage.getItem(EDIFICIO_KEY);
  const id = v ? parseInt(v) : null;
  setEdificioActivo(id);
  return id;
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [autenticado, setAutenticado] = useState(!!localStorage.getItem('token'));
  const [modal, setModal] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [toast, setToast] = useState(null); // { message, type }
  const [buscadorAbierto, setBuscadorAbierto] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);

  const userInfo = autenticado ? getUserInfo() : null;
  const rol      = userInfo?.rol || 'observador';
  const puedeEditar  = rol === 'admin' || rol === 'it';
  const esAdmin      = rol === 'admin';
  // Alcance global (Fase 2): cuentas sin edificio_id fijo ven todos los
  // edificios y pueden elegir cuál mirar. Admin siempre es global; un
  // observador puede ser global (Santiago) o limitado a un solo edificio.
  const esGlobal     = !!userInfo && userInfo.edificio_id == null;
  const [edificios, setEdificios]   = useState([]);
  const [edificioSel, setEdificioSel] = useState(leerEdificioGuardado); // null = "Todos los edificios"

  const enInventario = location.pathname === '/inventario';

  // Ir a una sección. `filtros` viaja en el estado del historial, así el
  // Inventario abre filtrado desde el Dashboard y lo sigue estando al
  // recargar o al volver con el botón Atrás.
  const irA = (seccion, filtros = null) => {
    setMenuAbierto(false);
    navigate(`/${seccion}`, { state: { filtros } });
  };

  const handleDashboardNav = (filter) => irA('inventario', filter);

  const handleOpenEquipo = async (equipoId) => {
    try {
      const equipo = await getEquipo(equipoId);
      setModal({ mode: 'view', equipo });
    } catch {
      showToast('No se pudo abrir el equipo', 'error');
    }
  };

  const handleEditEquipo = async (equipoId) => {
    try {
      const equipo = await getEquipo(equipoId);
      setModal({ mode: 'edit', equipo });
    } catch {
      showToast('No se pudo abrir el equipo', 'error');
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
  }, []);

  useEffect(() => {
    if (!autenticado) return;
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setBuscadorAbierto(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [autenticado]);

  useEffect(() => {
    if (!esGlobal) return;
    getEdificios().then(setEdificios).catch(() => {});
  }, [esGlobal]);

  // Logout automático por inactividad (15 min sin mouse/teclado/scroll).
  useEffect(() => {
    if (!autenticado) return;
    let timeoutId;
    const cerrarPorInactividad = () => {
      localStorage.removeItem('token');
      sessionStorage.setItem('sesionExpirada', 'inactividad');
      setAutenticado(false);
    };
    const reiniciarTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(cerrarPorInactividad, INACTIVIDAD_MS);
    };
    const eventos = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    eventos.forEach(e => window.addEventListener(e, reiniciarTimer));
    reiniciarTimer();
    return () => {
      clearTimeout(timeoutId);
      eventos.forEach(e => window.removeEventListener(e, reiniciarTimer));
    };
  }, [autenticado]);

  // Al iniciar sesión siempre se entra por la página de Inicio.
  if (!autenticado) {
    return <Login onLogin={() => { setAutenticado(true); navigate('/inicio', { replace: true }); }} />;
  }

  const handleEdificioChange = (valor) => {
    const id = valor === '' ? null : parseInt(valor);
    setEdificioSel(id);
    setEdificioActivo(id);
    if (id == null) sessionStorage.removeItem(EDIFICIO_KEY);
    else sessionStorage.setItem(EDIFICIO_KEY, String(id));
    setRefresh(r => r + 1);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem(EDIFICIO_KEY);
    setEdificioActivo(null);
    setEdificioSel(null);
    setAutenticado(false);
  };

  const showToast = (message, type = 'success') => setToast({ message, type });

  const handleSaved = (msg = 'Guardado correctamente') => {
    setModal(null);
    setRefresh(r => r + 1);
    showToast(msg);
  };

  const navClass = ({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`;
  const cerrarMenu = () => setMenuAbierto(false);

  const userBadge = userInfo && (
    <div className="user-badge">
      <div
        className="user-badge-avatar"
        style={{ '--avatar-color': colorAgente() }}
      >
        {iniciales(userInfo.nombre || userInfo.usuario)}
      </div>
      <div>
        <div className="user-badge-name">{userInfo.nombre || userInfo.usuario}</div>
        <div className="user-badge-rol">{rol}</div>
      </div>
    </div>
  );

  const header = (
    <header className="app-header">
      <div className="header-inner">

        <Link to="/inicio" className="header-brand" onClick={cerrarMenu} title="Volver al inicio">
          <Monitor size={26} color="#60a5fa" />
          <h1>OfficeTech</h1>
        </Link>

        <button
          className="header-menu-toggle"
          onClick={() => setMenuAbierto(m => !m)}
          aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
        >
          {menuAbierto ? <X size={20} /> : <Menu size={20} />}
        </button>

        <div className={`header-collapsible ${menuAbierto ? 'header-collapsible-open' : ''}`}>

          {esGlobal && (
            <div className="edificio-selector" title="Edificio">
              <Building2 size={15} />
              <select
                className="form-input"
                value={edificioSel ?? ''}
                onChange={e => handleEdificioChange(e.target.value)}
                style={{ width: 'auto', padding: '4px 8px' }}
              >
                <option value="">Todos los edificios</option>
                {edificios.map(ed => (
                  <option key={ed.id} value={ed.id}>{ed.nombre}</option>
                ))}
              </select>
            </div>
          )}

          <nav className="header-nav">
            <NavLink to="/inicio" className={navClass} onClick={cerrarMenu}>
              <Home size={15} /> Inicio
            </NavLink>
            <NavLink to="/dashboard" className={navClass} onClick={cerrarMenu}>
              <LayoutDashboard size={15} /> Dashboard
            </NavLink>
            <NavLink to="/inventario" state={{ filtros: null }} className={navClass} onClick={cerrarMenu}>
              <ClipboardList size={15} /> Inventario
            </NavLink>
            <NavLink to="/tareas" className={navClass} onClick={cerrarMenu}>
              <CheckSquare size={15} /> Tareas
            </NavLink>
            <NavLink to="/agentes" className={navClass} onClick={cerrarMenu}>
              <Armchair size={15} /> Agentes
            </NavLink>
            {esAdmin && (
              <NavLink to="/usuarios" className={navClass} onClick={cerrarMenu}>
                <Users size={15} /> Usuarios
              </NavLink>
            )}
          </nav>

          <div className="header-actions">
            <button className="btn-icon-neon" onClick={() => { setBuscadorAbierto(true); cerrarMenu(); }} title="Buscar (Ctrl+K)" aria-label="Buscar (Ctrl+K)">
              <Search size={16} />
            </button>
            {userBadge}
            {enInventario && puedeEditar && (!esGlobal || edificioSel != null) && (
              <button className="btn btn-primary" onClick={() => { setModal({ mode: 'create' }); cerrarMenu(); }}>
                <PlusCircle size={14} /> Nuevo Equipo
              </button>
            )}
            <button className="btn-icon-neon" onClick={handleLogout} title="Cerrar sesión" aria-label="Cerrar sesión">
              <LogOut size={16} />
            </button>
          </div>

        </div>

      </div>
    </header>
  );

  // Cada sección vive en su propia dirección; la barra superior solo
  // aparece dentro de las secciones, no en la página de Inicio.
  const seccion = (contenido) => (
    <>
      {header}
      <main className="app-main">
        <div key={location.key} className="tab-fade">
          <Suspense fallback={<div className="tab-suspense-fallback">Cargando…</div>}>
            {contenido}
          </Suspense>
        </div>
      </main>
    </>
  );

  return (
    <div className="app">
      <Routes>
        <Route path="/inicio" element={
          <Suspense fallback={<div className="tab-suspense-fallback">Cargando…</div>}>
            <Inicio onGoToTab={(t) => irA(t)} userBadge={userBadge} onLogout={handleLogout} />
          </Suspense>
        } />
        <Route path="/dashboard" element={seccion(
          <Dashboard
            onNavigate={handleDashboardNav}
            onOpenEquipo={handleOpenEquipo}
            refresh={refresh}
            rol={rol}
            esGlobal={esGlobal}
            edificioSel={edificioSel}
          />
        )} />
        <Route path="/inventario" element={seccion(
          <EquiposList
            refresh={refresh}
            externalFilters={location.state?.filtros ?? null}
            rol={rol}
            esGlobal={esGlobal}
            edificioSel={edificioSel}
            onEdit={puedeEditar ? (equipo) => setModal({ mode: 'edit', equipo }) : undefined}
            onView={(equipo) => setModal({ mode: 'view', equipo })}
            onCreate={puedeEditar ? () => setModal({ mode: 'create' }) : undefined}
            showToast={showToast}
          />
        )} />
        <Route path="/tareas" element={seccion(<Tareas rol={rol} miId={userInfo?.id} refresh={refresh} />)} />
        <Route path="/agentes" element={seccion(
          <Agentes
            rol={rol}
            esGlobal={esGlobal}
            showToast={showToast}
            onOpenEquipo={handleOpenEquipo}
            onEditEquipo={puedeEditar ? handleEditEquipo : undefined}
            onGoToInventario={() => irA('inventario')}
            refresh={refresh}
          />
        )} />
        <Route path="/usuarios" element={
          esAdmin ? seccion(<Usuarios miId={userInfo?.id} refresh={refresh} />) : <Navigate to="/inicio" replace />
        } />
        <Route path="*" element={<Navigate to="/inicio" replace />} />
      </Routes>

      {modal && (
        <Suspense fallback={null}>
          <EquipoModal
            mode={modal.mode}
            equipo={modal.equipo}
            rol={rol}
            onClose={() => setModal(null)}
            onSaved={handleSaved}
          />
        </Suspense>
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {buscadorAbierto && (
        <Suspense fallback={null}>
          <GlobalSearch
            onClose={() => setBuscadorAbierto(false)}
            onOpenEquipo={handleOpenEquipo}
            onGoToTab={(t) => irA(t)}
          />
        </Suspense>
      )}
    </div>
  );
}

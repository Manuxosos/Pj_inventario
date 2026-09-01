import { useState, useEffect, lazy, Suspense } from 'react';
import { LayoutDashboard, ClipboardList, Users, CheckSquare, PlusCircle, Monitor, LogOut, Armchair, Search, Building2, Menu, X } from 'lucide-react';
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
const Dashboard    = lazy(() => import('./components/Dashboard'));
const Usuarios     = lazy(() => import('./components/Usuarios'));
const Tareas       = lazy(() => import('./components/Tareas'));
const Agentes      = lazy(() => import('./components/Agentes'));
const GlobalSearch = lazy(() => import('./components/GlobalSearch'));

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

export default function App() {
  const [autenticado, setAutenticado] = useState(!!localStorage.getItem('token'));
  const [tab, setTab] = useState('dashboard');
  const [modal, setModal] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [dashboardFilter, setDashboardFilter] = useState(null);
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
  const [edificioSel, setEdificioSel] = useState(null); // null = "Todos los edificios"

  const handleDashboardNav = (filter) => {
    setDashboardFilter(filter);
    setTab('inventario');
  };

  const handleOpenEquipo = async (equipoId) => {
    try {
      const equipo = await getEquipo(equipoId);
      setModal({ mode: 'view', equipo });
    } catch (err) {
      showToast('No se pudo abrir el equipo', 'error');
    }
  };

  const handleEditEquipo = async (equipoId) => {
    try {
      const equipo = await getEquipo(equipoId);
      setModal({ mode: 'edit', equipo });
    } catch (err) {
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

  if (!autenticado) return <Login onLogin={() => setAutenticado(true)} />;

  const handleEdificioChange = (valor) => {
    const id = valor === '' ? null : parseInt(valor);
    setEdificioSel(id);
    setEdificioActivo(id);
    setRefresh(r => r + 1);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setAutenticado(false);
  };

  const showToast = (message, type = 'success') => setToast({ message, type });

  const handleSaved = (msg = 'Guardado correctamente') => {
    setModal(null);
    setRefresh(r => r + 1);
    showToast(msg);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">

          <div className="header-brand" onClick={() => { setTab('dashboard'); setMenuAbierto(false); }} style={{ cursor: 'pointer' }}>
            <Monitor size={26} color="#60a5fa" />
            <h1>Inventario IT</h1>
          </div>

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
              <button className={`nav-tab ${tab === 'dashboard' ? 'active' : ''}`} onClick={() => { setTab('dashboard'); setMenuAbierto(false); }}>
                <LayoutDashboard size={15} /> Dashboard
              </button>
              <button className={`nav-tab ${tab === 'inventario' ? 'active' : ''}`} onClick={() => { setDashboardFilter(null); setTab('inventario'); setMenuAbierto(false); }}>
                <ClipboardList size={15} /> Inventario
              </button>
              <button className={`nav-tab ${tab === 'tareas' ? 'active' : ''}`} onClick={() => { setTab('tareas'); setMenuAbierto(false); }}>
                <CheckSquare size={15} /> Tareas
              </button>
              <button className={`nav-tab ${tab === 'agentes' ? 'active' : ''}`} onClick={() => { setTab('agentes'); setMenuAbierto(false); }}>
                <Armchair size={15} /> Agentes
              </button>
              {esAdmin && (
                <button className={`nav-tab ${tab === 'usuarios' ? 'active' : ''}`} onClick={() => { setTab('usuarios'); setMenuAbierto(false); }}>
                  <Users size={15} /> Usuarios
                </button>
              )}
            </nav>

            <div className="header-actions">
              <button className="btn-icon-neon" onClick={() => { setBuscadorAbierto(true); setMenuAbierto(false); }} title="Buscar (Ctrl+K)" aria-label="Buscar (Ctrl+K)">
                <Search size={16} />
              </button>
              {userInfo && (
                <div className="user-badge">
                  <div
                    className="user-badge-avatar"
                    style={{ '--avatar-color': colorAgente(userInfo.nombre || userInfo.usuario) }}
                  >
                    {iniciales(userInfo.nombre || userInfo.usuario)}
                  </div>
                  <div>
                    <div className="user-badge-name">{userInfo.nombre || userInfo.usuario}</div>
                    <div className="user-badge-rol">{rol}</div>
                  </div>
                </div>
              )}
              {tab === 'inventario' && puedeEditar && (!esGlobal || edificioSel != null) && (
                <button className="btn btn-primary" onClick={() => { setModal({ mode: 'create' }); setMenuAbierto(false); }}>
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

      <main className="app-main">
        <div key={tab} className="tab-fade">
          <Suspense fallback={<div className="tab-suspense-fallback">Cargando…</div>}>
            {tab === 'dashboard'  && <Dashboard onNavigate={handleDashboardNav} onOpenEquipo={handleOpenEquipo} refresh={refresh} />}
            {tab === 'inventario' && (
              <EquiposList
                refresh={refresh}
                externalFilters={dashboardFilter}
                rol={rol}
                onEdit={puedeEditar ? (equipo) => setModal({ mode: 'edit', equipo }) : undefined}
                onView={(equipo) => setModal({ mode: 'view', equipo })}
                onCreate={puedeEditar ? () => setModal({ mode: 'create' }) : undefined}
                showToast={showToast}
              />
            )}
            {tab === 'tareas'   && <Tareas rol={rol} miId={userInfo?.id} refresh={refresh} />}
            {tab === 'agentes'  && (
              <Agentes
                rol={rol}
                onOpenEquipo={handleOpenEquipo}
                onEditEquipo={puedeEditar ? handleEditEquipo : undefined}
                onGoToInventario={() => { setDashboardFilter(null); setTab('inventario'); }}
                refresh={refresh}
              />
            )}
            {tab === 'usuarios' && esAdmin && <Usuarios miId={userInfo?.id} refresh={refresh} />}
          </Suspense>
        </div>
      </main>

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
            onGoToTab={setTab}
          />
        </Suspense>
      )}
    </div>
  );
}

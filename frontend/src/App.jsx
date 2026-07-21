import { useState, useEffect } from 'react';
import { LayoutDashboard, ClipboardList, Users, CheckSquare, Download, PlusCircle, Monitor, LogOut, Armchair, Search } from 'lucide-react';
import EquiposList from './components/EquiposList';
import EquipoModal from './components/EquipoModal';
import Dashboard from './components/Dashboard';
import Usuarios from './components/Usuarios';
import Tareas from './components/Tareas';
import Agentes from './components/Agentes';
import GlobalSearch from './components/GlobalSearch';
import Login from './components/Login';
import { exportarExcel, getEquipo } from './api';
import Toast from './components/Toast';
import './App.css';

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

  const userInfo = autenticado ? getUserInfo() : null;
  const rol      = userInfo?.rol || 'observador';
  const puedeEditar  = rol === 'admin' || rol === 'it';
  const esAdmin      = rol === 'admin';

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

  if (!autenticado) return <Login onLogin={() => setAutenticado(true)} />;

  const handleLogout = () => {
    localStorage.removeItem('token');
    setAutenticado(false);
  };

  const handleExportar = async () => {
    try {
      const blob = await exportarExcel();
      const fecha = new Date().toISOString().slice(0, 10);
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: `inventario_equipos_${fecha}.xlsx`,
          types: [{ description: 'Excel', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        showToast('Excel exportado correctamente');
      } catch (e) {
        if (e.name !== 'AbortError') {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `inventario_equipos_${fecha}.xlsx`;
          a.click();
          URL.revokeObjectURL(url);
          showToast('Excel exportado correctamente');
        }
      }
    } catch (err) {
      console.error('Error exportando:', err);
      showToast('Error al exportar', 'error');
    }
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

          <div className="header-brand" onClick={() => setTab('dashboard')} style={{ cursor: 'pointer' }}>
            <Monitor size={26} color="#60a5fa" />
            <h1>Inventario IT</h1>
          </div>

          <nav className="header-nav">
            <button className={`nav-tab ${tab === 'dashboard' ? 'active' : ''}`} onClick={() => setTab('dashboard')}>
              <LayoutDashboard size={15} /> Dashboard
            </button>
            <button className={`nav-tab ${tab === 'inventario' ? 'active' : ''}`} onClick={() => { setDashboardFilter(null); setTab('inventario'); }}>
              <ClipboardList size={15} /> Inventario
            </button>
            <button className={`nav-tab ${tab === 'tareas' ? 'active' : ''}`} onClick={() => setTab('tareas')}>
              <CheckSquare size={15} /> Tareas
            </button>
            <button className={`nav-tab ${tab === 'agentes' ? 'active' : ''}`} onClick={() => setTab('agentes')}>
              <Armchair size={15} /> Agentes
            </button>
            {esAdmin && (
              <button className={`nav-tab ${tab === 'usuarios' ? 'active' : ''}`} onClick={() => setTab('usuarios')}>
                <Users size={15} /> Usuarios
              </button>
            )}
          </nav>

          <div className="header-actions">
            <button className="btn-icon-neon" onClick={() => setBuscadorAbierto(true)} title="Buscar (Ctrl+K)">
              <Search size={16} />
            </button>
            {userInfo && (
              <div className="user-badge">
                <div>
                  <div className="user-badge-name">{userInfo.nombre || userInfo.usuario}</div>
                  <div className="user-badge-rol">{rol}</div>
                </div>
              </div>
            )}
            {tab === 'inventario' && puedeEditar && (
              <>
                <button className="btn btn-secondary" onClick={handleExportar}>
                  <Download size={14} /> Exportar Excel
                </button>
                <button className="btn btn-primary" onClick={() => setModal({ mode: 'create' })}>
                  <PlusCircle size={14} /> Nuevo Equipo
                </button>
              </>
            )}
            <button className="btn-icon-neon" onClick={handleLogout} title="Cerrar sesión">
              <LogOut size={16} />
            </button>
          </div>

        </div>
      </header>

      <main className="app-main">
        {tab === 'dashboard'  && <Dashboard onNavigate={handleDashboardNav} onOpenEquipo={handleOpenEquipo} />}
        {tab === 'inventario' && (
          <EquiposList
            refresh={refresh}
            externalFilters={dashboardFilter}
            rol={rol}
            onEdit={puedeEditar ? (equipo) => setModal({ mode: 'edit', equipo }) : undefined}
            onView={(equipo) => setModal({ mode: 'view', equipo })}
          />
        )}
        {tab === 'tareas'   && <Tareas rol={rol} />}
        {tab === 'agentes'  && (
          <Agentes
            rol={rol}
            onOpenEquipo={handleOpenEquipo}
            onEditEquipo={puedeEditar ? handleEditEquipo : undefined}
          />
        )}
        {tab === 'usuarios' && esAdmin && <Usuarios miId={userInfo?.id} />}
      </main>

      {modal && (
        <EquipoModal
          mode={modal.mode}
          equipo={modal.equipo}
          rol={rol}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {buscadorAbierto && (
        <GlobalSearch
          onClose={() => setBuscadorAbierto(false)}
          onOpenEquipo={handleOpenEquipo}
          onGoToTab={setTab}
        />
      )}
    </div>
  );
}

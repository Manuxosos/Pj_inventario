import { useState, useEffect } from 'react';
import { LayoutDashboard, ClipboardList, Users, CheckSquare, Activity, Download, PlusCircle, Monitor, LogOut } from 'lucide-react';
import EquiposList from './components/EquiposList';
import EquipoModal from './components/EquipoModal';
import Dashboard from './components/Dashboard';
import Usuarios from './components/Usuarios';
import Tareas from './components/Tareas';
import Actividad from './components/Actividad';
import Login from './components/Login';
import { exportarExcel } from './api';
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

  const userInfo = autenticado ? getUserInfo() : null;
  const rol      = userInfo?.rol || 'observador';
  const puedeEditar  = rol === 'admin' || rol === 'it';
  const esAdmin      = rol === 'admin';

  const handleDashboardNav = (filter) => {
    setDashboardFilter(filter);
    setTab('inventario');
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
  }, []);

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
      } catch (e) {
        if (e.name !== 'AbortError') {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `inventario_equipos_${fecha}.xlsx`;
          a.click();
          URL.revokeObjectURL(url);
        }
      }
    } catch (err) {
      console.error('Error exportando:', err);
    }
  };

  const handleSaved = () => {
    setModal(null);
    setRefresh(r => r + 1);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">

          <div className="header-brand">
            <Monitor size={26} color="#60a5fa" />
            <div>
              <h1>Inventario IT</h1>
              <span className="header-sub">Edificio Principal</span>
            </div>
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
            <button className={`nav-tab ${tab === 'actividad' ? 'active' : ''}`} onClick={() => setTab('actividad')}>
              <Activity size={15} /> Actividad
            </button>
            {esAdmin && (
              <button className={`nav-tab ${tab === 'usuarios' ? 'active' : ''}`} onClick={() => setTab('usuarios')}>
                <Users size={15} /> Usuarios
              </button>
            )}
          </nav>

          <div className="header-actions">
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
        {tab === 'dashboard'  && <Dashboard onNavigate={handleDashboardNav} />}
        {tab === 'inventario' && (
          <EquiposList
            refresh={refresh}
            externalFilters={dashboardFilter}
            rol={rol}
            onEdit={puedeEditar ? (equipo) => setModal({ mode: 'edit', equipo }) : undefined}
            onView={(equipo) => setModal({ mode: 'view', equipo })}
          />
        )}
        {tab === 'tareas'    && <Tareas rol={rol} />}
        {tab === 'actividad' && <Actividad rol={rol} />}
        {tab === 'usuarios'  && esAdmin && <Usuarios miId={userInfo?.id} />}
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
    </div>
  );
}

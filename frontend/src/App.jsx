import { useState, useEffect } from 'react';
import { LayoutDashboard, ClipboardList, Download, PlusCircle, Sun, Moon, Monitor, LogOut } from 'lucide-react';
import EquiposList from './components/EquiposList';
import EquipoModal from './components/EquipoModal';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import './App.css';

export default function App() {
  const [autenticado, setAutenticado] = useState(!!localStorage.getItem('token'));
  const [tab, setTab] = useState('dashboard');
  const [modal, setModal] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  if (!autenticado) return <Login onLogin={() => setAutenticado(true)} />;

  const handleLogout = () => {
    localStorage.removeItem('token');
    setAutenticado(false);
  };

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  const handleExportar = async () => {
    const res = await fetch('http://localhost:3001/api/exportar');
    const blob = await res.blob();
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
      if (e.name !== 'AbortError') console.error(e);
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
            <button className={`nav-tab ${tab === 'inventario' ? 'active' : ''}`} onClick={() => setTab('inventario')}>
              <ClipboardList size={15} /> Inventario
            </button>
          </nav>

          <div className="header-actions">
            <button className="theme-toggle" onClick={toggleTheme} title="Cambiar tema">
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button className="theme-toggle" onClick={handleLogout} title="Cerrar sesión">
              <LogOut size={16} />
            </button>
            {tab === 'inventario' && (
              <>
                <button className="btn btn-secondary" onClick={handleExportar}>
                  <Download size={14} /> Exportar Excel
                </button>
                <button className="btn btn-primary" onClick={() => setModal({ mode: 'create' })}>
                  <PlusCircle size={14} /> Nuevo Equipo
                </button>
              </>
            )}
          </div>

        </div>
      </header>

      <main className="app-main">
        {tab === 'dashboard'  && <Dashboard />}
        {tab === 'inventario' && (
          <EquiposList
            refresh={refresh}
            onEdit={(equipo) => setModal({ mode: 'edit', equipo })}
            onView={(equipo) => setModal({ mode: 'view', equipo })}
          />
        )}
      </main>

      {modal && (
        <EquipoModal
          mode={modal.mode}
          equipo={modal.equipo}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

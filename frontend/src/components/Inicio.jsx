import { LogOut, CheckSquare, Ticket, LayoutDashboard, Wallet, ClipboardList, Armchair, Mail, Monitor } from 'lucide-react';
import './Inicio.css';

// Menú principal: separa los módulos en IT ZONE (área de tecnología) y
// BLACK ZONE (activos y personas de la operación). Los módulos sin `tab`
// todavía no existen y se muestran como "Próximamente".
const ZONAS = [
  {
    id: 'it',
    nombre: 'IT ZONE',
    descripcion: 'Soporte, métricas y costos del área de tecnología',
    modulos: [
      { tab: 'tareas',    titulo: 'Tareas',    detalle: 'Pendientes del equipo IT',            Icono: CheckSquare },
      { tab: null,        titulo: 'Tickets',   detalle: 'Solicitudes y soporte',               Icono: Ticket },
      { tab: 'dashboard', titulo: 'Dashboard', detalle: 'Indicadores de equipos e inventario', Icono: LayoutDashboard, ancho: true },
      { tab: null,        titulo: 'Gastos',    detalle: 'Compras y presupuesto IT',            Icono: Wallet, ancho: true },
    ],
  },
  {
    id: 'black',
    nombre: 'BLACK ZONE',
    descripcion: 'Activos, personas y cuentas de la operación',
    modulos: [
      { tab: 'inventario', titulo: 'Inventario', detalle: 'Equipos y accesorios',           Icono: ClipboardList },
      { tab: 'agentes',    titulo: 'Agentes',    detalle: 'Personal y asignaciones',        Icono: Armchair },
      { tab: null,         titulo: 'Correos',    detalle: 'Cuentas de correo corporativas', Icono: Mail, ancho: true },
    ],
  },
];

export default function Inicio({ onGoToTab, userBadge, onLogout }) {
  return (
    <div className="inicio">
      <div className="inicio-top">
        {userBadge}
        <button className="btn-icon-neon" onClick={onLogout} title="Cerrar sesión" aria-label="Cerrar sesión">
          <LogOut size={16} />
        </button>
      </div>

      <section className="inicio-hero">
        <div className="inicio-logo">
          <Monitor size={40} />
          <h1>Office<span>Tech</span></h1>
        </div>
        <p className="inicio-slogan">Control total de la tecnología y la operación, en un solo lugar.</p>
        <p className="inicio-sub">Sistema de gestión y administración para <strong>Matrix</strong></p>
      </section>

      <section className="inicio-zonas">
        {ZONAS.map(zona => (
          <div key={zona.id} className={`inicio-zona inicio-zona-${zona.id}`}>
            <header>
              <span className="inicio-zona-tag">{zona.nombre}</span>
              <p>{zona.descripcion}</p>
            </header>
            <div className="inicio-tiles">
              {zona.modulos.map(({ tab, titulo, detalle, Icono, ancho }) => (
                <button
                  key={titulo}
                  className={`inicio-tile ${ancho ? 'inicio-tile-ancho' : ''}`}
                  onClick={() => tab && onGoToTab(tab)}
                  disabled={!tab}
                >
                  <Icono size={24} />
                  <b>{titulo}</b>
                  <small>{detalle}</small>
                  {!tab && <span className="inicio-pronto">Próximamente</span>}
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

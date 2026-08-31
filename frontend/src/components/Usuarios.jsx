import { useState, useEffect } from 'react';
import { getUsuarios, createUsuario, updateUsuario, deleteUsuario, getEdificios, createEdificio } from '../api';
import { UserPlus, Pencil, Trash2, ShieldCheck, Wrench, Eye, Building2, Plus } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import './Usuarios.css';

const ROL_LABEL = { admin: 'Admin', it: 'IT', observador: 'Observador' };
const ROL_CLASS = { admin: 'rol-admin', it: 'rol-it', observador: 'rol-obs' };

const emptyForm = { nombre: '', usuario: '', password: '', rol: 'it', activo: true, edificio_id: '' };

export default function Usuarios({ miId }) {
  const [usuarios, setUsuarios] = useState([]);
  const [edificios, setEdificios] = useState([]);
  const [modal, setModal]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [deleting, setDeleting]   = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // { id, nombre }
  const [nuevoEdificio, setNuevoEdificio] = useState('');
  const [creandoEdificio, setCreandoEdificio] = useState(false);
  const [errorEdificio, setErrorEdificio] = useState('');

  const cargar = () => {
    setLoading(true);
    getUsuarios().then(d => { setUsuarios(d); setLoading(false); });
  };

  const cargarEdificios = () => getEdificios().then(setEdificios).catch(() => {});

  useEffect(() => { cargar(); cargarEdificios(); }, []);

  const nombreEdificio = (id) => edificios.find(e => e.id === id)?.nombre || '—';

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(confirmDelete.id);
    setConfirmDelete(null);
    await deleteUsuario(confirmDelete.id);
    setUsuarios(prev => prev.filter(x => x.id !== confirmDelete.id));
    setDeleting(null);
  };

  const handleCrearEdificio = async (e) => {
    e.preventDefault();
    if (!nuevoEdificio.trim()) return;
    setCreandoEdificio(true);
    setErrorEdificio('');
    try {
      await createEdificio({ nombre: nuevoEdificio.trim() });
      setNuevoEdificio('');
      await cargarEdificios();
    } catch (err) {
      setErrorEdificio(err.response?.data?.error || 'Error al crear el edificio.');
    } finally {
      setCreandoEdificio(false);
    }
  };

  return (
    <div className="usuarios-page">
      <div className="usuarios-header">
        <div>
          <h2 className="usuarios-title">Gestión de usuarios</h2>
          <p className="usuarios-sub">Crea y administra los accesos al sistema</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({ mode: 'create', data: { ...emptyForm } })}>
          <UserPlus size={14} /> Nuevo usuario
        </button>
      </div>

      <div className="card" style={{ marginBottom: 16, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Building2 size={16} />
          <strong>Edificios</strong>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {edificios.map(ed => (
            <span key={ed.id} className="badge badge-green">{ed.nombre}</span>
          ))}
          {edificios.length === 0 && <span className="text-muted">Sin edificios registrados todavía.</span>}
        </div>
        <form onSubmit={handleCrearEdificio} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            className="form-input"
            style={{ maxWidth: 220 }}
            placeholder="Nombre del edificio nuevo"
            value={nuevoEdificio}
            onChange={e => setNuevoEdificio(e.target.value)}
          />
          <button type="submit" className="btn btn-secondary" disabled={creandoEdificio}>
            <Plus size={14} /> Agregar
          </button>
          {errorEdificio && <span className="form-error" style={{ margin: 0 }}>{errorEdificio}</span>}
        </form>
      </div>

      <div className="table-wrapper card">
        {loading ? (
          <div className="table-loading">Cargando...</div>
        ) : (
          <table className="equip-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Edificio</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.id} className="equip-row">
                  <td style={{ fontWeight: 500 }}>{u.nombre}</td>
                  <td className="mono text-muted">{u.usuario}</td>
                  <td>
                    <span className={`rol-badge ${ROL_CLASS[u.rol]}`}>
                      {u.rol === 'admin' && <ShieldCheck size={11} />}
                      {u.rol === 'it'    && <Wrench size={11} />}
                      {u.rol === 'observador' && <Eye size={11} />}
                      {ROL_LABEL[u.rol]}
                    </span>
                  </td>
                  <td className="text-muted">
                    {u.edificio_id == null ? 'Todos (global)' : nombreEdificio(u.edificio_id)}
                  </td>
                  <td>
                    <span className={u.activo ? 'badge badge-green' : 'badge badge-red'}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <button
                      className="btn btn-ghost btn-sm"
                      title="Editar"
                      onClick={() => setModal({ mode: 'edit', data: { ...u, password: '', edificio_id: u.edificio_id ?? '' } })}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="btn btn-ghost btn-sm danger-btn"
                      title="Eliminar"
                      disabled={u.id === miId || deleting === u.id}
                      onClick={() => setConfirmDelete({ id: u.id, nombre: u.nombre })}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <UsuarioModal
          mode={modal.mode}
          data={modal.data}
          edificios={edificios}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); cargar(); }}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Eliminar usuario"
          message={`¿Estás seguro de que querés eliminar al usuario "${confirmDelete.nombre}"? Esta acción no se puede deshacer.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

function UsuarioModal({ mode, data, edificios, onClose, onSaved }) {
  const [form, setForm]   = useState(data);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const isEdit = mode === 'edit';

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.nombre || !form.usuario || !form.rol) {
      setError('Nombre, usuario y rol son obligatorios.');
      return;
    }
    if (!isEdit && !form.password) {
      setError('La contraseña es obligatoria.');
      return;
    }
    if (form.rol === 'it' && !form.edificio_id) {
      setError('Las cuentas IT deben tener un edificio asignado.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = { ...form, edificio_id: form.rol === 'admin' ? null : (form.edificio_id || null) };
      if (isEdit) {
        await updateUsuario(form.id, payload);
      } else {
        await createUsuario(payload);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar.');
      setSaving(false);
    }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <h2>{isEdit ? 'Editar usuario' : 'Nuevo usuario'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          <section className="form-section">
            <div className="form-grid">

              <div className="form-group">
                <label className="form-label">Nombre completo</label>
                <input className="form-input" value={form.nombre}
                  onChange={e => set('nombre', e.target.value)} placeholder="Ej: Carlos Pérez" />
              </div>

              <div className="form-group">
                <label className="form-label">Usuario (login)</label>
                <input className="form-input" value={form.usuario}
                  onChange={e => set('usuario', e.target.value)} placeholder="Ej: cperez" />
              </div>

              <div className="form-group">
                <label className="form-label">
                  {isEdit ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
                </label>
                <input className="form-input" type="password" value={form.password}
                  onChange={e => set('password', e.target.value)}
                  placeholder={isEdit ? 'Dejar vacío para mantener' : 'Contraseña'} />
              </div>

              <div className="form-group">
                <label className="form-label">Rol</label>
                <select className="form-input" value={form.rol} onChange={e => set('rol', e.target.value)}>
                  <option value="admin">Admin — acceso total + gestión de usuarios</option>
                  <option value="it">IT — agregar, editar y eliminar equipos</option>
                  <option value="observador">Observador — solo lectura</option>
                </select>
              </div>

              {form.rol !== 'admin' && (
                <div className="form-group">
                  <label className="form-label">
                    Edificio{form.rol === 'it' ? '' : ' (dejar en "Todos" para observador global)'}
                  </label>
                  <select className="form-input" value={form.edificio_id ?? ''} onChange={e => set('edificio_id', e.target.value)}>
                    {form.rol === 'observador' && <option value="">Todos los edificios (global)</option>}
                    {form.rol === 'it' && <option value="" disabled>Selecciona un edificio</option>}
                    {edificios.map(ed => (
                      <option key={ed.id} value={ed.id}>{ed.nombre}</option>
                    ))}
                  </select>
                </div>
              )}

              {isEdit && (
                <div className="form-group">
                  <label className="form-label">Estado</label>
                  <select className="form-input" value={form.activo ? 'true' : 'false'}
                    onChange={e => set('activo', e.target.value === 'true')}>
                    <option value="true">Activo</option>
                    <option value="false">Inactivo</option>
                  </select>
                </div>
              )}

            </div>
          </section>

          {error && <div className="form-error">{error}</div>}

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { getUsuarios, createUsuario, updateUsuario, deleteUsuario } from '../api';
import { UserPlus, Pencil, Trash2, ShieldCheck, Wrench, Eye } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import './Usuarios.css';

const ROL_LABEL = { admin: 'Admin', it: 'IT', observador: 'Observador' };
const ROL_CLASS = { admin: 'rol-admin', it: 'rol-it', observador: 'rol-obs' };

const emptyForm = { nombre: '', usuario: '', password: '', rol: 'it', activo: true };

export default function Usuarios({ miId }) {
  const [usuarios, setUsuarios] = useState([]);
  const [modal, setModal]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [deleting, setDeleting]   = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // { id, nombre }

  const cargar = () => {
    setLoading(true);
    getUsuarios().then(d => { setUsuarios(d); setLoading(false); });
  };

  useEffect(() => { cargar(); }, []);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(confirmDelete.id);
    setConfirmDelete(null);
    await deleteUsuario(confirmDelete.id);
    setUsuarios(prev => prev.filter(x => x.id !== confirmDelete.id));
    setDeleting(null);
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
                  <td>
                    <span className={u.activo ? 'badge badge-green' : 'badge badge-red'}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <button
                      className="btn btn-ghost btn-sm"
                      title="Editar"
                      onClick={() => setModal({ mode: 'edit', data: { ...u, password: '' } })}
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

function UsuarioModal({ mode, data, onClose, onSaved }) {
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
    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        await updateUsuario(form.id, form);
      } else {
        await createUsuario(form);
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

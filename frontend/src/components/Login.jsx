import { useState } from 'react';
import { Monitor, LogIn, Eye, EyeOff } from 'lucide-react';
import { loginApi } from '../api';
import './Login.css';

export default function Login({ onLogin }) {
  const [form, setForm] = useState({ usuario: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.usuario || !form.password) { setError('Completa todos los campos.'); return; }
    setLoading(true);
    setError('');
    try {
      const { token } = await loginApi(form.usuario, form.password);
      localStorage.setItem('token', token);
      onLogin();
    } catch {
      setError('Usuario o contraseña incorrectos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-icon-wrap">
            <Monitor size={32} color="#06b6d4" />
          </div>
          <h1>Inventario IT</h1>
          <p>Edificio Principal</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label">Usuario</label>
            <input
              className="form-input"
              type="text"
              placeholder="Ingresa tu usuario"
              value={form.usuario}
              onChange={e => setForm(f => ({ ...f, usuario: e.target.value }))}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <div className="password-wrap">
              <input
                className="form-input"
                type={showPass ? 'text' : 'password'}
                placeholder="Ingresa tu contraseña"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              />
              <button type="button" className="pass-toggle" onClick={() => setShowPass(s => !s)}>
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
            <LogIn size={15} />
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>

      <div className="login-bg-glow" />
    </div>
  );
}

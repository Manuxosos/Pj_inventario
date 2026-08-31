import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || '/api';
const api  = axios.create({ baseURL: BASE });

// Edificio activo (Fase 2): solo aplica a cuentas de alcance global (admin,
// observador global). Se fija desde el selector en App.jsx y viaja
// automáticamente en cada petición, sin tener que pasarlo por cada
// componente. Para cuentas limitadas a un edificio, el backend ignora este
// parámetro y usa siempre el edificio del propio usuario.
let edificioActivo = null;
export const setEdificioActivo = (id) => { edificioActivo = id; };
export const getEdificioActivo = () => edificioActivo;

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers['Authorization'] = `Bearer ${token}`;
  if (edificioActivo != null) {
    cfg.params = { ...(cfg.params || {}), edificio: edificioActivo };
  }
  return cfg;
});

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.reload();
    }
    return Promise.reject(err);
  }
);

export const loginApi = (usuario, password) =>
  axios.post(`${BASE}/login`, { usuario, password }).then(r => r.data);

// Equipos
export const getEquipos   = (params) => api.get('/equipos', { params }).then(r => r.data);
export const getEquipo    = (id)     => api.get(`/equipos/${id}`).then(r => r.data);
export const createEquipo = (data)   => api.post('/equipos', { ...data, edificio_id: data.edificio_id ?? edificioActivo }).then(r => r.data);
export const updateEquipo = (id, d)  => api.put(`/equipos/${id}`, d).then(r => r.data);
export const deleteEquipo = (id)     => api.delete(`/equipos/${id}`).then(r => r.data);
export const getOpciones  = ()       => api.get('/opciones').then(r => r.data);
export const exportarExcel = (params) => api.get('/exportar', { params, responseType: 'blob' }).then(r => r.data);

// Papelera de equipos (solo admin)
export const getPapelera         = ()   => api.get('/equipos/papelera').then(r => r.data);
export const restaurarEquipo     = (id) => api.put(`/equipos/${id}/restaurar`).then(r => r.data);
export const eliminarDefinitivo  = (id) => api.delete(`/equipos/${id}/definitivo`).then(r => r.data);

// Usuarios (solo admin)
export const getUsuarios      = ()         => api.get('/usuarios').then(r => r.data);
export const getUsuariosAsign = ()         => api.get('/usuarios/asignables').then(r => r.data);
export const createUsuario    = (data)     => api.post('/usuarios', data).then(r => r.data);
export const updateUsuario    = (id, data) => api.put(`/usuarios/${id}`, data).then(r => r.data);
export const deleteUsuario    = (id)       => api.delete(`/usuarios/${id}`).then(r => r.data);

// Historial de equipos
export const getHistorial       = (limit)    => api.get('/historial', { params: { limit } }).then(r => r.data);
export const getHistorialEquipo = (id)       => api.get(`/historial/equipo/${id}`).then(r => r.data);
export const updateNota         = (id, nota) => api.put(`/historial/${id}/nota`, { nota }).then(r => r.data);

// Tareas IT
export const getTareas   = ()         => api.get('/tareas').then(r => r.data);
export const createTarea = (data)     => api.post('/tareas', { ...data, edificio_id: data.edificio_id ?? edificioActivo }).then(r => r.data);
export const updateTarea = (id, data) => api.put(`/tareas/${id}`, data).then(r => r.data);
export const deleteTarea = (id)       => api.delete(`/tareas/${id}`).then(r => r.data);

// Tablero de agentes por piso/mesa
export const getAgentesTablero = ()               => api.get('/agentes/tablero').then(r => r.data);
export const moverAgente       = (agente, piso, mesa) => api.put('/agentes/mover', { agente, piso, mesa }).then(r => r.data);
export const setCapacidadMesa  = (capacidad)       => api.put('/edificios/capacidad-mesa', { capacidad }).then(r => r.data);

// Edificios (Fase 2) — solo cuentas de alcance global (admin, observador global)
export const getEdificios   = ()     => api.get('/edificios').then(r => r.data);
export const createEdificio = (data) => api.post('/edificios', data).then(r => r.data);

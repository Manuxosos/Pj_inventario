import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || '/api';
const api  = axios.create({ baseURL: BASE });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers['Authorization'] = `Bearer ${token}`;
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
export const createEquipo = (data)   => api.post('/equipos', data).then(r => r.data);
export const updateEquipo = (id, d)  => api.put(`/equipos/${id}`, d).then(r => r.data);
export const deleteEquipo = (id)     => api.delete(`/equipos/${id}`).then(r => r.data);
export const getOpciones  = ()       => api.get('/opciones').then(r => r.data);
export const exportarExcel = ()      => api.get('/exportar', { responseType: 'blob' }).then(r => r.data);

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
export const createTarea = (data)     => api.post('/tareas', data).then(r => r.data);
export const updateTarea = (id, data) => api.put(`/tareas/${id}`, data).then(r => r.data);
export const deleteTarea = (id)       => api.delete(`/tareas/${id}`).then(r => r.data);

// Tablero de agentes por piso/mesa
export const getAgentesTablero = ()               => api.get('/agentes/tablero').then(r => r.data);
export const moverAgente       = (agente, piso, mesa) => api.put('/agentes/mover', { agente, piso, mesa }).then(r => r.data);

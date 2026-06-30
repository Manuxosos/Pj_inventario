import axios from 'axios';

// En desarrollo usa el proxy de Vite (ver vite.config.js).
// En produccion el frontend lo sirve Express, entonces /api ya apunta al mismo servidor.
// Si necesitas una URL externa pon VITE_API_URL en frontend/.env
const BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({ baseURL: BASE });

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

export const getEquipos    = (params) => api.get('/equipos', { params }).then(r => r.data);
export const getEquipo     = (id)     => api.get(`/equipos/${id}`).then(r => r.data);
export const createEquipo  = (data)   => api.post('/equipos', data).then(r => r.data);
export const updateEquipo  = (id, data) => api.put(`/equipos/${id}`, data).then(r => r.data);
export const deleteEquipo  = (id)     => api.delete(`/equipos/${id}`).then(r => r.data);
export const getOpciones   = ()       => api.get('/opciones').then(r => r.data);

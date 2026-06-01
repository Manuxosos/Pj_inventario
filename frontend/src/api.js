import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:3001/api' });

// Adjuntar token en cada request
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers['Authorization'] = `Bearer ${token}`;
  return cfg;
});

// Si el token expira, limpiar sesión y recargar
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
  axios.post('http://localhost:3001/api/login', { usuario, password }).then(r => r.data);

export const getEquipos = (params) => api.get('/equipos', { params }).then(r => r.data);
export const getEquipo = (id) => api.get(`/equipos/${id}`).then(r => r.data);
export const createEquipo = (data) => api.post('/equipos', data).then(r => r.data);
export const updateEquipo = (id, data) => api.put(`/equipos/${id}`, data).then(r => r.data);
export const deleteEquipo = (id) => api.delete(`/equipos/${id}`).then(r => r.data);
export const getOpciones = () => api.get('/opciones').then(r => r.data);

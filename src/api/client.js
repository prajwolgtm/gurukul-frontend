import axios from 'axios';

const api = axios.create({ 
  baseURL: process.env.REACT_APP_API_BASE || 'http://localhost:5001/api' 
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  
  // Don't set Content-Type for FormData, let browser set it with boundary
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  
  return config;
});

export default api;
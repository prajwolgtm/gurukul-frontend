import api from './client';

export const login = async (email, password) => {
  try {
    const { data } = await api.post('/auth/login', { email, password });
    return data;
  } catch (error) {
    throw error;
  }
};

export const me = async () => {
  try {
    const { data } = await api.get('/auth/me');
    return data;
  } catch (error) {
    throw error;
  }
};

export const setToken = (token) => {
  if (token) localStorage.setItem('authToken', token);
  else localStorage.removeItem('authToken');
};

export const getToken = () => localStorage.getItem('authToken');

export const loginParent = async (email, dob) => {
  try {
    const { data } = await api.post('/auth/login-parent', { email, dob });
    return data;
  } catch (error) {
    throw error;
  }
};

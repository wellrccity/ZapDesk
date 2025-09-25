// src/services/auth.service.js
import api from './api';

const login = (email, password) => {
  return api.post('/auth/login', { email, password }).then((response) => {
    if (response.data.token) {
      localStorage.setItem('user', JSON.stringify(response.data));
    }
    return response.data;
  });
};

const logout = () => {
  localStorage.removeItem('user');
};

const getCurrentUser = () => {
  return JSON.parse(localStorage.getItem('user'));
};

const AuthService = {
  login,
  logout,
  getCurrentUser,
};

export default AuthService;
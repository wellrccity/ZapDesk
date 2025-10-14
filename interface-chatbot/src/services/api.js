// src/services/api.js
import axios from 'axios';

const api = axios.create({
  // CORREÇÃO: Usa a variável de ambiente para a URL da API, com um fallback para desenvolvimento local.
  baseURL: `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api`,
});

// Adiciona um interceptor para incluir o token em todas as requisições
api.interceptors.request.use((config) => {
  const user = JSON.parse(localStorage.getItem('user'));
  if (user && user.token) {
    config.headers.Authorization = 'Bearer ' + user.token;
  }
  return config;
});

export default api;
// src/context/AuthContext.jsx
import React, { createContext, useState, useContext } from 'react';
import AuthService from '../services/auth.service';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(AuthService.getCurrentUser());

  const login = async (email, password) => {
    const userData = await AuthService.login(email, password);
    setUser(userData);
    return userData; // <-- A LINHA QUE FALTAVA!
};

  const logout = () => {
    AuthService.logout();
    setUser(null);
  };

  const value = { user, login, logout, isLoggedIn: !!user };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
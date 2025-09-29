// src/App.jsx
import React from 'react';
import { Routes, Route, BrowserRouter, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Importação dos Componentes e Páginas
import LoginPage from './pages/LoginPage';
import ChatPage from './pages/ChatPage';
import UserManagementPage from './pages/UserManagementPage';
import QRCodePage from './pages/QRCodePage';
import FlowManagementPage from './pages/FlowManagementPage';
import FlowEditorPage from './pages/FlowEditorPage';
import ProtectedRoute from './components/ProtectedRoute';
import NavbarComponent from './components/NavbarComponent';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css'; 


// Componente interno para gerenciar o conteúdo e o layout
function AppContent() {
  const { isLoggedIn } = useAuth();
  return (
    <div className="app-layout"> 
      {isLoggedIn && <NavbarComponent />}
      <main className="main-content">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          <Route element={<ProtectedRoute />}>
            <Route path="/chat" element={<ChatPage />} />
          </Route>

          <Route element={<ProtectedRoute adminOnly={true} />}>
            <Route path="/admin/users" element={<UserManagementPage />} />
            <Route path="/admin/connection" element={<QRCodePage />} />
            <Route path="/admin/flows" element={<FlowManagementPage />} />
            <Route path="/admin/flows/:flowId/edit" element={<FlowEditorPage />} />
          </Route>
          
          <Route path="*" element={<Navigate to={isLoggedIn ? "/chat" : "/login"} />} />
        </Routes>
      </main>
      <ToastContainer position="bottom-right" autoClose={5000} hideProgressBar={false} />
    </div>
  );
}

// Componente principal que provê o roteador
function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

// A linha que exporta o componente 'App' para ser usado em 'main.jsx'
export default App;
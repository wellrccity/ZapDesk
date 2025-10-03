// /components/NavbarComponent.jsx
import React, { useState, useEffect } from 'react';
import { Navbar, Nav, Container, Button, NavDropdown, Badge } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

function NavbarComponent() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [pendingChatsCount, setPendingChatsCount] = useState(0);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    if (!user) return;

    const fetchPendingChats = async () => {
      try {
        const chatsRes = await api.get(`/chats?status=open`);
        // Garante que chatsRes.data seja um array antes de filtrar.
        const pendingCount = (chatsRes.data || []).filter(chat => chat.status === 'open' && !chat.assigned_to).length;
        setPendingChatsCount(pendingCount);
      } catch (err) {
        console.error('Falha ao buscar chats pendentes:', err);
      }
    };

    fetchPendingChats();
    const interval = setInterval(fetchPendingChats, 30000); // Atualiza a cada 30 segundos

    return () => clearInterval(interval);
  }, [user]);

  return (
    <Navbar bg="dark" variant="dark" expand="lg">
      <Container>
        <Navbar.Brand as={Link} to="/chat">ZapDesk</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/chat" className="d-flex align-items-center">
              Chats
              {pendingChatsCount > 0 && (
                <Badge 
                  pill 
                  bg="danger" 
                  className="ms-2"
                  style={{
                    fontSize: '0.7rem',
                  }}
                >
                  {pendingChatsCount}
                </Badge>
              )}
            </Nav.Link>
            <Nav.Link as={Link} to="/contacts">Contatos</Nav.Link>
            {user?.role === 'admin' && (
            <NavDropdown title="Admin" id="admin-nav-dropdown">
              <NavDropdown.Item as={Link} to="/admin/flows">Fluxos de Automação</NavDropdown.Item>
              <NavDropdown.Item as={Link} to="/admin/users">Usuários</NavDropdown.Item>
                <NavDropdown.Item as={Link} to="/admin/connection">Conexão WhatsApp</NavDropdown.Item>
            </NavDropdown>
            )}
          </Nav>
          <Nav>
            <Navbar.Text className="me-3">Logado como: {user?.name}</Navbar.Text>
            <Button variant="outline-light" onClick={handleLogout}>Sair</Button>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default NavbarComponent;
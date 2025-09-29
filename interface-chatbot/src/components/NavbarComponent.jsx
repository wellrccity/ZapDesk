// /components/NavbarComponent.jsx
import React from 'react';
import { Navbar, Nav, Container, Button, NavDropdown } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function NavbarComponent() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Navbar bg="dark" variant="dark" expand="lg">
      <Container>
        <Navbar.Brand as={Link} to="/chat">ZapDesk</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/chat">Chats</Nav.Link>
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
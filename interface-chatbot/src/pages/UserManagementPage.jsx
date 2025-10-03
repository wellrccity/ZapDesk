// /pages/UserManagementPage.jsx
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Table, Modal, InputGroup, Badge, Spinner, Placeholder } from 'react-bootstrap';
import { PencilSquare, PersonCircle, Envelope, Key, PersonVcard, Whatsapp, PlusCircle } from 'react-bootstrap-icons';
import api from '../services/api';
import { useAuth } from '../context/AuthContext'; // Importa o hook de autenticação
import { toast } from 'react-toastify';

function UserManagementPage() {
  const { user: currentUser } = useAuth(); // Pega o usuário logado
  const [users, setUsers] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('atendente');
  const [whatsappNumber, setWhatsappNumber] = useState(''); // Novo estado para o número de WhatsApp
  // Estados para o modal de edição
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (err) {
      toast.error('Falha ao buscar usuários.');
    } finally {
      setLoading(false);
    }
  };

  const normalizeWhatsAppNumber = (number) => {
    if (!number) return '';
    const digitsOnly = number.replace(/\D/g, '');
    return digitsOnly.startsWith('55') || digitsOnly.length < 10 ? digitsOnly : `55${digitsOnly}`;
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      // Usaremos a rota de signup que já existe, mas agora a partir da interface
      await api.post('/auth/signup', { name, email, password, role, whatsapp_number: normalizeWhatsAppNumber(whatsappNumber) });
      toast.success('Usuário criado com sucesso!');
      // Limpa o formulário e atualiza a lista
      setName('');
      setEmail('');
      setPassword('');
      setWhatsappNumber('');
      setRole('atendente');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao criar usuário.');
    }
  };

  const handleShowEditModal = (user) => {
    setEditingUser(user);
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingUser(null);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    try {
      // Envia apenas os campos que podem ser editados
      await api.put(`/users/${editingUser.id}`, { 
        name: editingUser.name,
        email: editingUser.email,
        role: editingUser.role,
        whatsapp_number: normalizeWhatsAppNumber(editingUser.whatsapp_number),
      });
      toast.success('Usuário atualizado com sucesso!');
      handleCloseEditModal();
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao atualizar usuário.');
    }
  };

  return (
    <Container fluid className="p-4">
      <Row>
        <Col md={4}>
          <Card>
            <Card.Header as="h5">Criar Novo Usuário</Card.Header>
            <Card.Body>
              <Form onSubmit={handleCreateUser}>
                <Form.Group className="mb-3">
                  <Form.Label>Nome</Form.Label>
                  <InputGroup>
                    <InputGroup.Text><PersonCircle /></InputGroup.Text>
                    <Form.Control type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Nome completo" />
                  </InputGroup>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <InputGroup>
                    <InputGroup.Text><Envelope /></InputGroup.Text>
                    <Form.Control type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="email@exemplo.com" />
                  </InputGroup>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Senha</Form.Label>
                  <InputGroup>
                    <InputGroup.Text><Key /></InputGroup.Text>
                    <Form.Control type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Senha forte" />
                  </InputGroup>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Permissão</Form.Label>
                  <InputGroup>
                    <InputGroup.Text><PersonVcard /></InputGroup.Text>
                    <Form.Select value={role} onChange={(e) => setRole(e.target.value)}>
                      <option value="atendente">Atendente</option>
                      <option value="admin">Administrador</option>
                    </Form.Select>
                  </InputGroup>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Nº WhatsApp (Opcional)</Form.Label>
                  <InputGroup>
                    <InputGroup.Text><Whatsapp /></InputGroup.Text>
                    <Form.Control type="text" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} placeholder="5511987654321" />
                  </InputGroup>
                </Form.Group>
                <Button variant="primary" type="submit" className="w-100">
                  <PlusCircle className="me-2" /> Criar Usuário
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
        <Col md={8}>
          <Card>
            <Card.Header as="h5">Usuários Cadastrados</Card.Header>
            <Card.Body>
              <Table striped bordered hover responsive="sm">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nome</th>
                    <th>Email</th>
                    <th>Permissão</th>
                    <th>Nº WhatsApp</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 3 }).map((_, index) => (
                      <tr key={index}>
                        <td colSpan="6"><Placeholder as="p" animation="glow"><Placeholder xs={12} /></Placeholder></td>
                      </tr>
                    ))
                  ) : users.length > 0 ? (
                    users.map(user => (
                      <tr key={user.id}>
                        <td>{user.id}</td>
                        <td>{user.name}</td>
                        <td>{user.email}</td>
                        <td>
                          {user.role}
                          {user.id === currentUser.id && (
                            <Badge bg="success" className="ms-2">Você</Badge>
                          )}
                        </td>
                        <td>{user.whatsapp_number || 'N/A'}</td>
                        <td>
                          <Button variant="outline-primary" size="sm" onClick={() => handleShowEditModal(user)}>
                            <PencilSquare /> Editar
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="text-center text-muted">Nenhum usuário cadastrado.</td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Modal de Edição de Usuário */}
      <Modal show={showEditModal} onHide={handleCloseEditModal}>
        <Modal.Header closeButton>
          <Modal.Title>Editar Usuário: {editingUser?.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Nome</Form.Label>
            <Form.Control
              type="text"
              value={editingUser?.name || ''}
              onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              value={editingUser?.email || ''}
              onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Permissão</Form.Label>
            <Form.Select value={editingUser?.role || 'atendente'} onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}>
              <option value="atendente">Atendente</option>
              <option value="admin">Administrador</option>
            </Form.Select>
          </Form.Group>
          <Form.Group>
            <Form.Label>Número do WhatsApp</Form.Label>
            <InputGroup>
               <InputGroup.Text>+</InputGroup.Text>
               <Form.Control
                 type="text"
                 placeholder="Ex: 5511987654321"
                 value={editingUser?.whatsapp_number?.replace(/\D/g, '') || ''}
                 onChange={(e) => setEditingUser({ ...editingUser, whatsapp_number: e.target.value })}
               />
            </InputGroup>
            <Form.Text className="text-muted">
              Use o formato DDI + DDD + Número, sem espaços ou símbolos. Ex: 5511987654321.
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseEditModal}>Cancelar</Button>
          <Button variant="primary" onClick={handleUpdateUser}>Salvar Alterações</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default UserManagementPage;
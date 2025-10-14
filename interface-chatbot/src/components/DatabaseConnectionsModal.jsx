// src/components/DatabaseConnectionsModal.jsx
import React, { useState, useEffect } from 'react';
import { Modal, Button, Table, Form, Row, Col, Alert, ButtonGroup } from 'react-bootstrap';
import api from '../services/api';
import { toast } from 'react-toastify';

function DatabaseConnectionsModal({ show, onHide, flowId, onUpdate }) {
  const [connections, setConnections] = useState([]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newConnection, setNewConnection] = useState({
    id: null, // Adicionado para controlar edição
    name: '',
    dialect: 'mysql',
    host: '',
    port: 3306,
    user: '',
    pass: '',
    // db_name: '' // CORREÇÃO: Removido, pois é selecionado na etapa.
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (show) {
      fetchConnections();
    }
  }, [show, flowId]);

  const fetchConnections = async () => {
    if (!flowId) return;
    try {
      const response = await api.get(`/flows/${flowId}/database-credentials`);
      setConnections(response.data);
    } catch (err) {
      toast.error('Falha ao buscar conexões.');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewConnection(prev => ({ ...prev, [name]: value }));
  };

  const handleEdit = async (id) => {
    try {
      const response = await api.get(`/database-credentials/${id}`);
      setNewConnection(response.data);
      setShowNewModal(true);
    } catch (err) {
      toast.error('Não foi possível carregar os dados da conexão para edição.');
    }
  };

  const resetForm = () => {
    setNewConnection({
      id: null,
      name: '',
      dialect: 'mysql',
      host: '',
      port: 3306,
      user: '',
      pass: '',
      // db_name: '' // Removido: agora é selecionado na etapa
    });
    setError('');
  };

  const handleSave = async () => {
    setError('');
    if (!newConnection.name || !newConnection.host || !newConnection.port || !newConnection.user) { // CORREÇÃO: Validação sem db_name
      setError('Todos os campos (Nome, Host, Porta, Usuário) são obrigatórios.');
      return;
    }
    try {
      if (newConnection.id) {
        // Editando
        await api.put(`/database-credentials/${newConnection.id}`, newConnection);
        toast.success('Conexão atualizada com sucesso!');
      } else {
        // Criando
        await api.post(`/flows/${flowId}/database-credentials`, newConnection);
        toast.success('Conexão salva com sucesso!');
      }
      setShowNewModal(false);
      fetchConnections().then(onUpdate); // Atualiza a lista principal e a do editor de etapas
      resetForm();
    } catch (err) {
      const message = err.response?.data?.message || 'Erro ao salvar a conexão.';
      setError(message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja apagar esta conexão? Etapas que a utilizam podem parar de funcionar.')) {
      try {
        await api.delete(`/database-credentials/${id}`);
        toast.success('Conexão apagada com sucesso!');
        fetchConnections().then(onUpdate); // Atualiza a lista principal e a do editor de etapas
      } catch (err) {
        toast.error('Erro ao apagar a conexão.');
      }
    }
  };

  return (
    <>
      <Modal show={show} onHide={onHide} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Gerenciar Conexões do Fluxo</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>Nome da Conexão</th>
                <th className="text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {connections.map(conn => (
                <tr key={conn.id}>
                  <td>{conn.name}</td>
                  <td className="text-center">
                    <ButtonGroup>
                      <Button variant="outline-primary" size="sm" onClick={() => handleEdit(conn.id)}>Editar</Button>
                      <Button variant="outline-danger" size="sm" onClick={() => handleDelete(conn.id)}>Apagar</Button>
                    </ButtonGroup>
                  </td>
                </tr>
              ))}
              {connections.length === 0 && (
                <tr><td colSpan="2" className="text-center text-muted">Nenhuma conexão cadastrada para este fluxo.</td></tr>
              )}
            </tbody>
          </Table>
        </Modal.Body>
        <Modal.Footer className="justify-content-between">
          <Button variant="primary" onClick={() => { resetForm(); setShowNewModal(true); }}>Adicionar Nova</Button>
          <Button variant="secondary" onClick={onHide}>Fechar</Button>
        </Modal.Footer>
      </Modal>

      {/* Modal para Adicionar Nova Conexão */}
      <Modal show={showNewModal} onHide={() => { setShowNewModal(false); resetForm(); }} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{newConnection.id ? 'Editar Conexão' : 'Nova Conexão com Banco de Dados'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form>
            <Form.Group className="mb-3"><Form.Label>Nome da Conexão (Apelido)</Form.Label><Form.Control type="text" name="name" value={newConnection.name} onChange={handleInputChange} placeholder="Ex: Banco de Vendas" /></Form.Group>
            <Row>
              <Col md={8}><Form.Group className="mb-3"><Form.Label>Endereço (Host)</Form.Label><Form.Control type="text" name="host" value={newConnection.host} onChange={handleInputChange} placeholder="Ex: 127.0.0.1" /></Form.Group></Col>
              <Col md={4}><Form.Group className="mb-3"><Form.Label>Porta</Form.Label><Form.Control type="number" name="port" value={newConnection.port} onChange={handleInputChange} /></Form.Group></Col>
            </Row>
            {/* CORREÇÃO: O campo db_name foi removido daqui */}
            <Row>
              <Col md={12}><Form.Group className="mb-3"><Form.Label>Dialeto</Form.Label><Form.Select name="dialect" value={newConnection.dialect} onChange={handleInputChange}><option value="mysql">MySQL</option></Form.Select></Form.Group></Col>
            </Row>
            <Row>
              <Col md={6}><Form.Group className="mb-3"><Form.Label>Usuário</Form.Label><Form.Control type="text" name="user" value={newConnection.user} onChange={handleInputChange} placeholder="Ex: root" /></Form.Group></Col>
              <Col md={6}><Form.Group className="mb-3"><Form.Label>Senha</Form.Label><Form.Control type="password" name="pass" value={newConnection.pass} onChange={handleInputChange} placeholder={newConnection.id ? '(Deixe em branco para não alterar)' : ''} /></Form.Group></Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => { setShowNewModal(false); resetForm(); }}>Cancelar</Button>
          <Button variant="primary" onClick={handleSave}>Salvar Conexão</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default DatabaseConnectionsModal;
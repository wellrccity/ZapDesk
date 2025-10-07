// src/components/DatabaseConnectionsModal.jsx
import React, { useState, useEffect } from 'react';
import { Modal, Button, Table, Form, Row, Col, Alert } from 'react-bootstrap';
import api from '../services/api';
import { toast } from 'react-toastify';

function DatabaseConnectionsModal({ show, onHide, flowId, onUpdate }) {
  const [connections, setConnections] = useState([]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newConnection, setNewConnection] = useState({
    name: '',
    dialect: 'mysql',
    host: '',
    port: 3306,
    user: '',
    pass: '',
    db_name: ''
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

  const handleSave = async () => {
    setError('');
    if (!newConnection.name || !newConnection.host || !newConnection.port || !newConnection.user || !newConnection.db_name) {
      setError('Todos os campos, exceto a senha, são obrigatórios.');
      return;
    }

    try {
      await api.post(`/flows/${flowId}/database-credentials`, newConnection);
      toast.success('Conexão salva com sucesso!');
      setShowNewModal(false);
      fetchConnections().then(onUpdate); // Atualiza a lista principal e a do editor de etapas
      setNewConnection({ name: '', dialect: 'mysql', host: '', port: 3306, user: '', pass: '', db_name: '' });
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
                    <Button variant="danger" size="sm" onClick={() => handleDelete(conn.id)}>Apagar</Button>
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
          <Button variant="primary" onClick={() => setShowNewModal(true)}>Adicionar Nova</Button>
          <Button variant="secondary" onClick={onHide}>Fechar</Button>
        </Modal.Footer>
      </Modal>

      {/* Modal para Adicionar Nova Conexão */}
      <Modal show={showNewModal} onHide={() => setShowNewModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Nova Conexão com Banco de Dados</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form>
            <Form.Group className="mb-3"><Form.Label>Nome da Conexão (Apelido)</Form.Label><Form.Control type="text" name="name" value={newConnection.name} onChange={handleInputChange} placeholder="Ex: Banco de Vendas" /></Form.Group>
            <Row>
              <Col md={8}><Form.Group className="mb-3"><Form.Label>Endereço (Host)</Form.Label><Form.Control type="text" name="host" value={newConnection.host} onChange={handleInputChange} placeholder="Ex: 127.0.0.1" /></Form.Group></Col>
              <Col md={4}><Form.Group className="mb-3"><Form.Label>Porta</Form.Label><Form.Control type="number" name="port" value={newConnection.port} onChange={handleInputChange} /></Form.Group></Col>
            </Row>
            <Row>
              <Col md={6}><Form.Group className="mb-3"><Form.Label>Nome do Banco de Dados</Form.Label><Form.Control type="text" name="db_name" value={newConnection.db_name} onChange={handleInputChange} placeholder="Ex: minha_empresa_db" /></Form.Group></Col>
              <Col md={6}><Form.Group className="mb-3"><Form.Label>Dialeto</Form.Label><Form.Select name="dialect" value={newConnection.dialect} onChange={handleInputChange}><option value="mysql">MySQL</option></Form.Select></Form.Group></Col>
            </Row>
            <Row>
              <Col md={6}><Form.Group className="mb-3"><Form.Label>Usuário</Form.Label><Form.Control type="text" name="user" value={newConnection.user} onChange={handleInputChange} placeholder="Ex: root" /></Form.Group></Col>
              <Col md={6}><Form.Group className="mb-3"><Form.Label>Senha</Form.Label><Form.Control type="password" name="pass" value={newConnection.pass} onChange={handleInputChange} /></Form.Group></Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowNewModal(false)}>Cancelar</Button>
          <Button variant="primary" onClick={handleSave}>Salvar Conexão</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default DatabaseConnectionsModal;
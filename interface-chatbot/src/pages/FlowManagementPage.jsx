// /pages/FlowManagementPage.jsx
import React, { useState, useEffect } from 'react';
import { Container, Card, Button, ListGroup, Modal, Form } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

function FlowManagementPage() {
  const [flows, setFlows] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newFlowName, setNewFlowName] = useState('');
  const [newFlowKeyword, setNewFlowKeyword] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchFlows();
  }, []);

  const fetchFlows = async () => {
    const response = await api.get('/flows');
    setFlows(response.data);
  };
  
  const handleCreateFlow = async () => {
    try {
      const response = await api.post('/flows', { name: newFlowName, trigger_keyword: newFlowKeyword });
      // Após criar, navega para a página de edição do novo fluxo
      navigate(`/admin/flows/${response.data.id}/edit`);
    } catch(err) {
      alert("Erro ao criar fluxo. A palavra-chave já pode existir.");
    }
  };

  return (
    <Container fluid className="p-4">
      <Card>
        <Card.Header as="h5" className="d-flex justify-content-between align-items-center">
          Fluxos de Automação
          <Button onClick={() => setShowModal(true)}>Criar Novo Fluxo</Button>
        </Card.Header>
        <Card.Body>
          <ListGroup>
            {flows.map(flow => (
              <ListGroup.Item action as={Link} to={`/admin/flows/${flow.id}/edit`} key={flow.id}>
                <div className="fw-bold">{flow.name}</div>
                Disparado pela palavra-chave: `{flow.trigger_keyword}`
              </ListGroup.Item>
            ))}
          </ListGroup>
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Criar Novo Fluxo</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Nome do Fluxo</Form.Label>
            <Form.Control type="text" value={newFlowName} onChange={e => setNewFlowName(e.target.value)} placeholder="Ex: Suporte Técnico" />
          </Form.Group>
          <Form.Group>
            <Form.Label>Palavra-Chave de Início</Form.Label>
            <Form.Control type="text" value={newFlowKeyword} onChange={e => setNewFlowKeyword(e.target.value)} placeholder="Ex: !suporte (sem espaços, minúsculo)" />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
          <Button variant="primary" onClick={handleCreateFlow}>Criar e Editar</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default FlowManagementPage;
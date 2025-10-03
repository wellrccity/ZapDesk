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
  const [newFlowTarget, setNewFlowTarget] = useState('customer'); // Novo estado
  const [isDefaultFlow, setIsDefaultFlow] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchFlows();
  }, []);

  const resetModalState = () => {
    setNewFlowName('');
    setNewFlowKeyword('');
    setNewFlowTarget('customer');
    setIsDefaultFlow(false);
    setShowModal(false);
  };

  const fetchFlows = async () => {
    const response = await api.get('/flows');
    setFlows(response.data);
  };
  
  const handleCreateFlow = async () => {
    const payload = { 
      name: newFlowName, 
      trigger_keyword: isDefaultFlow ? '*' : newFlowKeyword,
      target_audience: newFlowTarget // Envia o público-alvo
    };
    try {
      const response = await api.post('/flows', payload);
      // Após criar, navega para a página de edição do novo fluxo
      navigate(`/admin/flows/${response.data.id}/edit`);
    } catch(err) {
      alert("Erro ao criar fluxo. A palavra-chave já pode existir.");
    }
  };

  const getTargetAudienceBadge = (target) => {
    const styles = {
      customer: { bg: 'secondary', text: 'Cliente' },
      agent: { bg: 'primary', text: 'Atendente' },
      admin: { bg: 'warning', text: 'Admin' },
    };
    const style = styles[target] || styles.customer;
    return <span className={`badge bg-${style.bg} ms-2`}>{style.text}</span>;
  }

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
                <div className="fw-bold">
                  {flow.name} 
                  {flow.trigger_keyword === '*' && <span className="badge bg-info ms-2">Padrão</span>}
                  {getTargetAudienceBadge(flow.target_audience)}
                </div>
                {flow.trigger_keyword === '*' 
                  ? <span className="text-muted">Disparado quando nenhum outro comando corresponde.</span>
                  : <span>Disparado pela palavra-chave: `{flow.trigger_keyword}`</span>
                }
              </ListGroup.Item>
            ))}
          </ListGroup>
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={resetModalState}>
        <Modal.Header closeButton>
          <Modal.Title>Criar Novo Fluxo</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Nome do Fluxo</Form.Label>
            <Form.Control type="text" value={newFlowName} onChange={e => setNewFlowName(e.target.value)} placeholder="Ex: Suporte Técnico" />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Público-Alvo do Fluxo</Form.Label>
            <Form.Select value={newFlowTarget} onChange={e => setNewFlowTarget(e.target.value)}>
              <option value="customer">Cliente (Padrão)</option>
              <option value="agent">Atendente</option>
              <option value="admin">Administrador</option>
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Check 
              type="checkbox"
              label="Usar como fluxo padrão (fallback)"
              checked={isDefaultFlow}
              onChange={e => setIsDefaultFlow(e.target.checked)}
            />
            <Form.Text className="text-muted">
              Será acionado se a mensagem do usuário não corresponder a nenhuma outra palavra-chave. Só pode haver um fluxo padrão.
            </Form.Text>
          </Form.Group>
          <Form.Group>
            <Form.Label>Palavra-Chave de Início</Form.Label>
            <Form.Control type="text" value={newFlowKeyword} onChange={e => setNewFlowKeyword(e.target.value)} placeholder="Ex: !suporte (sem espaços, minúsculo)" disabled={isDefaultFlow} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={resetModalState}>Cancelar</Button>
          <Button variant="primary" onClick={handleCreateFlow}>Criar e Editar</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default FlowManagementPage;
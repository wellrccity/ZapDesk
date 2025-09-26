// /pages/IntegrationManagementPage.jsx
import React, { useState, useEffect } from 'react';
import { Container, Card, Button, Table, Form, Alert, Row, Col } from 'react-bootstrap';
import api from '../services/api';

function IntegrationManagementPage() {
  const [integrations, setIntegrations] = useState([]);
  const [name, setName] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const response = await api.get('/integrations');
      setIntegrations(response.data);
    } catch (err) {
      setError('Falha ao buscar integrações.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/integrations', { name, target_url: targetUrl, type: 'WEBHOOK' });
      setMessage('Webhook salvo com sucesso!');
      setName('');
      setTargetUrl('');
      fetchIntegrations();
    } catch (err) {
      setError('Erro ao salvar webhook.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza?')) {
      await api.delete(`/integrations/${id}`);
      fetchIntegrations();
    }
  };

  return (
    <Container fluid className="p-4">
      <Row>
        <Col md={5}>
          <Card>
            <Card.Header as="h5">Adicionar Webhook</Card.Header>
            <Card.Body>
              {message && <Alert variant="success">{message}</Alert>}
              {error && <Alert variant="danger">{error}</Alert>}
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Nome da Integração</Form.Label>
                  <Form.Control type="text" placeholder="Ex: Sistema de Vendas" value={name} onChange={e => setName(e.target.value)} required />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>URL do Webhook</Form.Label>
                  <Form.Control type="url" placeholder="https://seu-sistema.com/api/webhook" value={targetUrl} onChange={e => setTargetUrl(e.target.value)} required />
                </Form.Group>
                <Button variant="primary" type="submit">Salvar</Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
        <Col md={7}>
          <Card>
            <Card.Header as="h5">Webhooks Salvos</Card.Header>
            <Card.Body>
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>URL</th>
                    <th>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {integrations.map(integ => (
                    <tr key={integ.id}>
                      <td>{integ.name}</td>
                      <td>{integ.target_url}</td>
                      <td>
                        <Button variant="danger" size="sm" onClick={() => handleDelete(integ.id)}>Apagar</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default IntegrationManagementPage;
// src/pages/ContactPage.jsx
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Table, Modal, InputGroup, Spinner, Placeholder } from 'react-bootstrap';
import { PersonPlus, PencilSquare, Trash, Person, Whatsapp, GeoAlt } from 'react-bootstrap-icons';
import api from '../services/api';
import { toast } from 'react-toastify';

function ContactPage() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentContact, setCurrentContact] = useState({ id: null, name: '', whatsapp_number: '', address: '' });

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/contacts');
      setContacts(response.data);
    } catch (err) {
      toast.error('Falha ao buscar contatos.');
    } finally {
      setLoading(false);
    }
  };

  const handleShowModal = (contact = null) => {
    if (contact) {
      setIsEditing(true);
      setCurrentContact(contact);
    } else {
      setIsEditing(false);
      setCurrentContact({ id: null, name: '', whatsapp_number: '', address: '' });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleSaveContact = async () => {
    const { id, name, whatsapp_number, address } = currentContact;
    const payload = { name, whatsapp_number: whatsapp_number.replace(/\D/g, ''), address };

    try {
      if (isEditing) {
        await api.put(`/contacts/${id}`, payload);
        toast.success('Contato atualizado com sucesso!');
      } else {
        await api.post('/contacts', payload);
        toast.success('Contato criado com sucesso!');
      }
      fetchContacts();
      handleCloseModal();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao salvar contato.');
    }
  };

  const handleDeleteContact = async (id) => {
    if (window.confirm('Tem certeza que deseja apagar este contato?')) {
      try {
        await api.delete(`/contacts/${id}`);
        toast.success('Contato deletado com sucesso!');
        fetchContacts();
      } catch (err) {
        toast.error('Erro ao deletar contato.');
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentContact({ ...currentContact, [name]: value });
  };

  return (
    <Container fluid className="p-4">
      <Card>
        <Card.Header as="h5" className="d-flex justify-content-between align-items-center">
          Gerenciamento de Contatos
          <Button variant="primary" onClick={() => handleShowModal()}>
            <PersonPlus className="me-2" /> Novo Contato
          </Button>
        </Card.Header>
        <Card.Body>
          <Table striped bordered hover responsive="sm">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Nº WhatsApp</th>
                <th>Endereço</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <tr key={index}>
                    <td colSpan="4"><Placeholder as="p" animation="glow"><Placeholder xs={12} /></Placeholder></td>
                  </tr>
                ))
              ) : contacts.length > 0 ? (
                contacts.map(contact => (
                  <tr key={contact.id}>
                    <td>{contact.name}</td>
                    <td>{contact.whatsapp_number}</td>
                    <td>{contact.address || 'N/A'}</td>
                    <td>
                      <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleShowModal(contact)}>
                        <PencilSquare />
                      </Button>
                      <Button variant="outline-danger" size="sm" onClick={() => handleDeleteContact(contact.id)}>
                        <Trash />
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="text-center text-muted">Nenhum contato cadastrado.</td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* Modal de Criação/Edição */}
      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>{isEditing ? 'Editar Contato' : 'Novo Contato'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Nome</Form.Label>
              <InputGroup>
                <InputGroup.Text><Person /></InputGroup.Text>
                <Form.Control type="text" name="name" value={currentContact.name} onChange={handleInputChange} required placeholder="Nome completo" />
              </InputGroup>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Nº WhatsApp</Form.Label>
              <InputGroup>
                <InputGroup.Text><Whatsapp /></InputGroup.Text>
                <Form.Control type="text" name="whatsapp_number" value={currentContact.whatsapp_number} onChange={handleInputChange} required placeholder="5511987654321" />
              </InputGroup>
              <Form.Text>Use o formato DDI + DDD + Número, sem espaços.</Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Endereço (Opcional)</Form.Label>
              <InputGroup>
                <InputGroup.Text><GeoAlt /></InputGroup.Text>
                <Form.Control type="text" name="address" value={currentContact.address} onChange={handleInputChange} placeholder="Rua, Número, Bairro..." />
              </InputGroup>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>Cancelar</Button>
          <Button variant="primary" onClick={handleSaveContact}>Salvar</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default ContactPage;
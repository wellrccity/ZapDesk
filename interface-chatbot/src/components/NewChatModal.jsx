// src/components/NewChatModal.jsx
import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, InputGroup, ListGroup, Tab, Nav } from 'react-bootstrap';
import { Whatsapp, PersonLinesFill } from 'react-bootstrap-icons';
import api from '../services/api';

function NewChatModal({ show, onHide, onStartChat }) {
  const [contacts, setContacts] = useState([]);
  const [manualNumber, setManualNumber] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (show) {
      // Carrega os contatos quando o modal é aberto
      const fetchContacts = async () => {
        try {
          const response = await api.get('/contacts');
          setContacts(response.data);
        } catch (error) {
          console.error("Erro ao buscar contatos", error);
        }
      };
      fetchContacts();
    }
  }, [show]);

  const handleManualStart = () => {
    const number = manualNumber.replace(/\D/g, '');
    if (number) {
      onStartChat({
        whatsapp_number: `${number}@c.us`,
        name: `Novo Chat (${number})`
      });
      setManualNumber('');
    }
  };

  const handleContactStart = (contact) => {
    onStartChat({
      whatsapp_number: `${contact.whatsapp_number}@c.us`,
      name: contact.name
    });
  };

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.whatsapp_number.includes(searchTerm)
  );

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>Iniciar Novo Chat</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Tab.Container defaultActiveKey="contacts">
          <Nav variant="pills" className="mb-3">
            <Nav.Item>
              <Nav.Link eventKey="contacts"><PersonLinesFill className="me-2" />Contatos</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="manual"><Whatsapp className="me-2" />Digitar Número</Nav.Link>
            </Nav.Item>
          </Nav>

          <Tab.Content>
            <Tab.Pane eventKey="contacts">
              <Form.Control
                type="text"
                placeholder="Buscar contato..."
                className="mb-3"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <ListGroup style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {filteredContacts.map(contact => (
                  <ListGroup.Item key={contact.id} action onClick={() => handleContactStart(contact)}>
                    <strong>{contact.name}</strong>
                    <div className="text-muted small">{contact.whatsapp_number}</div>
                  </ListGroup.Item>
                ))}
                {filteredContacts.length === 0 && <ListGroup.Item disabled>Nenhum contato encontrado.</ListGroup.Item>}
              </ListGroup>
            </Tab.Pane>

            <Tab.Pane eventKey="manual">
              <Form.Label>Número do WhatsApp</Form.Label>
              <InputGroup className="mb-3">
                <Form.Control
                  type="text"
                  placeholder="5511987654321"
                  value={manualNumber}
                  onChange={(e) => setManualNumber(e.target.value)}
                />
                <Button variant="primary" onClick={handleManualStart}>
                  Iniciar
                </Button>
              </InputGroup>
              <Form.Text>Use o formato DDI + DDD + Número, sem espaços.</Form.Text>
            </Tab.Pane>
          </Tab.Content>
        </Tab.Container>
      </Modal.Body>
    </Modal>
  );
}

export default NewChatModal;
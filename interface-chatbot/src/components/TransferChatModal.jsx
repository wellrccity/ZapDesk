// src/components/TransferChatModal.jsx
import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

function TransferChatModal({ show, onHide, users, onTransfer }) {
  const [selectedUserId, setSelectedUserId] = useState('');

  const handleConfirm = () => {
    if (selectedUserId) {
      onTransfer(selectedUserId);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Transferir Chat</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group>
          <Form.Label>Selecione o novo atendente:</Form.Label>
          <Form.Select 
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
          >
            <option value="">Escolha um usuário...</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.role})
              </option>
            ))}
          </Form.Select>
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={handleConfirm} disabled={!selectedUserId}>
          Confirmar Transferência
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default TransferChatModal;
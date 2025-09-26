// src/components/StepEditorModal.jsx
import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

function StepEditorModal({ show, onHide, onSave, currentStep }) {
  const [stepData, setStepData] = useState({});

  useEffect(() => {
    // Quando 'currentStep' muda, atualiza o estado do formulário
    if (currentStep) {
      setStepData(currentStep);
    } else {
      // Padrão para uma nova etapa
      setStepData({ step_type: 'MESSAGE', message_body: '' });
    }
  }, [currentStep]);

  const handleChange = (e) => {
    setStepData({ ...stepData, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    onSave(stepData);
  };

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{currentStep?.id ? 'Editar Etapa' : 'Nova Etapa'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Tipo da Etapa</Form.Label>
            <Form.Select name="step_type" value={stepData.step_type || ''} onChange={handleChange}>
              <option value="MESSAGE">Mensagem Simples</option>
              <option value="QUESTION_TEXT">Pergunta (Texto)</option>
              <option value="QUESTION_POLL">Pergunta (Enquete)</option>
              <option value="FORM_SUBMIT">Finalizar e Enviar Formulário</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Texto da Mensagem do Bot</Form.Label>
            <Form.Control as="textarea" rows={3} name="message_body" value={stepData.message_body || ''} onChange={handleChange} />
          </Form.Group>
          
          {/* Campos condicionais que só aparecem para perguntas */}
          {(stepData.step_type === 'QUESTION_TEXT' || stepData.step_type === 'QUESTION_POLL') && (
            <Form.Group className="mb-3 p-3 bg-light border rounded">
              <Form.Label className="fw-bold">Configuração da Pergunta</Form.Label>
              <Form.Control 
                type="text" 
                name="form_field_key" 
                value={stepData.form_field_key || ''} 
                onChange={handleChange}
                placeholder="Chave para salvar a resposta (ex: nome_cliente, email)"
              />
            </Form.Group>
          )}

          {/* TODO: Adicionar interface para criar/editar opções de enquete */}
          {stepData.step_type === 'QUESTION_POLL' && (
              <p className="text-muted">A edição de opções de enquete será adicionada futuramente.</p>
          )}

        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Cancelar</Button>
        <Button variant="primary" onClick={handleSave}>Salvar Etapa</Button>
      </Modal.Footer>
    </Modal>
  );
}
export default StepEditorModal;
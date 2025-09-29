// src/components/StepCard.jsx
import React from 'react';
import { Card, Button } from 'react-bootstrap';

function StepCard({ step, onEdit, onDelete, stepIndex }) {
  return (
    <Card className="mb-3">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <Card.Title>Etapa {stepIndex} (Tipo: {step.step_type})</Card.Title>
            <Card.Text>
              <strong>Mensagem:</strong> {step.message_body || 'N/A'}
            </Card.Text>
            {step.poll_options && step.poll_options.length > 0 && (
              <div>
                <strong>Opções da Enquete:</strong>
                <ul>
                  {step.poll_options.map(opt => <li key={opt.id}>{opt.option_text}</li>)}
                </ul>
              </div>
            )}
          </div>
          <div>
            <Button variant="outline-primary" size="sm" onClick={() => onEdit(step)}>Editar</Button>{' '}
            <Button variant="outline-danger" size="sm" onClick={() => onDelete(step.id)}>Apagar</Button>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}
export default StepCard;
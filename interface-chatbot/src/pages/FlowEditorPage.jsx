// /pages/FlowEditorPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Card, Button, Spinner } from 'react-bootstrap';
import api from '../services/api';
import StepCard from '../components/StepCard';
import StepEditorModal from '../components/StepEditorModal';

function FlowEditorPage() {
  const { flowId } = useParams();
  const [flow, setFlow] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Estados para controlar o modal
  const [showStepModal, setShowStepModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(null); // 'null' para nova etapa, objeto para editar

  useEffect(() => {
    fetchFlowData();
  }, [flowId]);

  const fetchFlowData = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/flows/${flowId}`);
      setFlow(response.data);
    } catch (err) {
      console.error("Falha ao buscar dados do fluxo", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowModal = (step = null) => {
    setCurrentStep(step);
    setShowStepModal(true);
  };
  
  const handleSaveStep = async (stepData) => {
    try {
      if (stepData.id) { // Editando uma etapa existente
        await api.put(`/steps/${stepData.id}`, stepData);
      } else { // Criando uma nova etapa
        await api.post(`/flows/${flowId}/steps`, stepData);
      }
      setShowStepModal(false);
      fetchFlowData(); // Recarrega os dados para mostrar as mudanças
    } catch(err) {
        alert("Erro ao salvar a etapa.");
    }
  };

  const handleDeleteStep = async (stepId) => {
      if(window.confirm('Tem certeza que deseja apagar esta etapa?')) {
          await api.delete(`/steps/${stepId}`);
          fetchFlowData();
      }
  };

  if (isLoading) return <div className="p-4"><Spinner animation="border" /></div>;
  if (!flow) return <h4 className="p-4">Fluxo não encontrado.</h4>;

  return (
    <>
      <Container fluid className="p-4">
        <Card>
          <Card.Header>
            <h4>Editando Fluxo: {flow.name}</h4>
            <p className="text-muted mb-0">Palavra-chave: {flow.trigger_keyword}</p>
          </Card.Header>
          <Card.Body>
            <h5>Etapas do Fluxo</h5>
            {flow.steps.map(step => (
              <StepCard 
                key={step.id} 
                step={step} 
                onEdit={handleShowModal} 
                onDelete={handleDeleteStep} 
              />
            ))}
            <Button onClick={() => handleShowModal(null)}>Adicionar Nova Etapa</Button>
          </Card.Body>
        </Card>
      </Container>

      <StepEditorModal 
        show={showStepModal}
        onHide={() => setShowStepModal(false)}
        onSave={handleSaveStep}
        currentStep={currentStep}
      />
    </>
  );
}

export default FlowEditorPage;
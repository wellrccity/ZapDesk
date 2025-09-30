// /pages/FlowEditorPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Button, Spinner } from 'react-bootstrap';
import api from '../services/api';
import StepCard from '../components/StepCard';
import StepEditorModal from '../components/StepEditorModal';

function FlowEditorPage() {
  const { flowId } = useParams();
  const navigate = useNavigate();
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
        fetchFlowData(); // Recarrega tudo ao editar
      } else { // Criando uma nova etapa
        // CORREÇÃO: Garante que o step_type seja enviado na criação.
        const payload = {
          ...stepData,
        };
        const response = await api.post(`/flows/${flowId}/steps`, payload);
        // CORREÇÃO: Usa a resposta da API para atualizar o estado localmente.
        setFlow(prevFlow => ({ ...prevFlow, steps: [...prevFlow.steps, response.data] }));
      }
      setShowStepModal(false);
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

  const handleDeleteFlow = async () => {
    if (window.confirm(`Tem certeza que deseja apagar o fluxo "${flow.name}" e todas as suas etapas? Esta ação não pode ser desfeita.`)) {
      try {
        await api.delete(`/flows/${flowId}`);
        navigate('/flows'); // Redireciona para a lista de fluxos
      } catch (err) {
        alert("Erro ao apagar o fluxo.");
      }
    }
  };

  if (isLoading) return <div className="p-4"><Spinner animation="border" /></div>;
  if (!flow) return <h4 className="p-4">Fluxo não encontrado.</h4>;

  return (
    <>
      <Container fluid className="p-4">
        <Card>
          <Card.Header className="d-flex justify-content-between align-items-center">
            <div>
              <h4>Editando Fluxo: {flow.name}</h4>
            </div>
            <Button variant="danger" onClick={handleDeleteFlow}>Apagar Fluxo</Button>
            <p className="text-muted mb-0">Palavra-chave: {flow.trigger_keyword}</p>
          </Card.Header>
          <Card.Body>
            <h5>Etapas do Fluxo</h5>
            {flow.steps.map((step, index) => (
              <StepCard 
                key={step.id} 
                step={step} 
                stepIndex={index + 1}
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
        allSteps={flow.steps} // MUDANÇA: Passe a lista de todas as etapas para o modal
      />
    </>
  );
}

export default FlowEditorPage;
// /pages/FlowEditorPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Button, Spinner } from 'react-bootstrap';
import api from '../services/api';
import StepCard from '../components/StepCard';
import StepEditorModal from '../components/StepEditorModal';
import DatabaseConnectionsModal from '../components/DatabaseConnectionsModal'; // <-- ADICIONAR

function FlowEditorPage() {
  const { flowId } = useParams();
  const navigate = useNavigate();
  const [flow, setFlow] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dbCredentials, setDbCredentials] = useState([]); // <-- ADICIONAR
  const [formKeys, setFormKeys] = useState([]); // <-- ADICIONAR

  // Estados para controlar o modal
  const [showStepModal, setShowStepModal] = useState(false);
  const [showDbModal, setShowDbModal] = useState(false); // <-- ADICIONAR
  const [currentStep, setCurrentStep] = useState(null); // 'null' para nova etapa, objeto para editar

  useEffect(() => {
    fetchFlowData();
  }, [flowId]);

  const fetchFlowData = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/flows/${flowId}`);
      fetchDbCredentials(); // Busca as credenciais após buscar o fluxo
      setFlow(response.data);
      // Extrai todas as chaves de formulário das etapas e remove duplicatas/vazias
      const keys = [
        ...new Set(response.data.steps.map(s => s.form_field_key).filter(Boolean))
      ];
      // Adiciona a chave 'userinput' que é um padrão para respostas de texto
      if (!keys.includes('userinput')) keys.push('userinput');
      setFormKeys(keys.sort());
    } catch (err) {
      console.error("Falha ao buscar dados do fluxo", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Função para buscar as credenciais do fluxo atual
  const fetchDbCredentials = async () => {
    try {
      const response = await api.get(`/flows/${flowId}/database-credentials`);
      setDbCredentials(response.data);
    } catch (error) {
      console.error("Erro ao buscar credenciais de banco de dados", error);
      // Não trava a UI, apenas loga o erro
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
              <p className="text-muted mb-0">Palavra-chave: {flow.trigger_keyword}</p>
            </div>
            <div>
              <Button variant="info" className="me-2" onClick={() => setShowDbModal(true)}>Gerenciar Conexões</Button>
              <Button variant="danger" onClick={handleDeleteFlow}>Apagar Fluxo</Button>
            </div>
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
        allSteps={flow.steps}
        formKeys={formKeys} // <-- ADICIONAR
        dbCredentials={dbCredentials} // <-- ADICIONAR
      />

      <DatabaseConnectionsModal
        show={showDbModal}
        onHide={() => setShowDbModal(false)}
        flowId={flowId}
        onUpdate={fetchDbCredentials} // <-- ADICIONAR: Atualiza a lista quando uma conexão é salva/apagada
      />
    </>
  );
}

export default FlowEditorPage;
// /pages/FlowEditorPage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Button, Spinner, Alert } from 'react-bootstrap';
import ReactFlow, { Background, Controls, MiniMap, useNodesState, useEdgesState } from 'reactflow';
import 'reactflow/dist/style.css';
import api from '../services/api';
import StepEditorModal from '../components/StepEditorModal';
import DatabaseConnectionsModal from '../components/DatabaseConnectionsModal'; // <-- ADICIONAR
import FlowStepNode from '../components/FlowStepNode';
 
// CORREÇÃO: Definir nodeTypes fora do componente para evitar recriação a cada render.
const nodeTypes = { flowStep: FlowStepNode };
function FlowEditorPage() {
  const { flowId } = useParams();
  const navigate = useNavigate();
  // CORREÇÃO: Usar refs para manter uma referência estável aos estados que mudam
  const flowRef = useRef(null);
  const edgesRef = useRef([]);

  const [flow, setFlow] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dbCredentials, setDbCredentials] = useState([]); // <-- ADICIONAR
  const [formKeys, setFormKeys] = useState([]); // <-- ADICIONAR
  const [availableFormKeys, setAvailableFormKeys] = useState([]); // Para o modal
  const [nodes, setNodes, onNodesChange] = useNodesState([]); // CORREÇÃO: nodes.length será usado para forçar a recriação
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Estados para controlar o modal
  const [showStepModal, setShowStepModal] = useState(false);
  const [showDbModal, setShowDbModal] = useState(false); // <-- ADICIONAR
  const [currentStep, setCurrentStep] = useState(null); // 'null' para nova etapa, objeto para editar

  useEffect(() => {
    fetchFlowData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowId]);

  // CORREÇÃO: Manter as refs sincronizadas com os estados
  useEffect(() => {
    flowRef.current = flow;
    edgesRef.current = edges;
  }, [flow, edges]);

  // CORREÇÃO: Declarar fetchDbCredentials ANTES de fetchFlowData, pois é uma dependência.
  // Busca as credenciais do fluxo atual
  const fetchDbCredentials = useCallback(async () => {
    try {
      const response = await api.get(`/flows/${flowId}/database-credentials`);
      setDbCredentials(response.data);
    } catch (error) {
      console.error("Erro ao buscar credenciais de banco de dados", error);
    }
  }, [flowId]);

  const fetchFlowData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/flows/${flowId}`);
      fetchDbCredentials(); // Busca as credenciais após buscar o fluxo
      setFlow(response.data);
      // Extrai todas as chaves de formulário das etapas e remove duplicatas/vazias
      const keys = [
        ...new Set(response.data.steps.map(s => s.form_field_key).filter(Boolean))
      ];
      setFormKeys(keys.sort());
    } catch (err) {
      console.error("Falha ao buscar dados do fluxo", err);
    } finally {
      setIsLoading(false);
    }
  }, [flowId, fetchDbCredentials]);

  // Função para encontrar todas as chaves de formulário disponíveis de etapas ancestrais
  const getAvailableKeysForStep = useCallback((stepId, allSteps, allEdges) => {
    const availableKeys = new Set();
    const visited = new Set();
    const queue = [stepId.toString()];

    // Percorre o grafo para trás a partir da etapa atual
    while (queue.length > 0) {
      const currentId = queue.shift();
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const incomingEdges = allEdges.filter(edge => edge.target === currentId);

      for (const edge of incomingEdges) {
        // CORREÇÃO: Adiciona 'userinput' se a etapa anterior for uma pergunta de texto.
        const parentStepInfo = allSteps.find(s => s.id.toString() === edge.source);
        if (parentStepInfo && parentStepInfo.step_type === 'QUESTION_TEXT') {
          availableKeys.add('userinput');
        }
        const parentId = edge.source;
        const parentStep = allSteps.find(s => s.id.toString() === parentId);

        if (parentStep) {
          // Adiciona a chave do formulário da etapa pai, se houver
          if (parentStep.form_field_key) availableKeys.add(parentStep.form_field_key);

          // Adiciona as chaves do mapeamento de resultado de consulta, se houver
          if (parentStep.db_query_result_mapping) {
            try {
              const mapping = JSON.parse(parentStep.db_query_result_mapping);
              Object.values(mapping).forEach(key => availableKeys.add(key));
            } catch (e) { /* ignora erros de parse */ }
          }
          if (!visited.has(parentId)) queue.push(parentId);
        }
      }
    }
    return Array.from(availableKeys).sort();
  }, []);
  
  const handleShowModal = useCallback((step = null) => {
    // CORREÇÃO: Define uma posição inicial para novas etapas para evitar sobreposição.
    let stepWithPosition = step;
    if (!step) { // Se é uma nova etapa
      const existingSteps = flowRef.current?.steps || [];
      stepWithPosition = {
        position_x: (existingSteps.length % 5) * 250, // Calcula uma posição X em grade
        position_y: Math.floor(existingSteps.length / 5) * 200, // Calcula uma posição Y em grade
      };
    }
    setCurrentStep(stepWithPosition);
    // CORREÇÃO: Ler os valores atuais das refs.
    if (stepWithPosition?.id && flowRef.current && edgesRef.current) {
      const keys = getAvailableKeysForStep(stepWithPosition.id, flowRef.current.steps, edgesRef.current);
      setAvailableFormKeys(keys);
    } else {
      // CORREÇÃO: Novas etapas não têm variáveis disponíveis até serem conectadas.
      setAvailableFormKeys([]);
    }
    setShowStepModal(true);
    // Recarrega os dados do fluxo para garantir que as opções de "próximo passo" estejam atualizadas
    fetchFlowData();
  }, [getAvailableKeysForStep, fetchFlowData]); // CORREÇÃO: Adicionar fetchFlowData que é estável
  
  const handleDeleteStep = useCallback(async (stepId) => {
    if(window.confirm('Tem certeza que deseja apagar esta etapa?')) {
      try {
        await api.delete(`/steps/${stepId}`);
        setNodes([]);
        fetchFlowData();
      } catch (err) {
        alert("Erro ao apagar a etapa. Verifique se ela não é a etapa inicial ou se outras etapas dependem dela.");
      }
    }
  }, [fetchFlowData]); // CORREÇÃO: Adicionar fetchFlowData que agora é estável

  const handleNodeDragStop = useCallback(async (event, node) => {
    try {
      await api.put(`/steps/${node.id}/position`, {
        position: node.position,
      });
    } catch (err) {
      console.error("Falha ao salvar a posição do nó", err);
      // Opcional: Adicionar um toast de erro para o usuário
    }
  }, []); // Nenhuma dependência necessária

  const handleEdgesChange = useCallback(async (changes) => {
    // Aplica as mudanças no estado local primeiro
    onEdgesChange(changes);

    // Encontra a primeira mudança que é uma remoção
    const removal = changes.find(change => change.type === 'remove');
    if (!removal) return;

    // Encontra a aresta que foi removida no estado *anterior*
    const edgeToRemove = edges.find(edge => edge.id === removal.id);
    if (!edgeToRemove) return;

    const { source, sourceHandle } = edgeToRemove;
    const sourceStep = flow.steps.find(step => step.id.toString() === source);

    if (!sourceStep) {
      console.error("Etapa de origem não encontrada para a remoção da conexão");
      return;
    }

    // Prepara os dados para zerar a conexão
    let updatedStepData = { ...sourceStep };

    if (sourceHandle.startsWith('poll_option_')) {
      const pollOptionId = parseInt(sourceHandle.replace('poll_option_', ''), 10);
      updatedStepData.poll_options = (updatedStepData.poll_options || []).map(opt =>
        opt.id === pollOptionId ? { ...opt, next_step_id_on_select: null } : opt
      );
    } else {
      // Conexão padrão (next_step_id ou next_step_id_on_fail)
      updatedStepData[sourceHandle] = null;
    }

    try {
      await api.put(`/steps/${updatedStepData.id}`, updatedStepData);
      // Não precisa recarregar os dados, pois a UI já foi atualizada
      // e a mudança foi persistida para o próximo reload.
    } catch (err) {
      console.error("Erro ao remover a conexão da etapa.", err);
      alert("Erro ao remover a conexão.");
    }
  }, [onEdgesChange, edges, flow?.steps]); // CORREÇÃO: Depender de flow.steps

  const onConnect = useCallback(async (connection) => {
    const { source, target, sourceHandle } = connection;

    const sourceStep = flow.steps.find(step => step.id.toString() === source);
    if (!sourceStep) {
      console.error("Etapa de origem não encontrada para a conexão");
      return;
    }

    // Prepara os dados da etapa para atualização
    let updatedStepData = { ...sourceStep };

    if (sourceHandle.startsWith('poll_option_')) {
      // Conexão de uma opção de enquete
      const pollOptionId = parseInt(sourceHandle.replace('poll_option_', ''), 10);
      updatedStepData.poll_options = (updatedStepData.poll_options || []).map(opt => 
        opt.id === pollOptionId ? { ...opt, next_step_id_on_select: parseInt(target, 10) } : opt
      );
    } else {
      // Conexão padrão (next_step_id ou next_step_id_on_fail)
      updatedStepData[sourceHandle] = parseInt(target, 10);
    }

    try {
      // Usa a função de salvar existente para enviar a atualização para a API
      await api.put(`/steps/${updatedStepData.id}`, updatedStepData);
      // Força a busca de dados para redesenhar o grafo com a nova conexão
      setNodes([]); 
      fetchFlowData();
    } catch (err) {
      console.error("Erro ao salvar a conexão da etapa:", err);
      alert("Erro ao salvar a conexão.");
    }
  }, [flow?.steps, fetchFlowData, setNodes]); // CORREÇÃO: Depender de flow.steps

  // Efeito para transformar os dados do fluxo em nós e arestas para o ReactFlow
  useEffect(() => {
    if (!flow) return;

    // CORREÇÃO: Ordena as etapas pela data de criação antes de mapear.
    // Isso garante que o 'stepIndex' (Etapa 1, Etapa 2...) seja estável e não
    // mude com base na posição visual ou na ordem retornada pelo banco de dados.
    const sortedSteps = [...flow.steps].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const newNodes = sortedSteps.map((step, index) => ({
      id: step.id.toString(),
      type: 'flowStep',
      // Usa a posição salva, ou calcula uma nova se não existir
      position: { 
        x: step.position_x ?? (index % 4) * 320, 
        y: step.position_y ?? Math.floor(index / 4) * 250 
      },
      data: {
        step: { ...step, isInitial: step.id === flow.initial_step_id },
        stepIndex: index + 1,
        onEdit: handleShowModal,
        onDelete: handleDeleteStep,
      },
    }));

    const newEdges = flow.steps.flatMap(step => {
      const edges = [];
      if (step.next_step_id) {
        edges.push({ id: `e-${step.id}-next-${step.next_step_id}`, source: step.id.toString(), target: step.next_step_id.toString(), sourceHandle: 'next_step_id', animated: true, style: { stroke: '#5cb85c' }, markerEnd: { type: 'arrowclosed', color: '#5cb85c' } });
      }
      if (step.next_step_id_on_fail) {
        edges.push({ id: `e-${step.id}-fail-${step.next_step_id_on_fail}`, source: step.id.toString(), target: step.next_step_id_on_fail.toString(), sourceHandle: 'next_step_id_on_fail', style: { stroke: '#d9534f' }, markerEnd: { type: 'arrowclosed', color: '#d9534f' } });
      }
      if ((step.step_type === 'QUESTION_POLL' || step.step_type === 'QUESTION_AI_CHOICE') && step.poll_options) {
        step.poll_options.forEach(opt => {
          if (opt.next_step_id_on_select) {
            edges.push({ id: `e-${step.id}-poll-${opt.id}-${opt.next_step_id_on_select}`, source: step.id.toString(), target: opt.next_step_id_on_select.toString(), sourceHandle: `poll_option_${opt.id}`, style: { stroke: '#0275d8' }, markerEnd: { type: 'arrowclosed', color: '#0275d8' } });
          }
        });
      }
      return edges;
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [flow, handleShowModal, handleDeleteStep]); // CORREÇÃO: Depender das funções de callback estáveis

  const handleSaveStep = async (stepData) => {
    try {
      if (stepData.id) { // Editando uma etapa existente
        await api.put(`/steps/${stepData.id}`, stepData);
        // CORREÇÃO: Reseta os nós para forçar a recriação do grafo ao editar.
        setNodes([]);
        fetchFlowData();
      } else { // Criando uma nova etapa
        // CORREÇÃO: Garante que o step_type seja 'MESSAGE' por padrão se não for definido.
        // Isso corrige o erro "step_type cannot be null" ao criar uma etapa simples.
        const payload = {
          ...stepData,
          step_type: stepData.step_type || 'MESSAGE',
        };
        const response = await api.post(`/flows/${flowId}/steps`, payload);
        // CORREÇÃO: Usa a resposta da API para atualizar o estado localmente.
        // setFlow(prevFlow => ({ ...prevFlow, steps: [...prevFlow.steps, response.data] }));
        // CORREÇÃO: Reseta os nós para forçar a recriação do grafo e depois busca os dados.
        setNodes([]);
        fetchFlowData();
      }
      handleCloseModal();
    } catch(err) {
        alert("Erro ao salvar a etapa.");
    }
  };

  const handleDeleteFlow = async () => {
    if (window.confirm(`Tem certeza que deseja apagar o fluxo "${flow.name}" e todas as suas etapas? Esta ação não pode ser desfeita.`)) {
      try {
        await api.delete(`/flows/${flowId}`);
        navigate('/admin/flows'); // Redireciona para a lista de fluxos
      } catch (err) {
        alert("Erro ao apagar o fluxo.");
      }
    }
  };

  if (isLoading) return <div className="p-4"><Spinner animation="border" /></div>;
  if (!flow) return <h4 className="p-4">Fluxo não encontrado.</h4>;

  const handleCloseModal = () => {
    setShowStepModal(false);
  };

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
              <Button variant="primary" className="me-2" onClick={() => handleShowModal(null)}>Adicionar Etapa</Button>
              <Button variant="info" className="me-2" onClick={() => setShowDbModal(true)}>Gerenciar Conexões</Button>
              <Button variant="danger" onClick={handleDeleteFlow}>Apagar Fluxo</Button>
            </div>
          </Card.Header>

          <Card.Body style={{ height: '75vh', padding: 0 }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={handleEdgesChange}
              onNodeDragStop={handleNodeDragStop}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              fitView
            >
              <Background />
              <Controls />
              <MiniMap />
            </ReactFlow>
          </Card.Body>
        </Card>
      </Container>

      <StepEditorModal 
        show={showStepModal}
        onHide={handleCloseModal}
        onSave={handleSaveStep}
        currentStep={currentStep}
        allSteps={flow.steps}
        formKeys={availableFormKeys} // <-- ALTERADO para chaves contextuais
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
// src/components/StepEditorModal.jsx
import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, InputGroup, Card } from 'react-bootstrap';
import { toast } from 'react-toastify';
import api from '../services/api';

// Recebe as novas props 'allSteps' e 'dbCredentials'
function StepEditorModal({ show, onHide, onSave, currentStep, allSteps, dbCredentials, formKeys }) {
  const [stepData, setStepData] = useState({});
  const [tableColumns, setTableColumns] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});

  useEffect(() => {
    if (currentStep) {
      // Garante que poll_options seja sempre um array
          setStepData({
            ...currentStep,
            poll_options: currentStep.poll_options || [],
            // Garante que o mapeamento seja um objeto ao carregar
            db_column_mapping: currentStep.db_column_mapping ? JSON.parse(currentStep.db_column_mapping) : {}
          });
      // Inicializa o estado do mapeamento local
      setColumnMapping(currentStep.db_column_mapping ? JSON.parse(currentStep.db_column_mapping) : {});
    } else {
      setStepData({ step_type: 'MESSAGE', message_body: '', poll_options: [], next_step_id: null });
      setColumnMapping({});
    }
    // Limpa as colunas ao fechar/trocar de etapa
    if (!show) {
      setTableColumns([]);
    }
  }, [currentStep, show]);

  // Busca as colunas da tabela quando a conexão ou o nome da tabela mudam
  useEffect(() => {
    const fetchTableColumns = async () => {
      if (stepData.database_credential_id && stepData.db_table) {
        try {
          const response = await api.get(`/database-credentials/${stepData.database_credential_id}/tables/${stepData.db_table}/columns`);
          setTableColumns(response.data);
        } catch (error) {
          setTableColumns([]); // Limpa em caso de erro (ex: tabela não encontrada)
          const msg = error.response?.data?.message || 'Não foi possível buscar as colunas da tabela.';
          toast.warn(msg);
        }
      } else {
        setTableColumns([]); // Limpa se não houver conexão ou tabela
      }
    };

    // Debounce para evitar chamadas excessivas enquanto o usuário digita
    const handler = setTimeout(() => {
      fetchTableColumns();
    }, 500);

    return () => clearTimeout(handler);
  }, [stepData.database_credential_id, stepData.db_table]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Se o valor for a string "null", converte para o valor nulo real
    setStepData({ ...stepData, [name]: value === "null" ? null : value });
  };

  const handleMappingChange = (dbColumn, formKey) => {
    setColumnMapping(prev => ({
      ...prev,
      [dbColumn]: formKey
    }));
  };

  const handleOptionChange = (index, field, value) => {
    const newOptions = [...stepData.poll_options];
    newOptions[index][field] = value === "null" ? null : value;
    setStepData({ ...stepData, poll_options: newOptions });
  };

  const addOption = () => {
    const newOptions = [...stepData.poll_options, { option_text: '', trigger_keyword: '', next_step_id_on_select: null }];
    setStepData({ ...stepData, poll_options: newOptions });
  };

  const removeOption = (index) => {
    const newOptions = stepData.poll_options.filter((_, i) => i !== index);
    setStepData({ ...stepData, poll_options: newOptions });
  };

  const handleSave = () => {
    // Salva o mapeamento como uma string JSON
    onSave({
      ...stepData,
      db_column_mapping: JSON.stringify(columnMapping)
    });
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
              <option value="QUESTION_POLL">Pergunta (Enquete/Menu)</option>
              <option value="FORM_SUBMIT">Finalizar e Enviar Formulário</option>
              <option value="END_FLOW">Finalizar Fluxo</option>
              <option value="LIST_CHATS">Listar Atendimentos</option>
              {/* --- NOVAS ETAPAS DE AÇÃO --- */}
              <option value="ASSIGN_CHAT">[AÇÃO] Assumir Atendimento</option>
              <option value="ENTER_CONVERSATION_MODE">[AÇÃO] Entrar em Modo Conversa</option>
              <option value="CLOSE_CHAT">[AÇÃO] Encerrar Atendimento</option>

              <option value="REQUEST_HUMAN_SUPPORT">Solicitar Atendimento Humano</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Texto da Mensagem do Bot</Form.Label>
            <Form.Control as="textarea" rows={3} name="message_body" value={stepData.message_body || ''} onChange={handleChange} />
          </Form.Group>

          {stepData.step_type === 'REQUEST_HUMAN_SUPPORT' && (
            <Form.Text className="d-block mb-3 p-2 bg-info bg-opacity-10 border border-info rounded">Esta etapa irá remover o cliente do fluxo e criar um chat para atendimento humano. A mensagem acima será enviada antes da transição.</Form.Text>
          )}

          {stepData.step_type === 'ASSIGN_CHAT' && (
            <Form.Text className="d-block mb-3 p-2 bg-primary bg-opacity-10 border border-primary rounded"><b>Ação:</b> Esta etapa irá atribuir um chat ao atendente. Ela espera que o ID do chat tenha sido salvo em uma variável de formulário (ex: `chat_id`) em uma etapa anterior.</Form.Text>
          )}

          {stepData.step_type === 'ENTER_CONVERSATION_MODE' && (
            <Form.Text className="d-block mb-3 p-2 bg-primary bg-opacity-10 border border-primary rounded"><b>Ação:</b> Coloca o atendente em "modo conversa" com o cliente do chat assumido. Tudo que ele digitar será enviado ao cliente até que o atendimento seja encerrado.</Form.Text>
          )}

          {stepData.step_type === 'CLOSE_CHAT' && (
            <Form.Text className="d-block mb-3 p-2 bg-primary bg-opacity-10 border border-primary rounded"><b>Ação:</b> Finaliza o atendimento ativo, envia uma mensagem de despedida ao cliente e tira o atendente do "modo conversa".</Form.Text>
          )}

          {/* --- OPÇÕES PARA LISTAR ATENDIMENTOS --- */}
          {stepData.step_type === 'LIST_CHATS' && (
            <Form.Group className="mb-3 p-3 bg-light border rounded">
              <Form.Label className="fw-bold">Opções da Listagem</Form.Label>
              <Form.Select name="form_field_key" value={stepData.form_field_key || 'open'} onChange={handleChange}>
                <option value="open">Listar atendimentos Abertos/Aguardando</option>
                <option value="closed">Listar atendimentos Encerrados</option>
              </Form.Select>
            </Form.Group>
          )}

          {/* --- CAMPO PARA DEFINIR O PRÓXIMO PASSO (PARA FLUXOS LINEARES) --- */}
          {(stepData.step_type === 'MESSAGE' || stepData.step_type === 'QUESTION_TEXT') && (
            <Form.Group className="mb-3 p-3 bg-light border rounded">
              <Form.Label className="fw-bold">Após esta etapa:</Form.Label>
              <Form.Select
                name="next_step_id"
                value={stepData.next_step_id || "null"} // Usa "null" como string para o valor padrão
                onChange={handleChange}
              >
                <option value="null">Finalizar o fluxo</option>
                {allSteps.map((step, index) => (
                  // Impede que uma etapa aponte para si mesma
                  step.id !== stepData.id &&
                  <option key={step.id} value={step.id}>
                    Ir para Etapa {index + 1} ({step.step_type})
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          )}
          
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

          {/* --- SEÇÃO PARA CONSULTA EM BANCO DE DADOS (QUESTION_TEXT) --- */}
          {stepData.step_type === 'QUESTION_TEXT' && (
            <Card className="mb-3 p-3 bg-light border rounded">
              <Card.Title className="fw-bold">Consulta em Banco de Dados (Opcional)</Card.Title>
              <Form.Text className="d-block mb-2">Use a resposta do usuário para buscar dados em um banco externo e usá-los em etapas futuras.</Form.Text>
              
              <Form.Group className="mb-3">
                <Form.Label>Query SQL</Form.Label>
                <Form.Control as="textarea" rows={3} name="db_query" value={stepData.db_query || ''} onChange={handleChange} placeholder="SELECT nome, email FROM clientes WHERE matricula = :userInput" />
                <Form.Text>Use <strong>:userInput</strong> como placeholder para a resposta do usuário.</Form.Text>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Caso a consulta não retorne resultados:</Form.Label>
                <Form.Select
                  name="next_step_id_on_fail"
                  value={stepData.next_step_id_on_fail || "null"}
                  onChange={handleChange}
                >
                  <option value="null">Finalizar o fluxo</option>
                  {allSteps.map((step, index) => (
                    step.id !== stepData.id &&
                    <option key={step.id} value={step.id}>
                      Ir para Etapa {index + 1} ({step.step_type})
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Mapeamento dos Resultados</Form.Label>
                <Form.Control as="textarea" rows={3} name="db_query_result_mapping" value={stepData.db_query_result_mapping || ''} onChange={handleChange} placeholder={'{\n  "nome_variavel": "nome_coluna_db",\n  "email_cliente": "email"\n}'} />
                <Form.Text>
                  Em formato JSON. A "chave" é o nome que você usará no fluxo (ex: {`{nome_variavel}`}), e o "valor" é o nome da coluna retornada pela query.
                </Form.Text>
              </Form.Group>
            </Card>
          )}

          {/* --- SEÇÃO PARA CONFIGURAÇÃO DE INTEGRAÇÃO COM BANCO DE DADOS (FORM_SUBMIT) --- */}
          {stepData.step_type === 'FORM_SUBMIT' && (
            <Card className="mb-3 p-3 bg-light border rounded">
              <Card.Title className="fw-bold">Integração com Banco de Dados</Card.Title>
              <Form.Text className="d-block mb-3">Os dados coletados no formulário serão inseridos em uma tabela do banco de dados selecionado.</Form.Text>
              <Form.Group className="mb-3">
                <Form.Label>Conexão com Banco de Dados</Form.Label>
                <Form.Select name="database_credential_id" value={stepData.database_credential_id || ''} onChange={handleChange}>
                  <option value="">Selecione uma conexão...</option>
                  {dbCredentials && dbCredentials.map(cred => (
                    <option key={cred.id} value={cred.id}>{cred.name}</option>
                  ))}
                </Form.Select>
                <Form.Text>As conexões são gerenciadas na tela de edição do fluxo.</Form.Text>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Tabela de Destino</Form.Label>
                <Form.Control type="text" name="db_table" value={stepData.db_table || ''} onChange={handleChange} placeholder="ex: leads_chatbot" />
              </Form.Group>

              {tableColumns.length > 0 && (
                <Card className="p-3 mb-3 border-secondary">
                  <Card.Title className="h6">Mapeamento de Colunas</Card.Title>
                  <Form.Text className="d-block mb-2">
                    Selecione qual campo do formulário corresponde a cada coluna do banco de dados.
                    As chaves disponíveis são as que você definiu nas etapas de "Pergunta".
                  </Form.Text>
                  {tableColumns.map(col => (
                    <Row key={col} className="mb-2 align-items-center">
                      <Col md={5}>
                        <Form.Label className="text-muted mb-0">{col}</Form.Label>
                      </Col>
                      <Col md={7}>
                        <Form.Select
                          value={columnMapping[col] || ''}
                          onChange={(e) => handleMappingChange(col, e.target.value)}
                        >
                            <option value="">-- Ignorar esta coluna --</option>
                            {formKeys.map(key => (
                                <option key={key} value={key}>{key}</option>
                            ))}
                        </Form.Select>
                      </Col>
                    </Row>
                  ))}
                </Card>
              )}

              <Form.Group className="mb-3">
                <Form.Label>SQL Extra (Opcional)</Form.Label>
                <Form.Control as="textarea" rows={4} name="extra_sql" value={stepData.extra_sql || ''} onChange={handleChange} placeholder="-- Use :chave para substituir valores do formulário&#10;-- Ex: UPDATE estatisticas SET total = total + 1 WHERE id = :id_produto;" />
                <Form.Text>Use `:chave_do_formulario` para injetar valores. Ex: `:email_cliente`.</Form.Text>
              </Form.Group>
            </Card>
          )}

          {/* --- NOVA SEÇÃO PARA OPÇÕES DE ENQUETE --- */}
          {stepData.step_type === 'QUESTION_POLL' && stepData.poll_options && (
            <Card className="p-3">
              <Card.Title>Opções da Enquete (Menu)</Card.Title>
              {stepData.poll_options.map((opt, index) => (
                <Row key={index} className="mb-2 align-items-center">
                  <Col md={2}>
                     <Form.Control 
                      type="text"
                      placeholder="Gatilho"
                      value={opt.trigger_keyword || ''}
                      onChange={(e) => handleOptionChange(index, 'trigger_keyword', e.target.value)}
                    />
                  </Col>
                  <Col md={4}>
                    <Form.Control 
                      type="text"
                      placeholder={`Texto da Opção ${index + 1}`}
                      value={opt.option_text || ''}
                      onChange={(e) => handleOptionChange(index, 'option_text', e.target.value)}
                    />
                  </Col>
                  <Col md={4}>
                    <InputGroup>
                      <InputGroup.Text>➝ Ir para:</InputGroup.Text>
                      <Form.Select
                        value={opt.next_step_id_on_select || "null"}
                        onChange={(e) => handleOptionChange(index, 'next_step_id_on_select', e.target.value)}
                      >
                        <option value="null">Finalizar o fluxo</option>
                        {allSteps.map((step, stepIndex) => (
                          step.id !== stepData.id &&
                          <option key={step.id} value={step.id}>
                            Etapa {stepIndex + 1} ({step.step_type})
                          </option>
                        ))}
                      </Form.Select>
                    </InputGroup>
                  </Col>
                  <Col md={2} className="text-end">
                    <Button variant="danger" size="sm" onClick={() => removeOption(index)}>X</Button>
                  </Col>
                </Row>
              ))}
              <Button variant="outline-primary" onClick={addOption}>Adicionar Opção</Button>
            </Card>
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
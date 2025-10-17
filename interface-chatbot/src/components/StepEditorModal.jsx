// src/components/StepEditorModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Form, Row, Col, InputGroup, Card } from 'react-bootstrap';
import { toast } from 'react-toastify';
import api from '../services/api';
import ContentEditable from 'react-contenteditable';
import './StepEditorModal.css'; // Precisaremos de um CSS para estilizar as tags

// Recebe as novas props 'allSteps' e 'dbCredentials'
function StepEditorModal({ show, onHide, onSave, currentStep, allSteps, dbCredentials, formKeys }) {
  const messageBodyRef = useRef(null); // Ref para o editor de conteúdo
  const [stepData, setStepData] = useState({});
  const [tableColumns, setTableColumns] = useState([]);
  const [databases, setDatabases] = useState([]); // Novo estado para a lista de bancos de dados
  const [tables, setTables] = useState([]); // Novo estado para a lista de tabelas
  const [queryBuilder, setQueryBuilder] = useState({ select: [], where: { column: '', sanitizeColumn: false, sanitizeUserInput: false } });
  const [columnMapping, setColumnMapping] = useState({});
  const isInitialLoad = useRef(true); // Ref para controlar o carregamento inicial

  useEffect(() => {
    // Função para converter texto com {variavel} para HTML com tags
    const textToHtml = (text) => {
      if (!text) return '';
      return text.replace(/{(\w+)}/g, (match, key) => 
        `<span class="variable-tag" contenteditable="false">${key}<button class="delete-tag-btn" data-key="${key}">×</button></span>`
      );
    };

    const initializeState = async () => {
      isInitialLoad.current = true; // Marca o início do carregamento
      // CORREÇÃO: Simplifica a inicialização do estado principal.
      // O stepData agora reflete diretamente a etapa atual, e os campos
      // como database_credential_id, db_name, db_table serão preenchidos.
      const initialStepData = {
        ...currentStep,
        poll_options: currentStep.poll_options || [],
        message_body_html: textToHtml(currentStep.message_body),
        // Garante que as transformações sejam um array ao carregar
        db_result_transforms: currentStep.db_result_transforms ? JSON.parse(currentStep.db_result_transforms) : []
      };

      // Define o estado inicial sem disparar os useEffects de mudança
      setStepData(initialStepData); 

      // Carrega os dropdowns em cascata
      if (initialStepData.database_credential_id) {
        const dbRes = await api.get(`/database-credentials/${initialStepData.database_credential_id}/databases`);
        setDatabases(dbRes.data);
        if (initialStepData.db_name) {
          const tableRes = await api.get(`/database-credentials/${initialStepData.database_credential_id}/tables?dbName=${initialStepData.db_name}`);
          setTables(tableRes.data);
          // CORREÇÃO: Se a tabela também já estiver definida, busca as colunas imediatamente.
          if (initialStepData.db_table) {
            const colRes = await api.get(`/database-credentials/${initialStepData.database_credential_id}/databases/${initialStepData.db_name}/tables/${initialStepData.db_table}/columns`);
            setTableColumns(colRes.data);
          }
        }
      }

      // CORREÇÃO: Carrega o mapeamento correto (db_column_mapping para FORM_SUBMIT)
      // para o estado 'columnMapping' separado.
      if (currentStep.step_type === 'FORM_SUBMIT' && currentStep.db_column_mapping) {
        try { setColumnMapping(JSON.parse(currentStep.db_column_mapping)); } catch (e) { setColumnMapping({}); }
      } else if (currentStep.step_type === 'QUESTION_TEXT' && currentStep.db_query_result_mapping) {
        try { setColumnMapping(JSON.parse(currentStep.db_query_result_mapping)); } catch (e) { setColumnMapping({}); }
      } else {
        setColumnMapping({});
      }

      // CORREÇÃO: Extrai dados da query SQL para preencher o Query Builder de forma mais robusta.
      if (currentStep.db_query) {
        const selectMatch = currentStep.db_query.match(/SELECT\s+(.*?)\s+FROM/i);
        const whereMatch = currentStep.db_query.match(/WHERE\s+(.*?)\s*=/i);
        setQueryBuilder({
          select: selectMatch && selectMatch[1] !== '*' ? selectMatch[1].split(',').map(s => s.trim()) : [],
          where: {
            column: whereMatch ? whereMatch[1].trim() : '',
            sanitizeColumn: whereMatch ? whereMatch[1].includes('REGEXP_REPLACE') : false,
            sanitizeUserInput: currentStep.db_query.includes('REGEXP_REPLACE(REPLACE(:userInput')
          }
        });
      } else {
        setQueryBuilder({ select: [], where: { column: '', sanitizeColumn: false, sanitizeUserInput: false } });
      }
      isInitialLoad.current = false; // Marca o fim do carregamento
    }

    if (show && currentStep) {
      initializeState();
    } else if (!show) {
      // Limpa tudo ao fechar
      setStepData({});
    }
    // Limpa as colunas ao fechar/trocar de etapa
    if (!show) {
      setTableColumns([]);
      setDatabases([]);
      setTables([]);
      // CORREÇÃO: Limpa o query builder e o mapeamento ao fechar
      setQueryBuilder({ select: [], where: { column: '', sanitizeColumn: false, sanitizeUserInput: false } });
      setColumnMapping({});
    }
  }, [currentStep, show]);

  // Efeito para buscar os bancos de dados QUANDO A CONEXÃO MUDA (ação do usuário)
  useEffect(() => {
    if (isInitialLoad.current) return; // Não executa na carga inicial

    const fetchDatabases = async () => {
      if (stepData.database_credential_id) {
        try {
          const response = await api.get(`/database-credentials/${stepData.database_credential_id}/databases`);
          setDatabases(response.data);
        } catch (error) {
          setDatabases([]);
          toast.error(error.response?.data?.message || "Erro ao buscar bancos de dados.");
        }
      } else {
        setDatabases([]);
      }
    };

    // Limpa os campos seguintes
    setStepData(prev => ({ ...prev, db_name: '', db_table: '' }));
    setTables([]);
    setTableColumns([]);
    fetchDatabases();
  }, [stepData.database_credential_id]);

  // Efeito para buscar as tabelas QUANDO O BANCO DE DADOS MUDA (ação do usuário)
  useEffect(() => {
    if (isInitialLoad.current) return; // Não executa na carga inicial

    const fetchTables = async () => {
      if (stepData.db_name) {
        try {
          const response = await api.get(`/database-credentials/${stepData.database_credential_id}/tables?dbName=${stepData.db_name}`);
          setTables(response.data);
        } catch (error) {
          setTables([]);
          toast.warn(error.response?.data?.message || 'Não foi possível buscar as tabelas.');
        }
      } else {
        setTables([]);
      }
    };

    // Limpa o campo seguinte
    setStepData(prev => ({ ...prev, db_table: '' }));
    setTableColumns([]);
    fetchTables();
  }, [stepData.db_name]);

  // Efeito para buscar as colunas QUANDO A TABELA MUDA (ação do usuário)
  useEffect(() => {
    if (isInitialLoad.current) return; // Não executa na carga inicial

    const fetchColumns = async () => {
      if (stepData.db_table) {
        try {
          const url = `/database-credentials/${stepData.database_credential_id}/databases/${stepData.db_name}/tables/${stepData.db_table}/columns`;
          const response = await api.get(url);
          setTableColumns(response.data);
        } catch (error) {
          setTableColumns([]);
          toast.warn(error.response?.data?.message || 'Não foi possível buscar as colunas da tabela.');
        }
      } else {
        setTableColumns([]);
      }
    };

    fetchColumns();
  }, [stepData.db_table]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Se o valor for a string "null", converte para o valor nulo real
    setStepData({ ...stepData, [name]: value === "null" ? null : value });

    // CORREÇÃO: Se o tipo da etapa for mudado para Enquete,
    // garante que o array de opções seja inicializado.
    if (name === 'step_type' && (value === 'QUESTION_POLL' || value === 'QUESTION_AI_CHOICE')) {
      setStepData(prev => ({ ...prev, poll_options: prev.poll_options || [] , step_type: value }));
    }
  };

  const handleTransformChange = (e) => {
    const { value, checked } = e.target;
    setStepData(prev => {
      const currentTransforms = prev.db_result_transforms || [];
      if (checked) {
        // Adiciona se não estiver presente
        return { ...prev, db_result_transforms: [...currentTransforms, value] };
      } else {
        // Remove
        return { ...prev, db_result_transforms: currentTransforms.filter(t => t !== value) };
      }
    });
  };

  const handleMessageBodyChange = (evt) => {
    const html = evt.target.value;
    const text = html.replace(/<span class="variable-tag".*?>(.*?)<button.*?<\/button><\/span>/g, '{$1}');
    // Evita atualizações desnecessárias se apenas o cursor se moveu
    if (html !== stepData.message_body_html) {
      setStepData(prev => ({ ...prev, message_body_html: html, message_body: text }));
    }
  };

  // CORREÇÃO: Intercepta o evento de colar para inserir apenas texto puro.
  // Isso evita que tags HTML como <p> sejam inseridas ao colar conteúdo.
  const handlePaste = (e) => {
    e.preventDefault(); // Impede o comportamento padrão de colar.
    // Pega o conteúdo da área de transferência como texto plano.
    const text = e.clipboardData.getData('text/plain');
    // Insere o texto plano na posição atual do cursor.
    document.execCommand('insertText', false, text);
  };

  // CORREÇÃO: Manipula o HTML como string para garantir a atualização do estado.
  const handleTagClick = (e) => {
    if (e.target.classList.contains('delete-tag-btn')) {
      e.preventDefault(); // Impede qualquer comportamento padrão do clique.
      const tagSpan = e.target.closest('.variable-tag');
      if (tagSpan) {
        // Pega o HTML externo do span que será removido.
        const tagHtmlToRemove = tagSpan.outerHTML;
        // Pega o HTML atual do estado.
        const currentHtml = stepData.message_body_html || '';
        // Cria o novo HTML substituindo a tag clicada por uma string vazia.
        const newHtml = currentHtml.replace(tagHtmlToRemove, '');
        handleMessageBodyChange({ target: { value: newHtml } });
      }
    }
  };

  const handleAddVariable = (key) => {
    const tagHtml = `<span class="variable-tag" contenteditable="false">${key}<button class="delete-tag-btn" data-key="${key}">×</button></span>`;
    const currentHtml = stepData.message_body_html || '';
    // CORREÇÃO: Remove a adição do '&nbsp;'
    const newHtml = currentHtml + tagHtml;
    const newText = newHtml.replace(/<span class="variable-tag".*?>(.*?)<button.*?<\/button><\/span>/g, '{$1}');

    setStepData(prev => ({ ...prev, message_body_html: newHtml, message_body: newText }));

    // Foca no editor após a inserção
    setTimeout(() => messageBodyRef.current?.focus(), 0);
  };

  const handleQueryBuilderChange = (part, field, value) => {
    setQueryBuilder(prev => ({
      ...prev,
      [part]: typeof field === 'string' ? { ...prev[part], [field]: value } : value
    }));
  };

  // Efeito para construir a query SQL a partir do Query Builder
  useEffect(() => {
    if (stepData.step_type !== 'QUESTION_TEXT' || !queryBuilder.where.column || !stepData.db_table) return;

    const sanitize = (field, doSanitize) => doSanitize ? `REGEXP_REPLACE(REPLACE(${field}, ' ', ''), '[^0-9]', '')` : field;
    const newQuery = `SELECT ${queryBuilder.select.join(', ') || '*'} FROM ${stepData.db_table} WHERE ${sanitize(queryBuilder.where.column, queryBuilder.where.sanitizeColumn)} = ${sanitize(':userInput', queryBuilder.where.sanitizeUserInput)}`;
    setStepData(prev => ({ ...prev, db_query: newQuery }));
  }, [queryBuilder, stepData.db_table, stepData.step_type]);

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
    // Adiciona uma chave temporária para novas opções para evitar o erro de "duplicate key"
    const newOption = { 
      option_text: '', 
      trigger_keyword: '', 
      next_step_id_on_select: null,
      temp_key: `new_${Date.now()}` // Chave temporária única
    };
    const newOptions = [...stepData.poll_options, newOption];
    setStepData({ ...stepData, poll_options: newOptions });
  };

  const removeOption = (index) => {
    const newOptions = stepData.poll_options.filter((_, i) => i !== index);
    setStepData({ ...stepData, poll_options: newOptions });
  };

  const handleSave = () => {
    // CORREÇÃO: Garante que ambos os campos de mapeamento sejam tratados corretamente.
    const finalStepData = { ...stepData };

    if (stepData.step_type === 'QUESTION_TEXT') {
      // Para perguntas com consulta, salva o mapeamento de resultados e zera o de colunas.
      finalStepData.db_query_result_mapping = JSON.stringify(columnMapping);
      finalStepData.db_column_mapping = null;
    } else if (stepData.step_type === 'FORM_SUBMIT') {
      // Para envio de formulário, salva o mapeamento de colunas e zera o de resultados.
      finalStepData.db_column_mapping = JSON.stringify(columnMapping);
      finalStepData.db_query_result_mapping = null;
    } else {
      // Para outros tipos de etapa, zera ambos os mapeamentos.
      finalStepData.db_column_mapping = null;
      finalStepData.db_query_result_mapping = null;
    }
    onSave(finalStepData);
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
              <option value="QUESTION_AI_CHOICE">Pergunta (Decisão por IA)</option>
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

          {/* ÁREA DE VARIÁVEIS CLICÁVEIS */}
          {formKeys && formKeys.length > 0 && (
            <Form.Group className="mb-2">
              <Form.Label className="me-2">Variáveis disponíveis:</Form.Label>
              {formKeys.map(key => (
                <Button key={key} variant="outline-secondary" size="sm" className="me-1 mb-1" onClick={() => handleAddVariable(key)}>
                  {`{${key}}`}
                </Button>
              ))}
            </Form.Group>
          )}

          <Form.Group className="mb-3">
            <Form.Label>Texto da Mensagem do Bot</Form.Label>
            <ContentEditable
              innerRef={messageBodyRef}
              html={stepData.message_body_html || ''}
              onChange={handleMessageBodyChange}
              onClick={handleTagClick}
              onPaste={handlePaste}
              className="form-control content-editable-wrapper"
            />
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
          
          {(stepData.step_type === 'QUESTION_TEXT' || stepData.step_type === 'QUESTION_POLL' || stepData.step_type === 'QUESTION_AI_CHOICE') && (
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
                <Form.Label>Banco de Dados</Form.Label>
                <Form.Select name="db_name" value={stepData.db_name || ''} onChange={handleChange} disabled={!stepData.database_credential_id || databases.length === 0}>
                  <option value="">{stepData.database_credential_id ? 'Selecione um banco de dados...' : 'Selecione uma conexão primeiro'}</option>
                  {databases.map(db => (
                    <option key={db} value={db}>{db}</option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Tabela de Destino</Form.Label>
                <Form.Select name="db_table" value={stepData.db_table || ''} onChange={handleChange} disabled={!stepData.db_name || tables.length === 0}>
                  <option value="">{stepData.db_name ? 'Selecione uma tabela...' : 'Selecione um banco de dados primeiro'}</option>
                  {tables.map(table => (
                    <option key={table} value={table}>{table}</option>
                  ))}
                </Form.Select>
              </Form.Group>

              {tableColumns.length > 0 && (
                <div className="border p-3 rounded bg-white">
                  <Form.Group className="mb-3">
                    <Form.Label>Colunas para buscar (SELECT)</Form.Label>
                    <Form.Select multiple value={queryBuilder.select} onChange={e => handleQueryBuilderChange('select', null, Array.from(e.target.selectedOptions, option => option.value))}>
                      {tableColumns.map(col => <option key={col} value={col}>{col}</option>)}
                    </Form.Select>
                    <Form.Text>Segure Ctrl (ou Cmd) para selecionar múltiplas colunas. Se nenhuma for selecionada, a query usará `SELECT *`.</Form.Text>
                  </Form.Group>

                  <Form.Label className="fw-bold">Condição (WHERE)</Form.Label>
                  <Row className="g-2 align-items-center">
                    <Col>
                      <Form.Select value={queryBuilder.where.column} onChange={e => handleQueryBuilderChange('where', 'column', e.target.value)}>
                        <option value="">Selecione a coluna...</option>
                        {tableColumns.map(col => <option key={col} value={col}>{col}</option>)}
                      </Form.Select>
                    </Col>
                    <Col xs="auto" className="text-center">
                      <Form.Check type="switch" id="sanitize-column" label="Limpar para números" checked={queryBuilder.where.sanitizeColumn} onChange={e => handleQueryBuilderChange('where', 'sanitizeColumn', e.target.checked)} />
                    </Col>
                    <Col xs="auto" className="text-center fw-bold">=</Col>
                    <Col>
                      <Form.Control type="text" value=":userInput" disabled />
                    </Col>
                    <Col xs="auto" className="text-center">
                      <Form.Check type="switch" id="sanitize-userinput" label="Limpar para números" checked={queryBuilder.where.sanitizeUserInput} onChange={e => handleQueryBuilderChange('where', 'sanitizeUserInput', e.target.checked)} />
                    </Col>
                  </Row>
                </div>
              )}

              <Form.Group className="mt-3">
                <Form.Label>Query SQL (Gerada automaticamente)</Form.Label>
                <Form.Control 
                  as="textarea" 
                  rows={3} 
                  name="db_query" 
                  value={stepData.db_query || ''} 
                  onChange={handleChange} 
                  placeholder="A query será montada aqui..."
                  readOnly
                  className="bg-light"
                />
              </Form.Group>
              
              <Form.Group className="mb-3 mt-3">
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

              {queryBuilder.select.length > 0 && (
                <Card className="p-3 mb-3 border-secondary">
                  <Card.Title className="h6">Mapeamento dos Resultados</Card.Title>
                  <Form.Text className="d-block mb-2">
                    Digite o nome da variável para salvar o valor de cada coluna retornada. Ex: `nome_cliente`.
                  </Form.Text>
                  {(queryBuilder.select.length > 0 ? queryBuilder.select : tableColumns).map(col => (
                    <InputGroup className="mb-2" key={col}>
                      <InputGroup.Text style={{ minWidth: '120px' }}>{col}</InputGroup.Text>
                      <Form.Control
                        type="text"
                        placeholder="Nome da variável..."
                        value={columnMapping[col] || ''}
                        onChange={(e) => handleMappingChange(col, e.target.value)}
                      />
                    </InputGroup>
                  ))}
                </Card>
              )}

              {/* Transformações de String */}
              {(queryBuilder.select.length > 0 || tableColumns.length > 0) && (
                <Card className="p-3 mb-3 mt-3 border-secondary">
                  <Card.Title className="h6">Transformações de Resultado (Opcional)</Card.Title>
                  <Form.Text className="d-block mb-2">
                    Aplique uma ou mais transformações aos valores retornados do banco de dados. Elas serão aplicadas na ordem selecionada.
                  </Form.Text>
                  <Form.Check type="checkbox" id="transform-upper" label="Converter para maiúsculas (UPPERCASE)" value="UPPERCASE" checked={(stepData.db_result_transforms || []).includes('UPPERCASE')} onChange={handleTransformChange} />
                  <Form.Check type="checkbox" id="transform-lower" label="Converter para minúsculas (lowercase)" value="LOWERCASE" checked={(stepData.db_result_transforms || []).includes('LOWERCASE')} onChange={handleTransformChange} />
                  <Form.Check type="checkbox" id="transform-title" label="Converter para título (Title Case)" value="TITLECASE" checked={(stepData.db_result_transforms || []).includes('TITLECASE')} onChange={handleTransformChange} />
                  <Form.Check type="checkbox" id="transform-trunc1" label="Truncar no primeiro espaço (obter primeira palavra)" value="TRUNCATE_FIRST_SPACE" checked={(stepData.db_result_transforms || []).includes('TRUNCATE_FIRST_SPACE')} onChange={handleTransformChange} />
                  <Form.Check type="checkbox" id="transform-trunc2" label="Truncar no segundo espaço (obter duas primeiras palavras)" value="TRUNCATE_SECOND_SPACE" checked={(stepData.db_result_transforms || []).includes('TRUNCATE_SECOND_SPACE')} onChange={handleTransformChange} />
                </Card>
              )}

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
          {(stepData.step_type === 'QUESTION_POLL' || stepData.step_type === 'QUESTION_AI_CHOICE') && stepData.poll_options && (
            <Card className="p-3">
              <Card.Title>
                {stepData.step_type === 'QUESTION_AI_CHOICE' ? 'Opções para Decisão da IA' : 'Opções da Enquete (Menu)'}
              </Card.Title>
              {stepData.step_type === 'QUESTION_AI_CHOICE' && (
                <Form.Text className="d-block mb-3 p-2 bg-info bg-opacity-10 border border-info rounded">Estas opções <b>não</b> serão exibidas ao usuário. A IA usará o "Gatilho" e o "Texto da Opção" para decidir o melhor caminho com base na resposta do cliente.</Form.Text>
              )}

              {stepData.poll_options.map((opt, index) => (
                <Row key={opt.id || opt.temp_key || index} className="mb-2 align-items-center">
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
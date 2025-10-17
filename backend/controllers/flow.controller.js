// /controllers/flow.controller.js
const db = require("../models");
const Flow = db.flows;
const FlowStep = db.flow_steps;
const { Sequelize } = require("sequelize");
const PollOption = db.poll_options;

// --- Fluxos Principais ---
exports.createFlow = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  const { name, trigger_keyword, target_audience } = req.body;

  if (trigger_keyword === '*') {
    const existingDefault = await Flow.findOne({ where: { trigger_keyword: '*' } });
    if (existingDefault) {
      return res.status(400).send({ message: "Já existe um fluxo padrão. Só é permitido um." });
    }
  }

  try {
    const newFlow = await Flow.create({
      name: req.body.name,
      trigger_keyword: req.body.trigger_keyword,
      target_audience: target_audience || 'customer'
    }, { transaction });

    const initialStep = await FlowStep.create({
      flow_id: newFlow.id,
      step_type: 'MESSAGE',
      message_body: 'Bem-vindo ao seu novo fluxo! Edite esta primeira etapa para começar.'
    }, { transaction });

    newFlow.initial_step_id = initialStep.id;
    await newFlow.save({ transaction });

    await transaction.commit();
    res.send(newFlow);
  } catch (error) {
    await transaction.rollback();
    console.error("Erro ao criar fluxo:", error);
    res.status(500).send({ message: "Erro ao criar fluxo: " + error.message });
  }
};

exports.findAllFlows = (req, res) => Flow.findAll({ order: [['name', 'ASC']] }).then(d => res.send(d)).catch(e => res.status(500).send(e));

// CORREÇÃO: Movida a ordenação para dentro do 'include' e melhorado o tratamento de erro.
exports.findFlowById = (req, res) => {
  Flow.findByPk(req.params.id, {
    include: [{
      model: FlowStep,
      as: 'steps',
      include: [{
        model: PollOption,
        as: 'poll_options',
      }]
    }],
    // CORREÇÃO: Simplificando a sintaxe da ordenação para evitar o EagerLoadingError.
    // Esta sintaxe é mais direta e menos propensa a erros de associação.
    order: [
      ['steps', 'position_y', 'ASC'],
      ['steps', 'position_x', 'ASC']
    ]
  }).then(flow => {
    if (!flow) {
      return res.status(404).send({ message: `Fluxo com id=${req.params.id} não encontrado.` });
    }
    res.send(flow);
  }).catch(e => {
    console.error(`Erro detalhado ao buscar fluxo por ID (${req.params.id}):`, e);
    res.status(500).send({ message: "Erro ao buscar dados do fluxo.", error: e.message });
  });
};

exports.deleteFlow = async (req, res) => {
  const { id } = req.params;
  const transaction = await db.sequelize.transaction();
  try {
    // Encontra todas as etapas associadas ao fluxo
    const steps = await FlowStep.findAll({ where: { flow_id: id }, attributes: ['id'], transaction });
    const stepIds = steps.map(s => s.id);

    // Apaga as opções de enquete dessas etapas, se houver
    if (stepIds.length > 0) {
      await PollOption.destroy({ where: { step_id: stepIds }, transaction });
    }

    // Apaga as etapas
    await FlowStep.destroy({ where: { flow_id: id }, transaction });

    // Apaga o fluxo
    await Flow.destroy({ where: { id: id }, transaction });

    await transaction.commit();
    res.send({ message: "Fluxo e todas as suas etapas foram deletados com sucesso." });
  } catch (e) {
    await transaction.rollback();
    res.status(500).send({ message: "Erro ao deletar o fluxo.", error: e.message });
  }
};

// --- Etapas do Fluxo ---
// SUBSTITUA a função 'addStepToFlow' por esta:
exports.addStepToFlow = async (req, res) => { // CORREÇÃO: Adicionado db_column_mapping
    const { flowId } = req.params;
    // Adicionando db_name
    // CORREÇÃO: Adiciona position_x e position_y para salvar a posição da nova etapa.
    const { message_body, step_type, form_field_key, next_step_id, next_step_id_on_fail, poll_options, database_credential_id, db_name, db_table, extra_sql, db_query, db_query_result_mapping, db_column_mapping, db_result_transforms, position_x, position_y } = req.body;
    const transaction = await db.sequelize.transaction();
    try {
        const newStep = await FlowStep.create({
            flow_id: flowId,
            message_body,
            step_type,
            form_field_key,
            next_step_id, // <-- SALVA o próximo passo para MESSAGE e QUESTION_TEXT
            next_step_id_on_fail, // <-- SALVA o passo em caso de falha
            // Database integration fields
            database_credential_id,
            db_name,
            db_table,
            extra_sql,
            db_query,
            db_query_result_mapping,
            db_column_mapping,
            db_result_transforms: db_result_transforms ? JSON.stringify(db_result_transforms) : null,
            position_x,
            position_y
        }, { transaction });

        if ((step_type === 'QUESTION_POLL' || step_type === 'QUESTION_AI_CHOICE') && poll_options) {
            for (const opt of poll_options) {
                await PollOption.create({
                    step_id: newStep.id,
                    option_text: opt.option_text,
                    trigger_keyword: opt.trigger_keyword,
                    // Salva o próximo passo definido pelo admin
                    next_step_id_on_select: opt.next_step_id_on_select 
                }, { transaction });
            }
        }
        await transaction.commit();
        // CORREÇÃO: Busca a etapa recém-criada com todas as suas associações
        // para garantir que o objeto retornado esteja completo.
        const finalStep = await FlowStep.findByPk(newStep.id, { include: [{ model: PollOption, as: 'poll_options' }] });
        res.send(finalStep);
    } catch(e) {
        await transaction.rollback();
        console.error('Erro ao criar etapa:', e);
        res.status(500).send({ message: "Erro ao criar a etapa.", error: e.message });
    }
};


exports.updateStep = async (req, res) => { // CORREÇÃO: Adicionado db_column_mapping
    const { stepId } = req.params;
    // Adicionando db_name
    const { message_body, step_type, form_field_key, next_step_id, next_step_id_on_fail, poll_options, database_credential_id, db_name, db_table, extra_sql, db_query, db_query_result_mapping, db_column_mapping, db_result_transforms } = req.body;
    const transaction = await db.sequelize.transaction();
    try {
        // Atualiza os dados principais, incluindo o 'next_step_id'
        await FlowStep.update(
            { message_body, step_type, form_field_key, next_step_id, next_step_id_on_fail,
              // Database integration fields
              database_credential_id,
              db_name,
              db_table,
              extra_sql,
              db_query,
              db_query_result_mapping,
              db_column_mapping,
              db_result_transforms: db_result_transforms ? JSON.stringify(db_result_transforms) : null
            },
            { where: { id: stepId }, transaction }
        );

        // 2. Se for uma enquete, atualiza as opções
        if ((step_type === 'QUESTION_POLL' || step_type === 'QUESTION_AI_CHOICE') && poll_options) {
            // Apaga as opções antigas
            await PollOption.destroy({ where: { step_id: stepId }, transaction });
            // Cria as novas opções com os novos destinos
            for (const opt of poll_options) {
                await PollOption.create({
                    step_id: stepId,
                    option_text: opt.option_text,
                    trigger_keyword: opt.trigger_keyword,
                    next_step_id_on_select: opt.next_step_id_on_select
                }, { transaction });
            }
        }
        
        await transaction.commit();
        res.send({ message: "Etapa atualizada."});
    } catch(e) {
        await transaction.rollback();
        res.status(500).send(e);
    }
};

exports.deleteStep = (req, res) => FlowStep.destroy({ where: { id: req.params.stepId } }).then(() => res.send({ message: "Etapa deletada."})).catch(e => res.status(500).send(e));

// --- Posição da Etapa ---
exports.updateStepPosition = async (req, res) => {
  const { stepId } = req.params;
  const { x, y } = req.body.position;

  try {
    await FlowStep.update(
      { position_x: x, position_y: y },
      { where: { id: stepId } }
    );
    res.send({ message: "Posição da etapa atualizada com sucesso." });
  } catch (error) {
    res.status(500).send({ message: "Erro ao atualizar a posição da etapa.", error: error.message });
  }
};

exports.getTablesFromCredential = async (req, res) => {
  const { id } = req.params;
  const { dbName } = req.query; // <-- Pega o nome do banco da query string

  if (!dbName) {
    return res.status(400).send({ message: "O nome do banco de dados (dbName) é obrigatório na query." });
  }
  try {
    const creds = await db.database_credentials.findByPk(id);
    if (!creds) {
      return res.status(404).send({ message: "Credencial de banco de dados não encontrada." });
    }
    // Usa o dbName fornecido na query para conectar
    const externalDb = new Sequelize(dbName, creds.user, creds.pass, {
      host: creds.host,
      port: creds.port,
      dialect: creds.dialect || 'mysql',
      logging: false
    });

    await externalDb.authenticate();
    const tables = await externalDb.getQueryInterface().showAllTables();
    await externalDb.close();

    res.send(tables);
  } catch (error) {
    res.status(500).send({ message: "Erro ao buscar tabelas.", error: error.message });
  }
};

// Get columns for a specific table
exports.getTableColumns = async (req, res) => {
  const { id, dbName, tableName } = req.params;

  if (!dbName || !tableName) {
    return res.status(400).send({ message: "O nome do banco de dados e da tabela são obrigatórios." });
  }

  try {
    const creds = await db.database_credentials.findByPk(id);
    if (!creds) {
      return res.status(404).send({ message: "Conexão com o banco de dados não encontrada." });
    }

    const externalDb = new Sequelize(dbName, creds.user, creds.pass, {
      host: creds.host,
      port: creds.port,
      dialect: creds.dialect || 'mysql',
      logging: false,
    });

    await externalDb.authenticate();
    const columns = await externalDb.getQueryInterface().describeTable(tableName);
    await externalDb.close();

    const columnNames = Object.keys(columns);
    res.send(columnNames);
  } catch (error) {
    if (error.name === 'SequelizeDatabaseError' && (error.parent?.code === 'ER_NO_SUCH_TABLE' || error.message.includes('does not exist'))) {
        return res.status(404).send({ message: `Tabela "${tableName}" não encontrada no banco de dados.` });
    }
    console.error("Erro ao buscar colunas da tabela:", error);
    res.status(500).send({ message: error.message || "Ocorreu um erro ao buscar as colunas da tabela." });
  }
};
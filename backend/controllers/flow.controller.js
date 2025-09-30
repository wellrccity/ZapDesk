// /controllers/flow.controller.js
const db = require("../models");
const Flow = db.flows;
const FlowStep = db.flow_steps;
const PollOption = db.poll_options;

// --- Fluxos Principais ---
exports.createFlow = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  const { name, trigger_keyword } = req.body;

  if (trigger_keyword === '*') {
    const existingDefault = await Flow.findOne({ where: { trigger_keyword: '*' } });
    if (existingDefault) {
      return res.status(400).send({ message: "Já existe um fluxo padrão. Só é permitido um." });
    }
  }

  try {
    const newFlow = await Flow.create({
      name: req.body.name,
      trigger_keyword: req.body.trigger_keyword
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
exports.findFlowById = (req, res) => {
  Flow.findByPk(req.params.id, {
    include: [{
      model: FlowStep,
      as: 'steps',
      include: [{
        model: PollOption,
        as: 'poll_options'
      }]
    }],
    order: [[{ model: FlowStep, as: 'steps' }, 'createdAt', 'ASC']]
  }).then(d => res.send(d)).catch(e => res.status(500).send(e));
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
exports.addStepToFlow = async (req, res) => {
    const { flowId } = req.params;
    // Agora esperamos receber 'next_step_id' também
    const { message_body, step_type, form_field_key, next_step_id, next_step_id_on_fail, poll_options, db_dialect, db_host, db_port, db_user, db_pass, db_name, db_table, extra_sql,
            db_query, db_query_result_mapping } = req.body;
    const transaction = await db.sequelize.transaction();
    try {
        const newStep = await FlowStep.create({
            flow_id: flowId,
            message_body,
            step_type,
            form_field_key,
            next_step_id, // <-- SALVA o próximo passo para MESSAGE e QUESTION_TEXT
            next_step_id_on_fail, // <-- SALVA o passo em caso de falha
            // Database integration fields (only relevant for FORM_SUBMIT)
            db_dialect,
            db_host,
            db_port,
            db_user,
            db_pass,
            db_name,
            db_table,
            extra_sql,
            db_query,
            db_query_result_mapping
        }, { transaction });

        if (step_type === 'QUESTION_POLL' && poll_options) {
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
        res.status(500).send(e);
    }
};


exports.updateStep = async (req, res) => {
    const { stepId } = req.params;
    // Recebe 'next_step_id' aqui também
    const { message_body, step_type, form_field_key, next_step_id, next_step_id_on_fail, poll_options, db_dialect, db_host, db_port, db_user, db_pass, db_name, db_table, extra_sql,
            db_query, db_query_result_mapping } = req.body;
    const transaction = await db.sequelize.transaction();
    try {
        // Atualiza os dados principais, incluindo o 'next_step_id'
        await FlowStep.update(
            { message_body, step_type, form_field_key, next_step_id, next_step_id_on_fail,
              // Database integration fields (only relevant for FORM_SUBMIT)
              db_dialect,
              db_host,
              db_port,
              db_user,
              db_pass,
              db_name,
              db_table,
              extra_sql,
              db_query,
              db_query_result_mapping
            },
            { where: { id: stepId }, transaction }
        );

        // 2. Se for uma enquete, atualiza as opções
        if (step_type === 'QUESTION_POLL' && poll_options) {
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
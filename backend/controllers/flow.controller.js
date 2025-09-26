// /controllers/flow.controller.js
const db = require("../models");
const Flow = db.flows;
const FlowStep = db.flow_steps;
const PollOption = db.poll_options;

// --- Fluxos Principais ---
// SUBSTITUA A FUNÇÃO 'createFlow' PELA VERSÃO ABAIXO
exports.createFlow = async (req, res) => {
  // Usamos uma 'transaction' para garantir que ou tudo dá certo, ou nada é salvo.
  const transaction = await db.sequelize.transaction();

  try {
    // 1. Cria o fluxo principal dentro da transação
    const newFlow = await Flow.create({
      name: req.body.name,
      trigger_keyword: req.body.trigger_keyword
    }, { transaction });

    // 2. Cria uma primeira etapa padrão para este fluxo
    const initialStep = await FlowStep.create({
      flow_id: newFlow.id,
      step_type: 'MESSAGE',
      message_body: 'Bem-vindo ao seu novo fluxo! Edite esta primeira etapa para começar.'
    }, { transaction });

    // 3. ATUALIZA o fluxo para apontar para sua primeira etapa
    newFlow.initial_step_id = initialStep.id;
    await newFlow.save({ transaction });

    // 4. Se tudo deu certo, confirma a transação
    await transaction.commit();
    
    // 5. Envia o fluxo completo de volta para o frontend
    res.send(newFlow);

  } catch (error) {
    // 6. Se algo deu errado, desfaz todas as operações
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

// --- Etapas do Fluxo ---
exports.addStepToFlow = async (req, res) => {
    const { flowId } = req.params;
    const { message_body, step_type, poll_options } = req.body;
    try {
        const newStep = await FlowStep.create({
            flow_id: flowId,
            message_body,
            step_type
        });

        if (step_type === 'QUESTION_POLL' && poll_options) {
            for (const opt of poll_options) {
                await PollOption.create({
                    step_id: newStep.id,
                    option_text: opt.option_text,
                    // Por padrão, novas opções apontam para si mesmas para evitar erros
                    next_step_id_on_select: newStep.id
                });
            }
        }
        res.send(newStep);
    } catch(e) {
        res.status(500).send(e);
    }
};
exports.updateStep = (req, res) => FlowStep.update(req.body, { where: { id: req.params.stepId } }).then(() => res.send({ message: "Etapa atualizada."})).catch(e => res.status(500).send(e));
exports.deleteStep = (req, res) => FlowStep.destroy({ where: { id: req.params.stepId } }).then(() => res.send({ message: "Etapa deletada."})).catch(e => res.status(500).send(e));
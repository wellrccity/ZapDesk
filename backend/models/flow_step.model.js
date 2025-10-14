module.exports = (sequelize, DataTypes) => {
  const FlowStep = sequelize.define("flow_step", {
    // CORREÇÃO: Adiciona o campo flow_id que estava faltando no modelo.
    flow_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    message_body: { type: DataTypes.TEXT, allowNull: true },
    step_type: {
      type: DataTypes.ENUM(
        'MESSAGE',
        'QUESTION_TEXT',
        'QUESTION_POLL',
        'FORM_SUBMIT',
        'END_FLOW',
        'REQUEST_HUMAN_SUPPORT',
        // Novos tipos de ação
        'LIST_CHATS',
        'ASSIGN_CHAT',
        'ENTER_CONVERSATION_MODE',
        'CLOSE_CHAT'
      ),
      allowNull: false
    },
    next_step_id: { type: DataTypes.INTEGER, allowNull: true }, // Para MESSAGE e QUESTION_TEXT
    next_step_id_on_fail: { type: DataTypes.INTEGER, allowNull: true }, // Para falha em consulta de DB em QUESTION_TEXT
    form_field_key: { type: DataTypes.STRING, allowNull: true }, // Para QUESTION_TEXT e QUESTION_POLL
    // Campos para integração com Banco de Dados
    database_credential_id: { type: DataTypes.INTEGER, allowNull: true },
    db_name: { type: DataTypes.STRING, allowNull: true },
    db_table: { type: DataTypes.STRING, allowNull: true },
    extra_sql: { type: DataTypes.TEXT, allowNull: true },
    db_query: { type: DataTypes.TEXT, allowNull: true },
    db_query_result_mapping: { type: DataTypes.TEXT, allowNull: true },
    db_result_transforms: { type: DataTypes.TEXT, allowNull: true },
    db_column_mapping: { type: DataTypes.TEXT, allowNull: true },
    // Campos para posição no React Flow
    position_x: { type: DataTypes.FLOAT, allowNull: true },
    position_y: { type: DataTypes.FLOAT, allowNull: true }
  }, {
    // CORREÇÃO: Garante que o Sequelize gerencie os campos createdAt e updatedAt.
    timestamps: true
  });

  // CORREÇÃO: Define a associação com o modelo Flow.
  FlowStep.associate = (models) => {
    FlowStep.belongsTo(models.flows, {
      foreignKey: 'flow_id',
      onDelete: 'CASCADE',
    });
    FlowStep.belongsTo(models.database_credentials, {
      foreignKey: 'database_credential_id',
      onDelete: 'SET NULL',
    });
    // CORREÇÃO: Adiciona a associação que faltava com PollOption.
    FlowStep.hasMany(models.poll_options, {
      foreignKey: 'step_id',
      as: 'poll_options',
    });
  };

  return FlowStep;
};
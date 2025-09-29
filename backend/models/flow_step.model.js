module.exports = (sequelize, DataTypes) => {
  const FlowStep = sequelize.define("flow_step", {
    message_body: { type: DataTypes.TEXT, allowNull: true },
    step_type: { 
      type: DataTypes.ENUM('MESSAGE', 'QUESTION_TEXT', 'QUESTION_POLL', 'FORM_SUBMIT', 'END_FLOW'), // <-- Adicionado END_FLOW
      allowNull: false 
    },
    next_step_id: { type: DataTypes.INTEGER, allowNull: true }, // Para MESSAGE e QUESTION_TEXT
    form_field_key: { type: DataTypes.STRING, allowNull: true }, // Para QUESTION_TEXT e QUESTION_POLL
    // Campos para integração com Banco de Dados na etapa FORM_SUBMIT
    db_dialect: { type: DataTypes.STRING, allowNull: true },
    db_host: { type: DataTypes.STRING, allowNull: true },
    db_port: { type: DataTypes.INTEGER, allowNull: true },
    db_user: { type: DataTypes.STRING, allowNull: true },
    db_pass: { type: DataTypes.STRING, allowNull: true },
    db_name: { type: DataTypes.STRING, allowNull: true },
    db_table: { type: DataTypes.STRING, allowNull: true },
    extra_sql: { type: DataTypes.TEXT, allowNull: true },
    db_query: { type: DataTypes.TEXT, allowNull: true }, // Para QUESTION_TEXT
    db_query_result_mapping: { type: DataTypes.TEXT, allowNull: true } // Para QUESTION_TEXT
  });
  return FlowStep;
};
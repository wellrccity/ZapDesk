module.exports = (sequelize, DataTypes) => {
  const FlowStep = sequelize.define("flow_step", {
    message_body: { type: DataTypes.TEXT, allowNull: true },
    step_type: { 
      type: DataTypes.ENUM('MESSAGE', 'QUESTION_TEXT', 'QUESTION_POLL', 'FORM_SUBMIT', 'END_FLOW', 'REQUEST_HUMAN_SUPPORT'),
      allowNull: false 
    },
    next_step_id: { type: DataTypes.INTEGER, allowNull: true }, // Para MESSAGE e QUESTION_TEXT
    next_step_id_on_fail: { type: DataTypes.INTEGER, allowNull: true }, // Para falha em consulta de DB em QUESTION_TEXT
    form_field_key: { type: DataTypes.STRING, allowNull: true }, // Para QUESTION_TEXT e QUESTION_POLL
    // Campos para integração com Banco de Dados
    database_credential_id: { type: DataTypes.INTEGER, allowNull: true }, // <-- NOVO CAMPO
    db_table: { type: DataTypes.STRING, allowNull: true },
    extra_sql: { type: DataTypes.TEXT, allowNull: true },
    db_query: { type: DataTypes.TEXT, allowNull: true }, // Para QUESTION_TEXT
    db_query_result_mapping: { type: DataTypes.TEXT, allowNull: true }, // Para QUESTION_TEXT
    db_column_mapping: { type: DataTypes.TEXT, allowNull: true } // Para FORM_SUBMIT
  });
  return FlowStep;
};
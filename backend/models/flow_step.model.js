module.exports = (sequelize, DataTypes) => {
  const FlowStep = sequelize.define("flow_step", {
    message_body: { type: DataTypes.TEXT },
    step_type: { type: DataTypes.ENUM('MESSAGE', 'QUESTION_TEXT', 'QUESTION_POLL', 'FORM_SUBMIT'), allowNull: false },
    next_step_id: { type: DataTypes.INTEGER, allowNull: true },
    form_field_key: { type: DataTypes.STRING, allowNull: true }
  });
  return FlowStep;
};
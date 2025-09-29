module.exports = (sequelize, DataTypes) => {
  const PollOption = sequelize.define("poll_option", {
    option_text: { type: DataTypes.STRING, allowNull: false },
    trigger_keyword: {
      type: DataTypes.STRING,
      allowNull: true // O gatilho é opcional
    },
    next_step_id_on_select: {
      type: DataTypes.INTEGER,
      allowNull: true // Permitir nulo para "Finalizar o fluxo"
    }
  });
  return PollOption;
};
module.exports = (sequelize, DataTypes) => {
  const PollOption = sequelize.define("poll_option", {
    option_text: { type: DataTypes.STRING, allowNull: false },
    next_step_id_on_select: { type: DataTypes.INTEGER, allowNull: false }
  });
  return PollOption;
};
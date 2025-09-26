module.exports = (sequelize, DataTypes) => {
  const Flow = sequelize.define("flow", {
    name: { type: DataTypes.STRING, allowNull: false },
    trigger_keyword: { type: DataTypes.STRING, allowNull: false, unique: true },
    initial_step_id: { type: DataTypes.INTEGER, allowNull: true }
  });
  return Flow;
};
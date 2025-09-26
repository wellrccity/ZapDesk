module.exports = (sequelize, DataTypes) => {
  const Integration = sequelize.define("integration", {
    name: { type: DataTypes.STRING, allowNull: false },
    type: { type: DataTypes.STRING, allowNull: false },
    target_url: { type: DataTypes.TEXT, allowNull: false },
  });
  return Integration;
};
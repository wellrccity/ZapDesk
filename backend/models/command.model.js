module.exports = (sequelize, DataTypes) => {
  const Command = sequelize.define("command", {
    keyword: { type: DataTypes.STRING, allowNull: false, unique: true },
    response: { type: DataTypes.TEXT, allowNull: false }
  });

  Command.associate = models => {
    Command.belongsTo(models.users, { foreignKey: "created_by", as: "creator" });
  };

  return Command;
};
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define("user", {
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.ENUM('atendente', 'admin'), defaultValue: 'atendente' },
    whatsapp_number: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    }
  });

  User.associate = models => {
    User.hasMany(models.commands, { as: "commands", foreignKey: "created_by" });
    User.hasMany(models.chats, { as: "assignedChats", foreignKey: "assigned_to" });
  };

  return User;
};
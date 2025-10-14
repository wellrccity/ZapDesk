module.exports = (sequelize, DataTypes) => {
  const Chat = sequelize.define("chat", {
    whatsapp_number: { type: DataTypes.STRING, allowNull: false, unique: true },
    status: { type: DataTypes.ENUM('open', 'closed'), defaultValue: 'open' },
    name: { type: DataTypes.STRING, allowNull: true },           // <-- NOVO
    profile_pic_url: { type: DataTypes.TEXT, allowNull: true } // <-- NOVO
  });

  Chat.associate = models => {
    Chat.belongsTo(models.users, { foreignKey: "assigned_to", as: "assignee" });
    Chat.hasMany(models.messages, { as: "messages", foreignKey: "chat_id" });
  };

  return Chat;
};
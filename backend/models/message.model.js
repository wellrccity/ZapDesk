// /models/message.model.js
module.exports = (sequelize, DataTypes) => {
  const Message = sequelize.define("message", {
    body: { type: DataTypes.TEXT, allowNull: true }, // O corpo pode ser nulo para mídias sem legenda
    timestamp: { type: DataTypes.BIGINT, allowNull: false },
    from_me: { type: DataTypes.BOOLEAN, defaultValue: false },
    status: { type: DataTypes.ENUM('sent', 'delivered', 'read'), defaultValue: 'sent' },
    media_url: { type: DataTypes.STRING, allowNull: true },    // <-- NOVA LINHA
    media_type: { type: DataTypes.STRING, allowNull: true } // <-- NOVA LINHA
  });

  Message.associate = models => {
    Message.belongsTo(models.chats, { foreignKey: "chat_id", as: "chat" });
  };

  return Message;
};
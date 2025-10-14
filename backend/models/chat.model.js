// /models/chat.model.js
module.exports = (sequelize, DataTypes) => {
  const Chat = sequelize.define("chats", {
    whatsapp_number: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    status: {
      type: DataTypes.ENUM('open', 'closed', 'autoatendimento'),
      defaultValue: 'autoatendimento'
    },
    name: {
      type: DataTypes.STRING
    },
    profile_pic_url: {
      type: DataTypes.TEXT
    },
    assigned_to: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  });

  Chat.associate = (models) => {
    Chat.hasMany(models.messages, {
      foreignKey: 'chat_id',
      as: 'messages'
    });
    Chat.belongsTo(models.users, {
      foreignKey: 'assigned_to',
      as: 'assignee'
    });
  };

  return Chat;
};
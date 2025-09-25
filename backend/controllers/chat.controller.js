// /controllers/chat.controller.js
const db = require("../models");
const Chat = db.chats;
const Message = db.messages; 

// Lista todos os chats abertos e informações de quem está atendendo
exports.findAllOpen = async (req, res) => {
  try {
    const chats = await Chat.findAll({
      where: { status: 'open' },
      include: [{
        model: db.users,
        as: 'assignee',
        attributes: ['id', 'name']
      }],
      order: [['updatedAt', 'DESC']]
    });
    res.send(chats);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

// Atribui um chat a um usuário (usado para "Assumir" e "Transferir")
exports.assign = async (req, res) => {
  const { chatId } = req.params;
  const { userId } = req.body; // ID do usuário para quem o chat será atribuído

  try {
    const chat = await Chat.findByPk(chatId);
    if (!chat) {
      return res.status(404).send({ message: "Chat não encontrado." });
    }

    chat.assigned_to = userId;
    await chat.save();

    // Retorna o chat atualizado com os dados do novo atendente
    const updatedChat = await Chat.findByPk(chatId, {
      include: [{ model: db.users, as: 'assignee', attributes: ['id', 'name'] }]
    });

    res.send(updatedChat);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};
exports.findMessagesForChat = async (req, res) => {
  const { chatId } = req.params;
  try {
    const messages = await Message.findAll({
      where: { chat_id: chatId },
      order: [['timestamp', 'ASC']] // Ordena da mais antiga para a mais nova
    });
    res.send(messages);
  } catch (error) {
    res.status(500).send({ message: "Erro ao buscar mensagens: " + error.message });
  }
};
exports.closeChat = async (req, res) => {
  const { chatId } = req.params;
  try {
    const chat = await Chat.findByPk(chatId);
    if (!chat) {
      return res.status(404).send({ message: `Chat com id=${chatId} não encontrado.` });
    }

    chat.status = 'closed';
    await chat.save();
    
    res.send({ message: "Chat fechado com sucesso." });

  } catch (error) {
    res.status(500).send({ message: "Erro ao fechar o chat: " + error.message });
  }
};
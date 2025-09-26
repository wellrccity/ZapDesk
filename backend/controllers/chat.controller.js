// ARQUIVO: /controllers/chat.controller.js (Versão Completa e Corrigida)

const db = require("../models");
const Chat = db.chats;
const Message = db.messages; // <-- Garanta que esta linha existe
const User = db.users;      // <-- E esta também

// Busca todos os chats com base no filtro de status
exports.findAll = async (req, res) => {
  const { status } = req.query;
  let whereClause = {};

  if (status && (status === 'open' || status === 'closed')) {
    whereClause.status = status;
  }

  try {
    const chats = await Chat.findAll({
      where: whereClause,
      include: [
        { model: db.users, as: 'assignee', attributes: ['id', 'name'] },
        { model: db.messages, as: 'messages', limit: 1, order: [['timestamp', 'DESC']] }
      ],
      order: [['updatedAt', 'DESC']]
    });
    res.send(chats);
  } catch (error) {
    res.status(500).send({ message: "Erro ao buscar chats: " + error.message });
  }
};

// Atribui um chat a um usuário e envia mensagem automática
exports.assign = async (req, res) => {
  const { chatId } = req.params;
  const { userId } = req.body;

  try {
    const chat = await Chat.findByPk(chatId);
    if (!chat) {
      return res.status(404).send({ message: "Chat não encontrado." });
    }

    const attendant = await User.findByPk(userId);
    if (!attendant) {
      return res.status(404).send({ message: "Atendente não encontrado." });
    }

    chat.assigned_to = userId;
    await chat.save();

    const welcomeMessage = `Olá! Meu nome é ${attendant.name} e darei continuidade ao seu atendimento. 👋`;
    await req.whatsappClient.sendMessage(chat.whatsapp_number, welcomeMessage);

    await Message.create({
      chat_id: chat.id,
      body: welcomeMessage,
      timestamp: Math.floor(Date.now() / 1000),
      from_me: true, // Importante: 'true' para alinhar à direita
      media_type: 'chat',
      });
    const updatedChat = await Chat.findByPk(chatId, {
      include: [{ model: db.users, as: 'assignee', attributes: ['id', 'name'] }]
    });

    res.send(updatedChat);
  } catch (error) {
    console.error("Erro ao assumir chat:", error);
    res.status(500).send({ message: "Erro ao assumir o chat: " + error.message });
  }
};

// Busca as mensagens de um chat
exports.findMessagesForChat = async (req, res) => {
  const { chatId } = req.params;
  try {
    const messages = await Message.findAll({
      where: { chat_id: chatId },
      order: [['timestamp', 'ASC']]
    });
    res.send(messages);
  } catch (error) {
    res.status(500).send({ message: "Erro ao buscar mensagens: " + error.message });
  }
};

// Fecha um chat e envia mensagem automática
exports.closeChat = async (req, res) => {
  const { chatId } = req.params;
  try {
    const chat = await Chat.findByPk(chatId, { include: "assignee" });
    if (!chat) {
      return res.status(404).send({ message: `Chat com id=${chatId} não encontrado.` });
    }

    const attendantName = chat.assignee ? chat.assignee.name : "nosso time";
    const goodbyeMessage = `Seu atendimento foi finalizado por ${attendantName}. Agradecemos o seu contato! 😊`;
    await req.whatsappClient.sendMessage(chat.whatsapp_number, goodbyeMessage);

    await Message.create({
      chat_id: chat.id,
      body: goodbyeMessage,
      timestamp: Math.floor(Date.now() / 1000),
      from_me: true,
      media_type: 'chat',
    });
    
    chat.status = 'closed';
    chat.assigned_to = null;
    await chat.save();
    
    const updatedChat = await Chat.findByPk(chatId, {
        include: [{ model: db.users, as: 'assignee', attributes: ['id', 'name'] }]
    });

    res.send(updatedChat);
  } catch (error) {
    console.error("Erro ao fechar chat:", error);
    res.status(500).send({ message: "Erro ao fechar o chat: " + error.message });
  }
};

// Reabre um chat
exports.reopenChat = async (req, res) => {
  const { chatId } = req.params;
  try {
    const chat = await Chat.findByPk(chatId);
    if (!chat) {
      return res.status(404).send({ message: `Chat com id=${chatId} não encontrado.` });
    }

    chat.status = 'open';
    await chat.save();
    
    const updatedChat = await Chat.findByPk(chatId, {
        include: [{ model: db.users, as: 'assignee', attributes: ['id', 'name'] }]
    });

    res.send(updatedChat);
  } catch (error) {
    res.status(500).send({ message: "Erro ao reabrir o chat: " + error.message });
  }
};
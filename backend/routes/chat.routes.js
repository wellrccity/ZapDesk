// ARQUIVO: /routes/chat.routes.js

const controller = require("../controllers/chat.controller.js");
const { verifyToken } = require("../middleware/authJwt");

// MUDANÇA: A função agora recebe 'app' e 'client'
module.exports = function(app, client) {

  // Middleware simples para anexar o client a cada requisição
  const addClient = (req, res, next) => {
    req.whatsappClient = client;
    next();
  };
  
  // MUDANÇA: Adicione o middleware 'addClient' às rotas que precisam enviar mensagens
  app.get("/api/chats", [verifyToken], controller.findAll);
  app.put("/api/chats/:chatId/assign", [verifyToken, addClient], controller.assign);
  app.get("/api/chats/:chatId/messages", [verifyToken], controller.findMessagesForChat);
  app.put("/api/chats/:chatId/close", [verifyToken, addClient], controller.closeChat);
  app.put("/api/chats/:chatId/reopen", [verifyToken], controller.reopenChat);
};
// ARQUIVO: /routes/chat.routes.js

const controller = require("../controllers/chat.controller.js");
const authJwt = require("../middleware/authJwt.js");

// A função agora recebe apenas 'app' e 'client'
module.exports = function(app, client) {
  // Middleware simples para anexar o client a cada requisição
  const addClient = (req, res, next) => {
    req.whatsappClient = client;
    next();
  };

  // O middleware 'addUserConversationStates' agora é global, então não precisa ser declarado aqui.
  app.get("/api/chats", [authJwt.verifyToken], controller.findAll);
  app.put("/api/chats/:chatId/assign", [authJwt.verifyToken, addClient], controller.assign);
  app.get("/api/chats/:chatId/messages", [authJwt.verifyToken], controller.findMessagesForChat);
  app.put("/api/chats/:chatId/close", [authJwt.verifyToken, addClient], controller.closeChat);
  app.put("/api/chats/:chatId/reopen", [authJwt.verifyToken], controller.reopenChat);
};
// /routes/chat.routes.js
const controller = require("../controllers/chat.controller.js");
const { verifyToken } = require("../middleware/authJwt");

module.exports = function(app) {
  app.get("/api/chats/open", [verifyToken], controller.findAllOpen);
  app.put("/api/chats/:chatId/assign", [verifyToken], controller.assign);
  
  // NOVA ROTA para buscar mensagens
  app.get("/api/chats/:chatId/messages", [verifyToken], controller.findMessagesForChat);
  
  // NOVA ROTA para fechar um chat
  app.put("/api/chats/:chatId/close", [verifyToken], controller.closeChat);
};
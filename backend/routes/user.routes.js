// /routes/user.routes.js
const controller = require("../controllers/user.controller.js");
const { verifyToken, isAdmin } = require("../middleware/authJwt");

module.exports = function(app) {
  // Apenas admins podem ver a lista de todos os usuários
  app.get("/api/users", [verifyToken, isAdmin], controller.findAll);
};
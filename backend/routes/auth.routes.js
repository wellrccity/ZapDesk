const controller = require("../controllers/auth.controller");
const { verifyToken, isAdmin } = require("../middleware/authJwt");

module.exports = function(app) {
  // Rota para criar usuários. Apenas admins podem criar outros usuários.
  app.post("/api/auth/signup", [verifyToken, isAdmin], controller.signup);
  
  app.post("/api/auth/login", controller.login);
};
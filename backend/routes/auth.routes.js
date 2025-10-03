const controller = require("../controllers/auth.controller");
const authJwt = require("../middleware/authJwt.js");

module.exports = function(app) {
  // Rota para criar usuários. Apenas admins podem criar outros usuários.
  app.post("/api/auth/signup", [authJwt.verifyToken, authJwt.isAdmin], controller.signup);
  
  app.post("/api/auth/login", controller.login);
};
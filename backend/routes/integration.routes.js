// /routes/integration.routes.js
const controller = require("../controllers/integration.controller.js");
const { verifyToken, isAdmin } = require("../middleware/authJwt");

module.exports = function(app) {
  // Apenas admins podem gerenciar integrações
  app.post("/api/integrations", [verifyToken, isAdmin], controller.create);
  app.get("/api/integrations", [verifyToken, isAdmin], controller.findAll);
  app.delete("/api/integrations/:id", [verifyToken, isAdmin], controller.delete);
};
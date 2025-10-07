// /routes/database_credential.routes.js
const controller = require("../controllers/database_credential.controller");
const authJwt = require("../middleware/authJwt.js");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Headers", "x-access-token, Origin, Content-Type, Accept");
    next();
  });

  // Rotas para gerenciar as credenciais
  app.post("/api/flows/:flowId/database-credentials", [authJwt.verifyToken, authJwt.isAdmin], controller.create);
  app.get("/api/flows/:flowId/database-credentials", [authJwt.verifyToken, authJwt.isAdmin], controller.findAll);
  app.delete("/api/database-credentials/:id", [authJwt.verifyToken, authJwt.isAdmin], controller.delete);
  app.get("/api/database-credentials/:id/tables/:tableName/columns", [authJwt.verifyToken, authJwt.isAdmin], controller.getTableColumns);
};
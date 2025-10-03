// /routes/user.routes.js
const controller = require("../controllers/user.controller.js");
const authJwt = require("../middleware/authJwt.js");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  // Apenas admins podem ver a lista de todos os usuários
  app.get(
    "/api/users",
    [authJwt.verifyToken, authJwt.isAdmin],
    controller.findAll
  );

  // Rota para atualizar um usuário (admins podem editar qualquer um, usuários podem editar a si mesmos)
  app.put("/api/users/:id", [authJwt.verifyToken], controller.update);
};
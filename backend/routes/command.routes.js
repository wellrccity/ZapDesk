const controller = require("../controllers/command.controller.js");
const { verifyToken, isAdmin } = require("../middleware/authJwt");

module.exports = function(app) {
  app.get("/api/commands", [verifyToken], controller.findAll);
  app.post("/api/commands", [verifyToken, isAdmin], controller.create);
  app.put("/api/commands/:id", [verifyToken, isAdmin], controller.update);
  app.delete("/api/commands/:id", [verifyToken, isAdmin], controller.delete);
};
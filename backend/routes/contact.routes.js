// /routes/contact.routes.js
const controller = require("../controllers/contact.controller");
const authJwt = require("../middleware/authJwt.js");

module.exports = function(app) {
  app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Headers", "x-access-token, Origin, Content-Type, Accept");
    next();
  });

  app.post("/api/contacts", [authJwt.verifyToken], controller.create);
  app.get("/api/contacts", [authJwt.verifyToken], controller.findAll);
  app.put("/api/contacts/:id", [authJwt.verifyToken], controller.update);
  app.delete("/api/contacts/:id", [authJwt.verifyToken], controller.delete);
};
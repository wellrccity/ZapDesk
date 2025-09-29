// /routes/flow.routes.js
const controller = require("../controllers/flow.controller.js");
const { verifyToken, isAdmin } = require("../middleware/authJwt");

module.exports = function(app) {
    app.use("/api/flows", [verifyToken, isAdmin]); // Protege todas as rotas de fluxos

    // Rotas para Fluxos
    app.post("/api/flows", controller.createFlow);
    app.get("/api/flows", controller.findAllFlows);
    app.get("/api/flows/:id", controller.findFlowById);
    app.delete("/api/flows/:id", controller.deleteFlow); // <-- ROTA PARA APAGAR O FLUXO

    // Rotas para Etapas
    app.post("/api/flows/:flowId/steps", controller.addStepToFlow);
    app.put("/api/steps/:stepId", controller.updateStep);
    app.delete("/api/steps/:stepId", controller.deleteStep);
};
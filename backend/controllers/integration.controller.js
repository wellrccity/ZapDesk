// /controllers/integration.controller.js
const db = require("../models");
const Integration = db.integrations;

exports.create = (req, res) => Integration.create(req.body).then(d => res.send(d)).catch(e => res.status(500).send(e));
exports.findAll = (req, res) => Integration.findAll().then(d => res.send(d)).catch(e => res.status(500).send(e));
exports.delete = (req, res) => Integration.destroy({ where: { id: req.params.id } }).then(() => res.send({ message: "Deletado."})).catch(e => res.status(500).send(e));
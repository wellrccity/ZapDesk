const db = require("../models");
const Command = db.commands;

exports.create = async (req, res) => {
  try {
    const command = await Command.create({
      keyword: req.body.keyword,
      response: req.body.response,
      created_by: req.userId
    });
    res.send(command);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

exports.findAll = async (req, res) => {
  try {
    const commands = await Command.findAll();
    res.send(commands);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const num = await Command.update(req.body, { where: { id: req.params.id } });
    if (num == 1) res.send({ message: "Comando atualizado." });
    else res.send({ message: "Não foi possível atualizar o comando." });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const num = await Command.destroy({ where: { id: req.params.id } });
    if (num == 1) res.send({ message: "Comando deletado." });
    else res.send({ message: "Não foi possível deletar o comando." });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};
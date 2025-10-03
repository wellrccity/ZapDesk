// /controllers/contact.controller.js
const db = require("../models");
const Contact = db.contacts;

// Criar um novo contato
exports.create = async (req, res) => {
  const { name, whatsapp_number, address } = req.body;
  if (!name || !whatsapp_number) {
    return res.status(400).send({ message: "Nome e número do WhatsApp são obrigatórios." });
  }

  try {
    const newContact = await Contact.create({ name, whatsapp_number, address });
    res.status(201).send(newContact);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).send({ message: "Este número de WhatsApp já está cadastrado." });
    }
    res.status(500).send({ message: error.message || "Ocorreu um erro ao criar o contato." });
  }
};

// Listar todos os contatos
exports.findAll = async (req, res) => {
  try {
    const contacts = await Contact.findAll({ order: [['name', 'ASC']] });
    res.send(contacts);
  } catch (error) {
    res.status(500).send({ message: error.message || "Ocorreu um erro ao buscar os contatos." });
  }
};

// Atualizar um contato
exports.update = async (req, res) => {
  const id = req.params.id;
  try {
    const num = await Contact.update(req.body, { where: { id: id } });
    if (num == 1) {
      res.send({ message: "Contato atualizado com sucesso." });
    } else {
      res.send({ message: `Não foi possível atualizar o contato com id=${id}. Talvez não tenha sido encontrado.` });
    }
  } catch (error) {
    res.status(500).send({ message: "Erro ao atualizar o contato com id=" + id });
  }
};

// Deletar um contato
exports.delete = async (req, res) => {
  const id = req.params.id;
  try {
    const num = await Contact.destroy({ where: { id: id } });
    if (num == 1) {
      res.send({ message: "Contato deletado com sucesso!" });
    } else {
      res.send({ message: `Não foi possível deletar o contato com id=${id}.` });
    }
  } catch (error) {
    res.status(500).send({ message: "Não foi possível deletar o contato com id=" + id });
  }
};
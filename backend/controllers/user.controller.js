// /controllers/user.controller.js
const db = require("../models");
const User = db.users;

// Lista todos os usuários, exceto o admin que está fazendo a requisição
exports.findAll = async (req, res) => {
  try {
    const users = await User.findAll({
      where: { id: { [db.Sequelize.Op.ne]: req.userId } }, // [Op.ne] significa "not equal"
      attributes: ['id', 'name', 'email', 'role'] // Nunca retorne a senha
    });
    res.send(users);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};
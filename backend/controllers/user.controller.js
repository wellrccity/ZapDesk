// /controllers/user.controller.js
const db = require("../models");
const User = db.users;
 
// Lista todos os usuários
exports.findAll = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'name', 'email', 'role', 'whatsapp_number'], // Nunca retorne a senha
      order: [['name', 'ASC']]
    });
    res.send(users);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

// Atualiza um usuário
exports.update = async (req, res) => {
  const id = req.params.id;
  const { name, email, role, whatsapp_number } = req.body;

  // Verifica se o usuário logado é admin ou está tentando editar o próprio perfil
  if (req.userRole !== 'admin' && req.userId !== parseInt(id)) {
      return res.status(403).send({ message: "Acesso negado. Você não tem permissão para editar este usuário." });
  }

  try {
    const user = await db.users.findByPk(id);
    if (!user) {
      return res.status(404).send({ message: `Usuário com ID=${id} não encontrado.` });
    }

    // Monta o objeto de atualização apenas com os dados permitidos
    const updateData = {};
    if (whatsapp_number !== undefined) {
        // Permite definir como nulo ou vazio
        updateData.whatsapp_number = whatsapp_number || null;
    }
    // Apenas admins podem mudar o nome de outros
    if (name && (req.userId === parseInt(id) || req.userRole === 'admin')) {
        updateData.name = name;
    }
    if (email) {
        updateData.email = email;
    }
    if (role) {
        updateData.role = role;
    }

    await db.users.update(updateData, {
      where: { id: id }
    });

    res.send({ message: "Usuário atualizado com sucesso." });

  } catch (err) {
    // Trata erro de valor único (número de WhatsApp já em uso)
    if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).send({ message: "Erro: Este número de WhatsApp já está cadastrado em outro usuário." });
    }
    res.status(500).send({ message: "Erro ao atualizar o usuário com ID=" + id });
  }
};
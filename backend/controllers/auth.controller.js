const db = require("../models");
const User = db.users;
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require('dotenv').config();

// Para criar usuários (ex: via um script ou rota de admin)
exports.signup = async (req, res) => {
  try {
    await User.create({
      name: req.body.name,
      email: req.body.email,
      password: bcrypt.hashSync(req.body.password, 8),
      role: req.body.role || 'atendente'
    });
    res.send({ message: "Usuário registrado com sucesso!" });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

exports.login = async (req, res) => {
  // Bloco de depuração para investigar o problema de login
  console.log("\n--- INÍCIO DA DEPURAÇÃO DE LOGIN ---");
  try {
    console.log("1. Dados recebidos do frontend:", req.body);
    
    if (!req.body.email || !req.body.password) {
      console.log("ERRO: Email ou senha não recebidos do frontend.");
      console.log("--- FIM DA DEPURAÇÃO DE LOGIN ---\n");
      return res.status(400).send({ message: "Email e senha são obrigatórios." });
    }

    const user = await User.findOne({ where: { email: req.body.email } });

    if (!user) {
      console.log("2. Resultado da busca no DB: Usuário NÃO encontrado.");
      console.log("--- FIM DA DEPURAÇÃO DE LOGIN ---\n");
      return res.status(404).send({ message: "Usuário não encontrado." });
    }

    console.log("2. Usuário encontrado no banco de dados (dados completos):", user.toJSON());
    console.log("3. PREPARAÇÃO PARA COMPARAÇÃO:");
    console.log("   - Senha do Frontend (texto puro):", req.body.password, `(Tipo: ${typeof req.body.password})`);
    console.log("   - Hash do Banco de Dados:", user.password, `(Tipo: ${typeof user.password})`);

    let passwordIsValid = false;
    try {
      passwordIsValid = bcrypt.compareSync(req.body.password, user.password);
    } catch (bcryptError) {
      console.error("ERRO DENTRO DO BCRYPT:", bcryptError.message);
      console.log("Isso geralmente acontece se o hash no banco de dados não é um hash bcrypt válido.");
    }
    
    console.log("4. Resultado da comparação (bcrypt.compareSync):", passwordIsValid);

    if (!passwordIsValid) {
      console.log("5. CONCLUSÃO: Login falhou. As senhas não correspondem.");
      console.log("--- FIM DA DEPURAÇÃO DE LOGIN ---\n");
      return res.status(401).send({ message: "Senha inválida." });
    }

    console.log("5. CONCLUSÃO: Login bem-sucedido! Gerando token...");
    
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: 86400 // 24 horas
    });

    console.log("--- FIM DA DEPURAÇÃO DE LOGIN ---\n");
    res.status(200).send({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: token
    });

  } catch (error) {
    console.error("ERRO GERAL NO PROCESSO DE LOGIN:", error);
    console.log("--- FIM DA DEPURAÇÃO DE LOGIN ---\n");
    res.status(500).send({ message: error.message });
  }
};
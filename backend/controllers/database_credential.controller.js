// /controllers/database_credential.controller.js
const db = require("../models");
const { Sequelize } = require("sequelize");
const DatabaseCredential = db.database_credentials;

// Criar uma nova credencial
exports.create = async (req, res) => {
  const { flowId } = req.params;
  try {
    const credential = await DatabaseCredential.create({
      ...req.body,
      flow_id: flowId
    });
    res.status(201).send(credential);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).send({ message: "Já existe uma conexão com este nome." });
    }
    res.status(500).send({ message: error.message || "Ocorreu um erro ao criar a conexão." });
  }
};

// Listar todas as credenciais
exports.findAll = async (req, res) => {
  const { flowId } = req.params;
  try {
    // Retorna apenas id e nome para preencher dropdowns na UI
    const credentials = await DatabaseCredential.findAll({ 
      where: { flow_id: flowId },
      attributes: ['id', 'name'], 
      order: [['name', 'ASC']] });
    res.send(credentials);
  } catch (error) {
    res.status(500).send({ message: error.message || "Ocorreu um erro ao buscar as conexões." });
  }
};

// Deletar uma credencial
exports.delete = async (req, res) => {
  const id = req.params.id;
  try {
    const num = await DatabaseCredential.destroy({ where: { id: id } });
    if (num == 1) {
      res.send({ message: "Conexão deletada com sucesso!" });
    } else {
      res.send({ message: `Não foi possível deletar a conexão com id=${id}.` });
    }
  } catch (error) {
    res.status(500).send({ message: "Não foi possível deletar a conexão com id=" + id });
  }
};

// Get columns for a specific table
exports.getTableColumns = async (req, res) => {
  const { id, tableName } = req.params;

  if (!tableName) {
    return res.status(400).send({ message: "O nome da tabela é obrigatório." });
  }

  try {
    const creds = await DatabaseCredential.findByPk(id);
    if (!creds) {
      return res.status(404).send({ message: "Conexão com o banco de dados não encontrada." });
    }

    const externalDb = new Sequelize(creds.db_name, creds.user, creds.pass, {
      host: creds.host,
      port: creds.port,
      dialect: creds.dialect || 'mysql',
      logging: false,
    });

    await externalDb.authenticate();
    const columns = await externalDb.getQueryInterface().describeTable(tableName);
    await externalDb.close();

    res.send(Object.keys(columns));
  } catch (error) {
    if (error.name === 'SequelizeDatabaseError' && (error.parent?.code === 'ER_NO_SUCH_TABLE' || error.message.includes('does not exist'))) {
        return res.status(404).send({ message: `Tabela "${tableName}" não encontrada no banco de dados.` });
    }
    res.status(500).send({ message: error.message || "Ocorreu um erro ao buscar as colunas da tabela." });
  }
};
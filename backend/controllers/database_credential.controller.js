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
      attributes: ['id', 'name'], // Não retorna db_name aqui, pois será selecionado na etapa
      order: [['name', 'ASC']] });
    res.send(credentials);
  } catch (error) {
    res.status(500).send({ message: error.message || "Ocorreu um erro ao buscar as conexões." });
  }
};

// Encontrar uma credencial por ID
exports.findOne = async (req, res) => {
  const id = req.params.id;
  try {
    const credential = await DatabaseCredential.findByPk(id);
    if (credential) {
      // Não envia a senha de volta para o cliente
      credential.pass = '';
      res.send(credential);
    } else {
      res.status(404).send({ message: `Não foi possível encontrar a conexão com id=${id}.` });
    }
  } catch (error) {
    res.status(500).send({ message: "Erro ao buscar a conexão com id=" + id });
  }
};

// Atualizar uma credencial por ID
exports.update = async (req, res) => {
  const id = req.params.id;
  try {
    const dataToUpdate = { ...req.body };
    // Não atualiza a senha se o campo vier vazio
    if (!dataToUpdate.pass) {
      delete dataToUpdate.pass;
    }
    await DatabaseCredential.update(dataToUpdate, { where: { id: id } });
    res.send({ message: "Conexão atualizada com sucesso." });
  } catch (error) {
    res.status(500).send({ message: "Erro ao atualizar a conexão com id=" + id });
  }
};

// Listar todos os bancos de dados de uma credencial
exports.getDatabases = async (req, res) => {
  const { id } = req.params;
  console.log(`[DEBUG] Rota GET /api/database-credentials/${id}/databases foi chamada.`);
  try {
    const creds = await DatabaseCredential.findByPk(id);
    if (!creds) {
      console.error(`[DEBUG] Credencial com ID ${id} não encontrada.`);
      return res.status(404).send({ message: "Credencial de banco de dados não encontrada." });
    }

    console.log(`[DEBUG] Conectando ao host: ${creds.host} com o usuário: ${creds.user} para listar bancos de dados.`);

    // Conecta sem especificar um banco de dados inicial para poder listar todos.
    const tempSequelize = new Sequelize(null, creds.user, creds.pass, {
      host: creds.host,
      port: creds.port,
      dialect: creds.dialect || 'mysql',
      logging: (sql) => console.log('[DEBUG] Sequelize (temp):', sql),
    });

    await tempSequelize.authenticate();
    console.log('[DEBUG] Autenticação com o servidor de banco de dados bem-sucedida.');

    const [databases] = await tempSequelize.query('SHOW DATABASES;');
    console.log('[DEBUG] Bancos de dados brutos encontrados:', databases);

    await tempSequelize.close();

    const filteredDatabases = databases
      .map(db => db.Database)
      .filter(name => !['information_schema', 'mysql', 'performance_schema', 'sys'].includes(name));
    
    console.log('[DEBUG] Bancos de dados filtrados para enviar ao frontend:', filteredDatabases);
    res.send(filteredDatabases);
  } catch (error) {
    console.error("[DEBUG] Erro CRÍTICO ao listar bancos de dados:", error);
    res.status(500).send({ message: "Erro ao listar bancos de dados: " + error.message });
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
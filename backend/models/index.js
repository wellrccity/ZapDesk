// /models/index.js
const dbConfig = require("../config/db.config.js");
const Sequelize = require("sequelize");

const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST,
  dialect: dbConfig.dialect,
  pool: dbConfig.pool
});

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Importando os modelos
db.users = require("./user.model.js")(sequelize, Sequelize);
db.commands = require("./command.model.js")(sequelize, Sequelize);
db.chats = require("./chat.model.js")(sequelize, Sequelize);
db.messages = require("./message.model.js")(sequelize, Sequelize);
db.integrations = require("./integration.model.js")(sequelize, Sequelize);
db.flows = require("./flow.model.js")(sequelize, Sequelize);
db.flow_steps = require("./flow_step.model.js")(sequelize, Sequelize);
db.poll_options = require("./poll_option.model.js")(sequelize, Sequelize);
db.form_submissions = require("./form_submissions.model.js")(sequelize, Sequelize);
db.contacts = require("./contact.model.js")(sequelize, Sequelize);
db.database_credentials = require("./database_credential.model.js")(sequelize, Sequelize); // <-- ADICIONAR

// Um Fluxo (Flow) tem muitas Credenciais de Banco de Dados (DatabaseCredential)
db.flows.hasMany(db.database_credentials, { as: 'database_credentials', foreignKey: { name: 'flow_id', unique: 'compositeIndex' } });
db.database_credentials.belongsTo(db.flows, { foreignKey: { name: 'flow_id', unique: 'compositeIndex' } });

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

module.exports = db;
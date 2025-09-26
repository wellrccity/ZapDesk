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
//db.form_submissions = require("./form_submissions.model.js")(sequelize, Sequelize);
//db.contacts = require("./contacts.model.js")(sequelize, Sequelize);

// --- Definindo as Relações (Associações) ---
// Um Fluxo (Flow) tem muitas Etapas (FlowSteps)
db.flows.hasMany(db.flow_steps, { as: 'steps', foreignKey: 'flow_id' });
db.flow_steps.belongsTo(db.flows, { foreignKey: 'flow_id' });

// Uma Etapa (FlowStep) tem muitas Opções de Enquete (PollOptions)
db.flow_steps.hasMany(db.poll_options, { as: 'poll_options', foreignKey: 'step_id' });
db.poll_options.belongsTo(db.flow_steps, { foreignKey: 'step_id' });

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

module.exports = db;
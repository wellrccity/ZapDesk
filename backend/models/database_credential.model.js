// /models/database_credential.model.js
module.exports = (sequelize, DataTypes) => {
    const DatabaseCredential = sequelize.define("database_credential", {
      name: { 
        type: DataTypes.STRING, 
        allowNull: false,
        // O nome deve ser único por fluxo
        unique: 'compositeIndex' 
      },
      dialect: { type: DataTypes.STRING, allowNull: false, defaultValue: 'mysql' },
      host: { type: DataTypes.STRING, allowNull: false },
      port: { type: DataTypes.INTEGER, allowNull: false },
      user: { type: DataTypes.STRING, allowNull: false },
      pass: { type: DataTypes.STRING, allowNull: true }, // A senha pode ser opcional
      // db_name: { type: DataTypes.STRING, allowNull: false } // CORREÇÃO: Removido. Será definido na etapa do fluxo.
    });
    return DatabaseCredential;
  };
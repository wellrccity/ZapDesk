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
      pass: { type: DataTypes.STRING, allowNull: false }, // Em um ambiente de produção, isso deve ser criptografado.
      db_name: { type: DataTypes.STRING, allowNull: false }
    });
    return DatabaseCredential;
  };
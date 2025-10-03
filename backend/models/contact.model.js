// /models/contact.model.js
module.exports = (sequelize, Sequelize) => {
    const Contact = sequelize.define("contacts", {
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      whatsapp_number: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      address: {
        type: Sequelize.STRING // Campo opcional para endereço
      }
    });
    return Contact;
};
module.exports = (sequelize, DataTypes) => {
  const FormSubmission = sequelize.define("form_submission", {
    flow_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    whatsapp_number: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    submission_data: {
      type: DataTypes.JSON, // O tipo JSON é ideal para armazenar os dados do formulário
      allowNull: true,
    },
  }, {
    timestamps: false // Desativa a criação automática de createdAt e updatedAt
  });

  return FormSubmission;
};
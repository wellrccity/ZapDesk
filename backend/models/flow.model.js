module.exports = (sequelize, DataTypes) => {
  const Flow = sequelize.define("flow", {
    name: { type: DataTypes.STRING, allowNull: false },
    trigger_keyword: { 
      type: DataTypes.STRING, 
      allowNull: false, 
      unique: true 
    },
    initial_step_id: { type: DataTypes.INTEGER, allowNull: true },
    target_audience: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'customer'
    }
  });

  // CORREÇÃO: Adiciona a associação que faltava com o modelo flow_steps.
  // Isso é crucial para que o Sequelize possa incluir as etapas ('steps') na busca do fluxo.
  Flow.associate = (models) => {
    Flow.hasMany(models.flow_steps, { foreignKey: 'flow_id', as: 'steps' });
  };

  return Flow;
};
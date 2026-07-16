import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const FormTemplate = sequelize.define('FormTemplate', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  checklist_item_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    unique: true,
  },
  file_path: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  file_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  uploaded_by: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
}, {
  tableName: 'form_templates',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

export default FormTemplate;

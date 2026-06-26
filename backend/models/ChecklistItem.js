import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const ChecklistItem = sequelize.define('ChecklistItem', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  tender_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  category: {
    type: DataTypes.ENUM('company_standing', 'financial', 'experience', 'tender_form', 'technical', 'it_related', 'other'),
    allowNull: false,
    defaultValue: 'other',
  },
  is_form: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  form_reference: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  suggested_assignee_role: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  assigned_to: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'IN_PROGRESS', 'UPLOADED', 'APPROVED', 'REJECTED'),
    defaultValue: 'PENDING',
    allowNull: false,
  },
  order_index: {
    type: DataTypes.INTEGER.UNSIGNED,
    defaultValue: 0,
  },
}, {
  tableName: 'checklist_items',
  underscored: true,
});

export default ChecklistItem;

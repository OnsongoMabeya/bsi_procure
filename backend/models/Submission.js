import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Submission = sequelize.define('Submission', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  tender_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  submission_type: {
    type: DataTypes.ENUM('physical', 'digital'),
    allowNull: false,
  },
  method: {
    type: DataTypes.ENUM('manual_upload', 'email'),
    allowNull: false,
    defaultValue: 'manual_upload',
  },
  submitted_by: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  submitted_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  file_path: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  file_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  email_recipient: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  email_sent_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  is_immutable: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'submissions',
  underscored: true,
  timestamps: true,
});

export default Submission;

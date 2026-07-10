import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const CompanyDocument = sequelize.define('CompanyDocument', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  doc_type: {
    type: DataTypes.ENUM(
      'certificate_of_incorporation',
      'cr12',
      'company_stamp',
      'director_signature',
      'audited_accounts',
      'kra_tcc',
      'agpo_certificate',
      'trade_license',
      'other'
    ),
    allowNull: false,
  },
  label: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  file_path: {
    type: DataTypes.STRING(500),
  },
  file_name: {
    type: DataTypes.STRING(255),
  },
  expiry_date: {
    type: DataTypes.DATEONLY,
  },
  uploaded_by: {
    type: DataTypes.INTEGER.UNSIGNED,
  },
  current_version_id: {
    type: DataTypes.INTEGER.UNSIGNED,
  },
}, {
  tableName: 'company_documents',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

export default CompanyDocument;

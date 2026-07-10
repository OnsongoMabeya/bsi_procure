import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const CompanyDocumentVersion = sequelize.define('CompanyDocumentVersion', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  company_document_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  file_path: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  file_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  expiry_date: {
    type: DataTypes.DATEONLY,
  },
  uploaded_by: {
    type: DataTypes.INTEGER.UNSIGNED,
  },
  notes: {
    type: DataTypes.TEXT,
  },
}, {
  tableName: 'company_document_versions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

export default CompanyDocumentVersion;

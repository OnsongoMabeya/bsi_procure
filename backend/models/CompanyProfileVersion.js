import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const CompanyProfileVersion = sequelize.define('CompanyProfileVersion', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  company_profile_id: {
    type: DataTypes.INTEGER,
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
  uploaded_by: {
    type: DataTypes.INTEGER,
  },
  notes: {
    type: DataTypes.TEXT,
  },
}, {
  tableName: 'company_profile_versions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

export default CompanyProfileVersion;

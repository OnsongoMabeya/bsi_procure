import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const CompanyProfile = sequelize.define('CompanyProfile', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  company_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  trading_name: {
    type: DataTypes.STRING(255),
  },
  registration_number: {
    type: DataTypes.STRING(100),
  },
  year_of_incorporation: {
    type: DataTypes.INTEGER,
  },
  legal_address: {
    type: DataTypes.TEXT,
  },
  postal_address: {
    type: DataTypes.TEXT,
  },
  phone: {
    type: DataTypes.STRING(100),
  },
  email: {
    type: DataTypes.STRING(255),
  },
  website: {
    type: DataTypes.STRING(255),
  },
  directors: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  authorized_representative_name: {
    type: DataTypes.STRING(255),
  },
  authorized_representative_title: {
    type: DataTypes.STRING(255),
  },
  authorized_representative_email: {
    type: DataTypes.STRING(255),
  },
  authorized_representative_phone: {
    type: DataTypes.STRING(100),
  },
  nature_of_business: {
    type: DataTypes.TEXT,
  },
  max_contract_value: {
    type: DataTypes.DECIMAL(15, 2),
  },
  trade_license_number: {
    type: DataTypes.STRING(100),
  },
  trade_license_expiry: {
    type: DataTypes.DATE,
  },
  mission: {
    type: DataTypes.TEXT,
  },
  vision: {
    type: DataTypes.TEXT,
  },
  core_values: {
    type: DataTypes.TEXT,
  },
  source_document_path: {
    type: DataTypes.STRING(500),
  },
  source_document_name: {
    type: DataTypes.STRING(255),
  },
  source_document_version_id: {
    type: DataTypes.INTEGER,
  },
}, {
  tableName: 'company_profiles',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

export default CompanyProfile;

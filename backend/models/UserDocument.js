import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const UserDocument = sequelize.define('UserDocument', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  owner_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  label: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  category: {
    type: DataTypes.ENUM('cv', 'certificate', 'signature', 'professional', 'other'),
    defaultValue: 'other',
  },
  file_path: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  file_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
}, {
  tableName: 'user_documents',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

export default UserDocument;

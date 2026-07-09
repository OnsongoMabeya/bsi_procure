import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Director = sequelize.define('Director', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  company_profile_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  nationality: {
    type: DataTypes.STRING(100),
  },
  citizenship: {
    type: DataTypes.STRING(100),
  },
  share_percentage: {
    type: DataTypes.DECIMAL(5, 2),
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'directors',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

export default Director;

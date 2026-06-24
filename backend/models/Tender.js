import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Tender = sequelize.define('Tender', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  reference_number: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  procuring_entity: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  deadline: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  submission_type: {
    type: DataTypes.ENUM('physical', 'digital', 'both'),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('PENDING_FEASIBILITY', 'DOCUMENT_GATHERING', 'ASSEMBLY', 'SUBMITTED', 'REJECTED'),
    allowNull: false,
    defaultValue: 'PENDING_FEASIBILITY',
  },
  uploaded_document_path: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  uploaded_document_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  uploaded_by: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
  feasibility_approved_by: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
  feasibility_approved_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  feasibility_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  rejection_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  is_archived: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'tenders',
  underscored: true,
});

export default Tender;

import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false,
  },
  user_id: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  body: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM(
      'submission',
      'feasibility',
      'task_assignment',
      'document_rejection',
      'deadline_reminder',
      'document_expiry'
    ),
    allowNull: false,
  },
  tender_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  checklist_item_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  is_read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  channel: {
    type: DataTypes.ENUM('email', 'inapp'),
    defaultValue: 'inapp',
  },
  email_sent_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  email_failed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  email_error: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'notifications',
  timestamps: false,
});

export default Notification;

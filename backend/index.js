import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import sequelize from './config/database.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import tenderRoutes from './routes/tenders.js';
import companyProfileRoutes from './routes/companyProfile.js';
import aiRoutes from './routes/ai.js';
import User from './models/User.js';
import Tender from './models/Tender.js';
import ChecklistItem from './models/ChecklistItem.js';
import CompanyProfile from './models/CompanyProfile.js';
import CompanyProfileVersion from './models/CompanyProfileVersion.js';

User.hasMany(Tender, { foreignKey: 'uploaded_by', as: 'createdTenders' });
Tender.belongsTo(User, { foreignKey: 'uploaded_by', as: 'creator' });
Tender.belongsTo(User, { foreignKey: 'feasibility_approved_by', as: 'approver' });
Tender.hasMany(ChecklistItem, { foreignKey: 'tender_id', as: 'checklistItems' });
ChecklistItem.belongsTo(Tender, { foreignKey: 'tender_id', as: 'tender' });
ChecklistItem.belongsTo(User, { foreignKey: 'assigned_to', as: 'assignee' });
ChecklistItem.belongsTo(User, { foreignKey: 'uploaded_by', as: 'uploader' });

CompanyProfileVersion.belongsTo(User, { foreignKey: 'uploaded_by', as: 'uploader' });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5005;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3005' }));
app.use(express.json());

app.get('/api/health', async (req, res) => {
  let dbStatus = 'ok';
  try {
    await sequelize.authenticate();
  } catch (err) {
    dbStatus = `error: ${err.message}`;
  }
  res.json({ status: 'ok', message: 'Hello from BSI Procurement API', db: dbStatus });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tenders', tenderRoutes);
app.use('/api/company-profile', companyProfileRoutes);
app.use('/api/ai', aiRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

sequelize.sync({ alter: true })
  .then(() => console.log('Database synced'))
  .catch((err) => console.error('DB sync error:', err.message));

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});

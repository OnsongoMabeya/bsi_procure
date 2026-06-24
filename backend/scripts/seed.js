import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import sequelize from '../config/database.js';
import User from '../models/User.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function seed() {
  await sequelize.sync({ alter: true });

  const existing = await User.findOne({ where: { email: 'admin@bsint.net' } });
  if (existing) {
    console.log('Seed: ADMIN user already exists — skipping.');
    process.exit(0);
  }

  const password_hash = await bcrypt.hash('Admin@123', 12);
  await User.create({
    name: 'System Administrator',
    email: 'admin@bsint.net',
    password_hash,
    role: 'ADMIN',
    whatsapp_number: null,
  });

  console.log('Seed complete.');
  console.log('  Email:    admin@bsint.net');
  console.log('  Password: Admin@123');
  console.log('  ⚠️  Change this password immediately after first login.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});

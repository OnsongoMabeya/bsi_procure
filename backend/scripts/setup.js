/**
 * setup.js — First-time server setup script
 *
 * Run this once on a new/fresh server before starting the app:
 *   node scripts/setup.js
 *
 * What it does:
 *   1. Connects to MySQL as the configured DB user
 *   2. Creates the database if it does not exist
 *   3. Syncs all Sequelize models (creates or alters tables)
 *   4. Seeds the default ADMIN user if no users exist
 */

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const {
  DB_HOST = 'localhost',
  DB_PORT = '3306',
  DB_NAME = 'bsi_procurement',
  DB_USER,
  DB_PASSWORD,
} = process.env;

if (!DB_USER) {
  console.error('ERROR: DB_USER is not set in .env');
  process.exit(1);
}

// ─── Step 1: Create the database if it does not exist ────────────────────────
async function createDatabase() {
  console.log(`\n[1/3] Connecting to MySQL at ${DB_HOST}:${DB_PORT} as "${DB_USER}"...`);
  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
  });

  const [rows] = await conn.query(
    `SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?`,
    [DB_NAME]
  );

  if (rows.length > 0) {
    console.log(`    Database "${DB_NAME}" already exists — skipping creation.`);
  } else {
    await conn.query(
      `CREATE DATABASE \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log(`    Database "${DB_NAME}" created.`);
  }

  await conn.end();
}

// ─── Step 2: Sync all models (create/alter tables) ───────────────────────────
async function syncModels() {
  console.log('\n[2/3] Syncing database models (tables)...');

  const { default: sequelize } = await import('../config/database.js');
  await import('../models/User.js');
  await import('../models/Tender.js');
  await import('../models/ChecklistItem.js');

  await sequelize.sync({ alter: true });

  const [tables] = await sequelize.query('SHOW TABLES');
  const tableNames = tables.map((r) => Object.values(r)[0]);
  console.log(`    Tables present: ${tableNames.join(', ')}`);

  return sequelize;
}

// ─── Step 3: Seed default ADMIN user if none exists ──────────────────────────
async function seedAdmin() {
  console.log('\n[3/3] Checking for existing users...');

  const { default: User } = await import('../models/User.js');

  const count = await User.count();
  if (count > 0) {
    console.log(`    ${count} user(s) already exist — skipping seed.`);
    return;
  }

  const password_hash = await bcrypt.hash('Admin@123', 12);
  await User.create({
    name: 'System Administrator',
    email: 'admin@bsint.net',
    password_hash,
    role: 'ADMIN',
    whatsapp_number: null,
  });

  console.log('    Default ADMIN user created:');
  console.log('      Email:    admin@bsint.net');
  console.log('      Password: Admin@123');
  console.log('      ⚠️  Change this password immediately after first login.');
}

// ─── Run ─────────────────────────────────────────────────────────────────────
(async () => {
  try {
    await createDatabase();
    const sequelize = await syncModels();
    await seedAdmin();

    console.log('\n✅ Setup complete. You can now start the server:');
    console.log('   npm run dev\n');

    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Setup failed:', err.message);
    process.exit(1);
  }
})();

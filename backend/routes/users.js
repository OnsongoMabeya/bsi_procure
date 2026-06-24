import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();

const SAFE_FIELDS = ['id', 'name', 'email', 'role', 'whatsapp_number', 'is_active', 'created_at'];

const pick = (obj, fields) =>
  Object.fromEntries(fields.map((f) => [f, obj[f]]));

router.use(authMiddleware, requireRole('ADMIN'));

router.get('/', async (req, res) => {
  try {
    const users = await User.findAll({ order: [['name', 'ASC']] });
    res.json(users.map((u) => pick(u, SAFE_FIELDS)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { name, email, password, role, whatsapp_number } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'name, email, password, and role are required' });
  }
  try {
    const password_hash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email: email.toLowerCase().trim(),
      password_hash,
      role,
      whatsapp_number: whatsapp_number || null,
    });
    res.status(201).json(pick(user, SAFE_FIELDS));
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Email already in use' });
    }
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { name, email, role, whatsapp_number, is_active, password } = req.body;
    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email.toLowerCase().trim();
    if (role !== undefined) user.role = role;
    if (whatsapp_number !== undefined) user.whatsapp_number = whatsapp_number;
    if (is_active !== undefined) user.is_active = is_active;
    if (password) user.password_hash = await bcrypt.hash(password, 12);

    await user.save();
    res.json(pick(user, SAFE_FIELDS));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.is_active = false;
    await user.save();
    res.json({ message: 'User deactivated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

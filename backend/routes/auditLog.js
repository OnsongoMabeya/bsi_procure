import { Router } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import AuditLog from '../models/AuditLog.js';
import User from '../models/User.js';

const router = Router();
router.use(authMiddleware);

router.get('/', requireRole('ADMIN', 'FL', 'INFO'), async (req, res) => {
  try {
    const where = {};
    if (req.query.tender_id) where.tender_id = req.query.tender_id;
    if (req.query.entity_type) where.entity_type = req.query.entity_type;
    if (req.query.entity_id) where.entity_id = req.query.entity_id;

    const logs = await AuditLog.findAll({
      where,
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'role'] }],
      order: [['timestamp', 'DESC']],
      limit: 500,
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

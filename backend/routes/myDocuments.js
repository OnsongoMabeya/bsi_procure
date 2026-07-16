import { Router } from 'express';
import { Op, Sequelize } from 'sequelize';
import { authMiddleware } from '../middleware/auth.js';
import { uploadUserDoc } from '../middleware/upload.js';
import UserDocument from '../models/UserDocument.js';
import Tender from '../models/Tender.js';
import ChecklistItem from '../models/ChecklistItem.js';
import User from '../models/User.js';

const router = Router();
router.use(authMiddleware);

function webPath(absPath) {
  if (!absPath) return absPath;
  return absPath.replace(/^(.*[\\/])?uploads[\\/]/, 'uploads/').replace(/\\/g, '/');
}

function parseRoleList(value) {
  if (!value || typeof value !== 'string') return [];
  return value.split(/[,;\s]+/).map((r) => r.trim().toUpperCase()).filter(Boolean);
}

// GET /api/my-documents — personal documents + inbox in one response
router.get('/', async (req, res) => {
  try {
    const user = req.user;
    const role = user.role.toLowerCase();

    const personalDocs = await UserDocument.findAll({
      where: { owner_id: user.id },
      order: [['created_at', 'DESC']],
    });

    const activeTenderIds = await Tender.findAll({
      where: { is_archived: false, status: { [Op.notIn]: ['SUBMITTED', 'REJECTED'] } },
      attributes: ['id'],
    }).then((rows) => rows.map((r) => r.id));

    const inboxWhere = {
      tender_id: { [Op.in]: activeTenderIds },
      [Op.or]: [
        { assigned_to: user.id },
        Sequelize.where(
          Sequelize.fn('CONCAT', ',', Sequelize.fn('REPLACE', Sequelize.fn('LOWER', Sequelize.col('suggested_assignee_role')), ' ', ''), ','),
          { [Op.like]: `%,${role},%` }
        ),
      ],
      [Op.not]: { status: 'APPROVED' },
    };

    const inboxItems = await ChecklistItem.findAll({
      where: inboxWhere,
      include: [
        { model: Tender, as: 'tender', attributes: ['id', 'name', 'reference_number', 'deadline', 'status'] },
        { model: User, as: 'assignee', attributes: ['id', 'name', 'role'] },
        { model: User, as: 'uploader', attributes: ['id', 'name', 'role'] },
      ],
      order: [[{ model: Tender, as: 'tender' }, 'deadline', 'ASC'], ['order_index', 'ASC']],
    });

    res.json({
      personal: personalDocs,
      inbox: inboxItems,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/my-documents — upload a personal document
router.post('/', (req, res) => {
  uploadUserDoc(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    try {
      const { label, description, category } = req.body;
      if (!label) return res.status(400).json({ error: 'label is required' });
      const doc = await UserDocument.create({
        owner_id: req.user.id,
        label,
        description: description || null,
        category: category || 'other',
        file_path: webPath(req.file.path),
        file_name: req.file.originalname,
      });
      res.status(201).json(doc);
    } catch (dbErr) {
      res.status(500).json({ error: dbErr.message });
    }
  });
});

// DELETE /api/my-documents/:id
router.delete('/:id', async (req, res) => {
  try {
    const doc = await UserDocument.findByPk(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (doc.owner_id !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Cannot delete this document' });
    }
    await doc.destroy();
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

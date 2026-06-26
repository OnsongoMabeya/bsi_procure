import { Router } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { uploadTenderDoc } from '../middleware/upload.js';
import Tender from '../models/Tender.js';
import User from '../models/User.js';
import ChecklistItem from '../models/ChecklistItem.js';

const router = Router();

router.use(authMiddleware);

const CAN_CREATE = ['GM', 'HOT', 'CEO', 'ADMIN'];
const CAN_APPROVE = ['GM', 'HOT'];

// ── List tenders ──────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const where = { is_archived: false };
    const tenders = await Tender.findAll({
      where,
      order: [['created_at', 'DESC']],
      include: [
        { model: User, as: 'creator', attributes: ['id', 'name', 'role'] },
        { model: User, as: 'approver', attributes: ['id', 'name', 'role'] },
      ],
    });
    res.json(tenders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get single tender ─────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const tender = await Tender.findByPk(req.params.id, {
      include: [
        { model: User, as: 'creator', attributes: ['id', 'name', 'role'] },
        { model: User, as: 'approver', attributes: ['id', 'name', 'role'] },
      ],
    });
    if (!tender) return res.status(404).json({ error: 'Tender not found' });
    res.json(tender);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Create tender ─────────────────────────────────────────────────────────────
router.post('/', requireRole(...CAN_CREATE), (req, res) => {
  uploadTenderDoc(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });

    const { name, reference_number, procuring_entity, deadline, submission_type } = req.body;

    if (!name || !reference_number || !procuring_entity || !deadline || !submission_type) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    try {
      const tender = await Tender.create({
        name,
        reference_number,
        procuring_entity,
        deadline: new Date(deadline),
        submission_type,
        uploaded_document_path: req.file ? req.file.path : null,
        uploaded_document_name: req.file ? req.file.originalname : null,
        uploaded_by: req.user.id,
        status: 'PENDING_FEASIBILITY',
      });
      res.status(201).json(tender);
    } catch (dbErr) {
      res.status(500).json({ error: dbErr.message });
    }
  });
});

// ── Feasibility decision ──────────────────────────────────────────────────────
router.patch('/:id/feasibility', requireRole(...CAN_APPROVE), async (req, res) => {
  const { decision, notes } = req.body;

  if (!['approve', 'reject'].includes(decision)) {
    return res.status(400).json({ error: 'decision must be "approve" or "reject"' });
  }
  if (decision === 'reject' && !notes?.trim()) {
    return res.status(400).json({ error: 'Rejection reason is required' });
  }

  try {
    const tender = await Tender.findByPk(req.params.id);
    if (!tender) return res.status(404).json({ error: 'Tender not found' });

    if (tender.status !== 'PENDING_FEASIBILITY') {
      return res.status(400).json({ error: 'Tender is not pending feasibility review' });
    }

    if (decision === 'approve') {
      await tender.update({
        status: 'DOCUMENT_GATHERING',
        feasibility_approved_by: req.user.id,
        feasibility_approved_at: new Date(),
        feasibility_notes: notes || null,
      });
    } else {
      await tender.update({
        status: 'REJECTED',
        feasibility_approved_by: req.user.id,
        feasibility_approved_at: new Date(),
        rejection_reason: notes,
      });
    }

    const updated = await Tender.findByPk(req.params.id, {
      include: [
        { model: User, as: 'creator', attributes: ['id', 'name', 'role'] },
        { model: User, as: 'approver', attributes: ['id', 'name', 'role'] },
      ],
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Replace uploaded document (creator or ADMIN) ─────────────────────────────
router.patch('/:id/document', requireRole('ADMIN', 'FL', 'INFO'), (req, res) => {
  uploadTenderDoc(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No document uploaded' });

    try {
      const tender = await Tender.findByPk(req.params.id);
      if (!tender) return res.status(404).json({ error: 'Tender not found' });
      if (req.user.role !== 'ADMIN' && tender.uploaded_by !== req.user.id) {
        return res.status(403).json({ error: 'Only the creator or ADMIN can replace the document' });
      }
      await tender.update({
        uploaded_document_path: req.file.path,
        uploaded_document_name: req.file.originalname,
      });
      res.json({ message: 'Document replaced', uploaded_document_name: req.file.originalname });
    } catch (dbErr) {
      res.status(500).json({ error: dbErr.message });
    }
  });
});

// ── Get checklist ─────────────────────────────────────────────────────────────
router.get('/:id/checklist', async (req, res) => {
  try {
    const items = await ChecklistItem.findAll({
      where: { tender_id: req.params.id },
      include: [{ model: User, as: 'assignee', attributes: ['id', 'name', 'role'] }],
      order: [['order_index', 'ASC']],
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Add checklist item manually ───────────────────────────────────────────────
router.post('/:id/checklist', requireRole('FL', 'INFO', 'ADMIN'), async (req, res) => {
  const { name, category, is_form, form_reference, notes, suggested_assignee_role, assigned_to } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const count = await ChecklistItem.count({ where: { tender_id: req.params.id } });
    const item = await ChecklistItem.create({
      tender_id: req.params.id,
      name,
      category: category || 'other',
      is_form: is_form || false,
      form_reference: form_reference || null,
      notes: notes || null,
      suggested_assignee_role: suggested_assignee_role || null,
      assigned_to: assigned_to || null,
      order_index: count,
    });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Edit checklist item ───────────────────────────────────────────────────────
router.patch('/:id/checklist/:itemId', requireRole('FL', 'INFO', 'ADMIN'), async (req, res) => {
  try {
    const item = await ChecklistItem.findOne({ where: { id: req.params.itemId, tender_id: req.params.id } });
    if (!item) return res.status(404).json({ error: 'Checklist item not found' });
    const { name, category, is_form, form_reference, notes, suggested_assignee_role, assigned_to } = req.body;
    await item.update({ name, category, is_form, form_reference, notes, suggested_assignee_role, assigned_to });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Delete checklist item ─────────────────────────────────────────────────────
router.delete('/:id/checklist/:itemId', requireRole('FL', 'INFO', 'ADMIN'), async (req, res) => {
  try {
    const item = await ChecklistItem.findOne({ where: { id: req.params.itemId, tender_id: req.params.id } });
    if (!item) return res.status(404).json({ error: 'Checklist item not found' });
    await item.destroy();
    res.json({ message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Confirm checklist (FL or INFO) ────────────────────────────────────────────
router.patch('/:id/checklist/confirm', requireRole('FL', 'INFO', 'ADMIN'), async (req, res) => {
  try {
    const tender = await Tender.findByPk(req.params.id);
    if (!tender) return res.status(404).json({ error: 'Tender not found' });
    const count = await ChecklistItem.count({ where: { tender_id: req.params.id } });
    if (count === 0) return res.status(400).json({ error: 'Cannot confirm an empty checklist' });
    await tender.update({ checklist_confirmed: true });
    res.json({ message: 'Checklist confirmed', checklist_confirmed: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Archive tender (ADMIN only) ───────────────────────────────────────────────
router.patch('/:id/archive', requireRole('ADMIN'), async (req, res) => {
  try {
    const tender = await Tender.findByPk(req.params.id);
    if (!tender) return res.status(404).json({ error: 'Tender not found' });
    await tender.update({ is_archived: true });
    res.json({ message: 'Tender archived' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

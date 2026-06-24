import { Router } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { scanTenderDocument } from '../services/llm.js';
import Tender from '../models/Tender.js';
import ChecklistItem from '../models/ChecklistItem.js';

const router = Router();
router.use(authMiddleware);

const CAN_SCAN = ['FL', 'INFO', 'ADMIN'];

router.post('/scan-tender/:tenderId', requireRole(...CAN_SCAN), async (req, res) => {
  try {
    const tender = await Tender.findByPk(req.params.tenderId);
    if (!tender) return res.status(404).json({ error: 'Tender not found' });

    if (tender.status !== 'DOCUMENT_GATHERING') {
      return res.status(400).json({ error: 'Tender must be in DOCUMENT_GATHERING status to scan' });
    }

    if (!tender.uploaded_document_path) {
      return res.status(400).json({ error: 'No document uploaded for this tender' });
    }

    const result = await scanTenderDocument(tender.uploaded_document_path);

    await ChecklistItem.destroy({ where: { tender_id: tender.id } });

    const items = await ChecklistItem.bulkCreate(
      result.checklist.map((item, idx) => ({
        tender_id: tender.id,
        name: item.name,
        category: item.category || 'other',
        is_form: item.is_form || false,
        form_reference: item.form_reference || null,
        notes: item.notes || null,
        suggested_assignee_role: item.suggested_assignee_role || null,
        status: 'PENDING',
        order_index: idx,
      }))
    );

    await tender.update({ checklist_confirmed: false });

    res.json({ message: `Extracted ${items.length} checklist items`, items });
  } catch (err) {
    console.error('AI scan error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;

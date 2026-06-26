import { Router } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { scanTenderDocument } from '../services/llm.js';
import Tender from '../models/Tender.js';
import ChecklistItem from '../models/ChecklistItem.js';

const router = Router();
router.use(authMiddleware);

const CAN_SCAN = ['FL', 'INFO', 'ADMIN'];

const VALID_CATEGORIES = ['company_standing', 'financial', 'experience', 'tender_form', 'technical', 'it_related', 'other'];
const VALID_ROLES = ['FL', 'FIN', 'TECH', 'INFO', 'IT', 'HOT', 'ADMIN', ''];

function normalizeCategory(value) {
  if (!value || typeof value !== 'string') return 'other';
  const lower = value.toLowerCase().replace(/[^a-z_]/g, '_');
  if (VALID_CATEGORIES.includes(lower)) return lower;

  // Common model mappings
  if (lower.includes('company') || lower.includes('registration') || lower.includes('standing') || lower.includes('legal')) return 'company_standing';
  if (lower.includes('financial') || lower.includes('bank') || lower.includes('tax') || lower.includes('insurance')) return 'financial';
  if (lower.includes('experience') || lower.includes('past') || lower.includes('reference') || lower.includes('performance')) return 'experience';
  if (lower.includes('tender_form') || lower.includes('form') || lower.includes('bond') || lower.includes('bid') || lower.includes('declaration')) return 'tender_form';
  if (lower.includes('technical') || lower.includes('specification') || lower.includes('proposal') || lower.includes('method') || lower.includes('engineering')) return 'technical';
  if (lower.includes('it') || lower.includes('software') || lower.includes('system') || lower.includes('cyber')) return 'it_related';

  return 'other';
}

function normalizeRole(value) {
  if (!value || typeof value !== 'string') return '';
  const upper = value.toUpperCase().trim();
  if (VALID_ROLES.includes(upper)) return upper;
  return '';
}

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
        category: normalizeCategory(item.category),
        is_form: item.is_form || false,
        form_reference: item.form_reference || null,
        notes: item.notes || null,
        suggested_assignee_role: normalizeRole(item.suggested_assignee_role),
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

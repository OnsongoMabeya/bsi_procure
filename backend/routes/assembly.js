import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Router } from 'express';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import ChecklistItem from '../models/ChecklistItem.js';
import Tender from '../models/Tender.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assemblyDir = path.join(__dirname, '..', 'uploads', 'assembly');
const serializationDir = path.join(__dirname, '..', 'uploads', 'serialized');
const router = Router();

router.use(authMiddleware);

const ORDER_ROLES = ['FL', 'INFO', 'ADMIN'];

function webPath(absPath) {
  return absPath.replace(/^(.*[\\/])?uploads[\\/]/, 'uploads/').replace(/\\/g, '/');
}

function safeFileName(value) {
  return String(value || 'document').replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_');
}

function suggestedFileName(index, item, tender) {
  const seq = String(index + 1).padStart(2, '0');
  return `${seq}_${safeFileName(item.name)}_${safeFileName(tender.reference_number)}.pdf`;
}

async function pdfPageCount(relPath) {
  if (!relPath || !relPath.toLowerCase().endsWith('.pdf')) return null;
  try {
    const bytes = await fs.readFile(path.join(__dirname, '..', relPath));
    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
    return pdf.getPageCount();
  } catch {
    return null;
  }
}

async function getOrderedItems(tenderId) {
  const items = await ChecklistItem.findAll({
    where: { tender_id: tenderId, status: 'APPROVED' },
    order: [['order_index', 'ASC']],
  });
  // assembly_order wins when set; unordered items follow in checklist order
  return items.sort((a, b) => {
    const ao = a.assembly_order ?? Number.MAX_SAFE_INTEGER;
    const bo = b.assembly_order ?? Number.MAX_SAFE_INTEGER;
    if (ao !== bo) return ao - bo;
    return (a.order_index || 0) - (b.order_index || 0);
  });
}

// ── Get ordered document list ─────────────────────────────────────────────────
router.get('/:id/assembly', async (req, res) => {
  try {
    const tender = await Tender.findByPk(req.params.id);
    if (!tender) return res.status(404).json({ error: 'Tender not found' });

    const [items, totalItems] = await Promise.all([
      getOrderedItems(tender.id),
      ChecklistItem.count({ where: { tender_id: tender.id } }),
    ]);

    let nextPage = 1;
    const documents = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const pageCount = await pdfPageCount(item.uploaded_document_path);
      const effectivePages = pageCount || 1;
      documents.push({
        id: item.id,
        name: item.name,
        category: item.category,
        is_form: item.is_form,
        form_reference: item.form_reference,
        uploaded_document_path: item.uploaded_document_path,
        uploaded_document_name: item.uploaded_document_name,
        page_count: pageCount,
        start_page: nextPage,
        suggested_file_name: suggestedFileName(i, item, tender),
      });
      nextPage += effectivePages;
    }

    res.json({
      tender: { id: tender.id, name: tender.name, reference_number: tender.reference_number, status: tender.status },
      all_items_approved: totalItems > 0 && items.length === totalItems,
      total_items: totalItems,
      approved_items: items.length,
      total_pages: nextPage - 1,
      documents,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Save new order (FL/INFO/ADMIN, no lock) ───────────────────────────────────
router.put('/:id/assembly/order', requireRole(...ORDER_ROLES), async (req, res) => {
  try {
    const tender = await Tender.findByPk(req.params.id);
    if (!tender) return res.status(404).json({ error: 'Tender not found' });

    const orderedIds = req.body.ordered_ids;
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({ error: 'ordered_ids must be a non-empty array of checklist item IDs' });
    }

    const items = await ChecklistItem.findAll({ where: { tender_id: tender.id, status: 'APPROVED' } });
    const itemIds = new Set(items.map((i) => i.id));
    for (const id of orderedIds) {
      if (!itemIds.has(Number(id))) {
        return res.status(400).json({ error: `Item ${id} is not an approved checklist item of this tender` });
      }
    }

    await Promise.all(orderedIds.map((id, index) => ChecklistItem.update({ assembly_order: index }, { where: { id } })));

    if (tender.status === 'DOCUMENT_GATHERING') {
      const totalItems = await ChecklistItem.count({ where: { tender_id: tender.id } });
      if (totalItems === items.length) await tender.update({ status: 'ASSEMBLY' });
    }

    res.json({ message: 'Assembly order saved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Generate Table of Contents PDF ────────────────────────────────────────────
router.post('/:id/assembly/toc', requireRole(...ORDER_ROLES), async (req, res) => {
  try {
    const tender = await Tender.findByPk(req.params.id);
    if (!tender) return res.status(404).json({ error: 'Tender not found' });

    const items = await getOrderedItems(tender.id);
    if (items.length === 0) return res.status(400).json({ error: 'No approved documents to include in the Table of Contents' });

    const entries = [];
    let nextPage = 1;
    for (const item of items) {
      const pageCount = await pdfPageCount(item.uploaded_document_path);
      entries.push({ name: item.name, form_reference: item.form_reference, start_page: nextPage, page_count: pageCount || 1 });
      nextPage += pageCount || 1;
    }

    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const pageWidth = 595.28;
    const pageHeight = 841.89; // A4
    const margin = 56;
    const lineHeight = 24;
    const navy = rgb(0.08, 0.24, 0.56);
    const dark = rgb(0.12, 0.16, 0.23);

    let page = pdf.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    page.drawText('TABLE OF CONTENTS', { x: margin, y, size: 20, font: bold, color: navy });
    y -= 22;
    page.drawText(`${tender.name} — ${tender.reference_number}`, { x: margin, y, size: 11, font, color: dark });
    y -= 12;
    page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 1.2, color: navy });
    y -= 28;

    entries.forEach((entry, i) => {
      if (y < margin + lineHeight) {
        page = pdf.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
      const seq = String(i + 1).padStart(2, '0');
      const label = `${seq}.  ${entry.form_reference ? `[${entry.form_reference}] ` : ''}${entry.name}`;
      const truncated = label.length > 78 ? `${label.slice(0, 75)}…` : label;
      const pageLabel = String(entry.start_page);
      const pageLabelWidth = font.widthOfTextAtSize(pageLabel, 11);
      const labelWidth = font.widthOfTextAtSize(truncated, 11);

      page.drawText(truncated, { x: margin, y, size: 11, font, color: dark });
      page.drawText(pageLabel, { x: pageWidth - margin - pageLabelWidth, y, size: 11, font: bold, color: navy });

      // dotted leader
      const dotsStart = margin + labelWidth + 8;
      const dotsEnd = pageWidth - margin - pageLabelWidth - 8;
      if (dotsEnd > dotsStart) {
        const dot = '.';
        const dotWidth = font.widthOfTextAtSize(dot, 11);
        const count = Math.floor((dotsEnd - dotsStart) / (dotWidth * 2));
        page.drawText(dot.repeat(Math.max(0, count)).split('').join(' '), { x: dotsStart, y, size: 11, font, color: rgb(0.6, 0.65, 0.72) });
      }
      y -= lineHeight;
    });

    await fs.mkdir(assemblyDir, { recursive: true });
    const outputName = `toc_${tender.id}_${Date.now()}.pdf`;
    const outputPath = path.join(assemblyDir, outputName);
    await fs.writeFile(outputPath, await pdf.save());

    res.json({
      message: 'Table of Contents generated',
      toc_path: webPath(outputPath),
      entries,
      total_pages: nextPage - 1,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Helper: Stamp PDF pages with 6-digit Bates numbers ────────────────────────
async function stampPdfPages(pdfBytes, startPageNum) {
  const pdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const pageCount = pdf.getPageCount();
  const gray = rgb(0.4, 0.4, 0.4);

  for (let i = 0; i < pageCount; i++) {
    const page = pdf.getPage(i);
    const { width, height } = page.getSize();
    const pageNum = String(startPageNum + i).padStart(6, '0');
    const fontSize = 10;
    const textWidth = font.widthOfTextAtSize(pageNum, fontSize);
    const x = width - 50;
    const y = 20;

    page.drawText(pageNum, {
      x,
      y,
      size: fontSize,
      font,
      color: gray,
    });
  }

  return await pdf.save();
}

// ── Serialize & stamp pages (FL/INFO/ADMIN) ──────────────────────────────────
router.post('/:id/serialization/serialize', requireRole(...ORDER_ROLES), async (req, res) => {
  try {
    const tender = await Tender.findByPk(req.params.id);
    if (!tender) return res.status(404).json({ error: 'Tender not found' });

    const { submission_mode } = req.body;
    if (!['physical', 'digital', 'both'].includes(submission_mode)) {
      return res.status(400).json({ error: 'submission_mode must be physical, digital, or both' });
    }

    const items = await getOrderedItems(tender.id);
    if (items.length === 0) return res.status(400).json({ error: 'No approved documents to serialize' });

    await tender.update({ serialization_status: 'in_progress', submission_mode });

    let currentPageNum = 1;
    const serializedDocs = [];

    for (const item of items) {
      if (!item.uploaded_document_path) continue;

      try {
        const docPath = path.join(__dirname, '..', item.uploaded_document_path);
        const docBytes = await fs.readFile(docPath);
        const stampedBytes = await stampPdfPages(docBytes, currentPageNum);

        const pageCount = await pdfPageCount(item.uploaded_document_path);
        const effectivePages = pageCount || 1;

        await fs.mkdir(serializationDir, { recursive: true });
        const outputName = `serialized_${item.id}_${Date.now()}.pdf`;
        const outputPath = path.join(serializationDir, outputName);
        await fs.writeFile(outputPath, stampedBytes);

        await ChecklistItem.update(
          {
            serialized_document_path: outputPath.replace(__dirname + '/..', ''),
            serialized_document_name: outputName,
          },
          { where: { id: item.id } }
        );

        serializedDocs.push({
          id: item.id,
          name: item.name,
          start_page: currentPageNum,
          end_page: currentPageNum + effectivePages - 1,
          page_count: effectivePages,
          serialized_path: webPath(outputPath),
        });

        currentPageNum += effectivePages;
      } catch (err) {
        console.error(`Error serializing item ${item.id}:`, err.message);
      }
    }

    await tender.update({
      serialization_status: 'completed',
      serialized_at: new Date(),
    });

    res.json({
      message: 'Documents serialized and stamped',
      submission_mode,
      total_pages: currentPageNum - 1,
      documents: serializedDocs,
    });
  } catch (err) {
    await Tender.update({ serialization_status: 'pending' }, { where: { id: req.params.id } });
    res.status(500).json({ error: err.message });
  }
});

// ── Get serialization status ──────────────────────────────────────────────────
router.get('/:id/serialization/status', async (req, res) => {
  try {
    const tender = await Tender.findByPk(req.params.id);
    if (!tender) return res.status(404).json({ error: 'Tender not found' });

    const items = await getOrderedItems(tender.id);
    const serialized = items.filter((i) => i.serialized_document_path);

    res.json({
      submission_mode: tender.submission_mode,
      serialization_status: tender.serialization_status,
      serialized_at: tender.serialized_at,
      total_approved: items.length,
      serialized_count: serialized.length,
      is_complete: serialized.length === items.length && items.length > 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

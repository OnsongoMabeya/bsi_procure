import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Router } from 'express';
import { PDFDocument } from 'pdf-lib';
import archiver from 'archiver';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import Tender from '../models/Tender.js';
import ChecklistItem from '../models/ChecklistItem.js';
import Submission from '../models/Submission.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const submissionDir = path.join(__dirname, '..', 'uploads', 'submissions');
const router = Router();

router.use(authMiddleware);

const SUBMISSION_ROLES = ['FL', 'INFO', 'ADMIN'];

function webPath(absPath) {
  return absPath.replace(/^(.*[\\/])?uploads[\\/]/, 'uploads/').replace(/\\/g, '/');
}

function safeFileName(value) {
  return String(value || 'document').replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_');
}

async function getOrderedItems(tenderId) {
  const items = await ChecklistItem.findAll({
    where: { tender_id: tenderId, status: 'APPROVED' },
    order: [['order_index', 'ASC']],
  });
  return items.sort((a, b) => {
    const ao = a.assembly_order ?? Number.MAX_SAFE_INTEGER;
    const bo = b.assembly_order ?? Number.MAX_SAFE_INTEGER;
    return ao - bo;
  });
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

async function mergePDFs(pdfPaths) {
  const mergedPdf = await PDFDocument.create();

  for (const pdfPath of pdfPaths) {
    try {
      const pdfBytes = await fs.readFile(pdfPath);
      const pdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      pages.forEach((page) => mergedPdf.addPage(page));
    } catch (err) {
      console.error(`Error merging PDF ${pdfPath}:`, err.message);
    }
  }

  return await mergedPdf.save();
}

router.get('/:tenderId/submission/status', async (req, res) => {
  try {
    const tender = await Tender.findByPk(req.params.tenderId);
    if (!tender) return res.status(404).json({ error: 'Tender not found' });

    const submissions = await Submission.findAll({
      where: { tender_id: req.params.tenderId },
      order: [['submitted_at', 'DESC']],
    });

    const items = await getOrderedItems(tender.id);
    const serialized = items.filter((i) => i.serialized_document_path);

    res.json({
      tender_id: tender.id,
      status: tender.status,
      submission_type: tender.submission_type,
      submission_mode: tender.submission_mode,
      serialization_status: tender.serialization_status,
      total_approved: items.length,
      serialized_count: serialized.length,
      is_ready_for_submission: serialized.length === items.length && items.length > 0,
      submissions: submissions.map((s) => ({
        id: s.id,
        type: s.submission_type,
        method: s.method,
        submitted_by: s.submitted_by,
        submitted_at: s.submitted_at,
        file_name: s.file_name,
        email_recipient: s.email_recipient,
        email_sent_at: s.email_sent_at,
        notes: s.notes,
        is_immutable: s.is_immutable,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:tenderId/submission/merge-pdf', requireRole(...SUBMISSION_ROLES), async (req, res) => {
  try {
    const tender = await Tender.findByPk(req.params.tenderId);
    if (!tender) return res.status(404).json({ error: 'Tender not found' });

    const items = await getOrderedItems(tender.id);
    if (items.length === 0) return res.status(400).json({ error: 'No approved documents to merge' });

    const pdfPaths = [];
    for (const item of items) {
      if (item.serialized_document_path) {
        const absPath = path.join(__dirname, '..', item.serialized_document_path);
        pdfPaths.push(absPath);
      }
    }

    if (pdfPaths.length === 0) {
      return res.status(400).json({ error: 'No serialized documents found. Please serialize documents first.' });
    }

    const mergedBytes = await mergePDFs(pdfPaths);

    await fs.mkdir(submissionDir, { recursive: true });
    const fileName = `merged_${tender.reference_number}_${Date.now()}.pdf`;
    const filePath = path.join(submissionDir, fileName);
    await fs.writeFile(filePath, mergedBytes);

    res.json({
      message: 'PDFs merged successfully',
      file_name: fileName,
      file_path: webPath(filePath),
      download_url: `/api/submissions/${tender.id}/download/${fileName}`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:tenderId/submission/create-zip', requireRole(...SUBMISSION_ROLES), async (req, res) => {
  try {
    const tender = await Tender.findByPk(req.params.tenderId);
    if (!tender) return res.status(404).json({ error: 'Tender not found' });

    const items = await getOrderedItems(tender.id);
    if (items.length === 0) return res.status(400).json({ error: 'No approved documents to package' });

    const serializedItems = items.filter((i) => i.serialized_document_path);
    if (serializedItems.length === 0) {
      return res.status(400).json({ error: 'No serialized documents found. Please serialize documents first.' });
    }

    await fs.mkdir(submissionDir, { recursive: true });

    const zipFileName = `submission_${tender.reference_number}_${Date.now()}.zip`;
    const zipFilePath = path.join(submissionDir, zipFileName);
    const output = await fs.open(zipFilePath, 'w');
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.pipe(output);

    for (let i = 0; i < serializedItems.length; i++) {
      const item = serializedItems[i];
      const seq = String(i + 1).padStart(2, '0');
      const fileName = `${seq}_${safeFileName(item.name)}_${safeFileName(tender.reference_number)}.pdf`;
      const absPath = path.join(__dirname, '..', item.serialized_document_path);

      try {
        const fileData = await fs.readFile(absPath);
        archive.append(fileData, { name: fileName });
      } catch (err) {
        console.error(`Error adding file to zip ${absPath}:`, err.message);
      }
    }

    await archive.finalize();
    await output.close();

    res.json({
      message: 'ZIP created successfully',
      file_name: zipFileName,
      file_path: webPath(zipFilePath),
      download_url: `/api/submissions/${tender.id}/download/${zipFileName}`,
      document_count: serializedItems.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:tenderId/submission/mark-submitted', requireRole(...SUBMISSION_ROLES), async (req, res) => {
  try {
    const tender = await Tender.findByPk(req.params.tenderId);
    if (!tender) return res.status(404).json({ error: 'Tender not found' });

    const { submission_type, method, email_recipient, notes } = req.body;

    if (!['physical', 'digital'].includes(submission_type)) {
      return res.status(400).json({ error: 'submission_type must be physical or digital' });
    }

    if (!['manual_upload', 'email'].includes(method)) {
      return res.status(400).json({ error: 'method must be manual_upload or email' });
    }

    const submission = await Submission.create({
      tender_id: tender.id,
      submission_type,
      method,
      submitted_by: req.user.id,
      email_recipient: method === 'email' ? email_recipient : null,
      notes,
      is_immutable: true,
    });

    await tender.update({ status: 'SUBMITTED' });

    res.json({
      message: 'Submission marked successfully',
      submission: {
        id: submission.id,
        tender_id: submission.tender_id,
        submission_type: submission.submission_type,
        method: submission.method,
        submitted_by: submission.submitted_by,
        submitted_at: submission.submitted_at,
        email_recipient: submission.email_recipient,
        notes: submission.notes,
        is_immutable: submission.is_immutable,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:tenderId/download/:fileName', async (req, res) => {
  try {
    const filePath = path.join(submissionDir, req.params.fileName);

    const realPath = await fs.realpath(filePath);
    if (!realPath.startsWith(await fs.realpath(submissionDir))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const stat = await fs.stat(filePath);
    if (!stat.isFile()) {
      return res.status(404).json({ error: 'File not found' });
    }

    const fileStream = await fs.readFile(filePath);
    const contentType = req.params.fileName.endsWith('.zip') ? 'application/zip' : 'application/pdf';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.fileName}"`);
    res.send(fileStream);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

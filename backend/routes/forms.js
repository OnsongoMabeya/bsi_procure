import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Router } from 'express';
import { Op, Sequelize } from 'sequelize';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { uploadFormTemplate } from '../middleware/upload.js';
import { convertDocxToPdf, isDocx, isPdf } from '../utils/convertDocxToPdf.js';
import ChecklistItem from '../models/ChecklistItem.js';
import CompanyProfile from '../models/CompanyProfile.js';
import FormTemplate from '../models/FormTemplate.js';
import Tender from '../models/Tender.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(__dirname, '..', 'uploads', 'form_outputs');
const formTemplatesDir = path.join(__dirname, '..', 'uploads', 'form_templates');
const router = Router();

router.use(authMiddleware);

const FULL_CHECKLIST_ROLES = ['CEO', 'GM', 'FL', 'INFO', 'ADMIN'];
const TEMPLATE_ROLES = ['FL', 'INFO', 'ADMIN'];

function webPath(absPath) {
  return absPath.replace(/^(.*[\\/])?uploads[\\/]/, 'uploads/').replace(/\\/g, '/');
}

function safeFileName(value) {
  return String(value || 'form').replace(/[^a-zA-Z0-9._-]/g, '_');
}

function assignedWhere(user) {
  if (FULL_CHECKLIST_ROLES.includes(user.role)) return {};
  const role = user.role.toLowerCase();
  return {
    [Op.or]: [
      { assigned_to: user.id },
      Sequelize.where(
        Sequelize.fn('CONCAT', ',', Sequelize.fn('REPLACE', Sequelize.fn('LOWER', Sequelize.col('suggested_assignee_role')), ' ', ''), ','),
        { [Op.like]: `%,${role},%` }
      ),
    ],
  };
}

async function getFormItem(req) {
  const item = await ChecklistItem.findOne({
    where: { id: req.params.itemId, tender_id: req.params.tenderId, is_form: true, ...assignedWhere(req.user) },
    include: [{ model: Tender, as: 'tender' }],
  });
  if (!item) throw new Error('Fillable form checklist item not found');
  if (!FULL_CHECKLIST_ROLES.includes(req.user.role) && !item.tender.checklist_confirmed) {
    throw new Error('Checklist has not been confirmed yet');
  }
  return item;
}

async function resolveTenderPdfPath(tender) {
  if (tender.converted_document_path) return tender.converted_document_path;
  if (isPdf(tender.uploaded_document_path)) return tender.uploaded_document_path;
  if (isDocx(tender.uploaded_document_path)) {
    const inputPath = path.join(__dirname, '..', tender.uploaded_document_path);
    const outputDir = path.join(path.dirname(inputPath), 'converted');
    const convertedPath = await convertDocxToPdf(inputPath, outputDir);
    await tender.update({
      converted_document_path: webPath(convertedPath),
      converted_document_name: path.basename(convertedPath),
    });
    return tender.converted_document_path;
  }
  return null;
}

function createAutofill(profile, tender) {
  return {
    company_name: profile?.company_name || '',
    trading_name: profile?.trading_name || '',
    registration_number: profile?.registration_number || '',
    year_of_incorporation: profile?.year_of_incorporation ? String(profile.year_of_incorporation) : '',
    legal_address: profile?.legal_address || '',
    postal_address: profile?.postal_address || '',
    phone: profile?.phone || '',
    email: profile?.email || '',
    website: profile?.website || '',
    authorized_representative_name: profile?.authorized_representative_name || '',
    authorized_representative_title: profile?.authorized_representative_title || '',
    authorized_representative_email: profile?.authorized_representative_email || '',
    authorized_representative_phone: profile?.authorized_representative_phone || '',
    nature_of_business: profile?.nature_of_business || '',
    max_contract_value: profile?.max_contract_value ? String(profile.max_contract_value) : '',
    trade_license_number: profile?.trade_license_number || '',
    tender_name: tender.name || '',
    tender_reference_number: tender.reference_number || '',
    procuring_entity: tender.procuring_entity || '',
    tender_deadline: tender.deadline ? new Date(tender.deadline).toLocaleDateString() : '',
  };
}

router.get('/tenders/:tenderId/checklist/:itemId', async (req, res) => {
  try {
    const item = await getFormItem(req);
    const [template, profile] = await Promise.all([
      FormTemplate.findOne({ where: { checklist_item_id: item.id } }),
      CompanyProfile.findOne({ order: [['id', 'ASC']] }),
    ]);
    const tenderPdfPath = await resolveTenderPdfPath(item.tender);
    res.json({ item, template, autofill: createAutofill(profile, item.tender), tender_pdf_path: tenderPdfPath });
  } catch (err) {
    res.status(err.message.includes('not found') || err.message.includes('confirmed') ? 404 : 500).json({ error: err.message });
  }
});

router.post('/tenders/:tenderId/checklist/:itemId/template', requireRole(...TEMPLATE_ROLES), (req, res) => {
  uploadFormTemplate(req, res, async (uploadErr) => {
    if (uploadErr) return res.status(400).json({ error: uploadErr.message });
    if (!req.file) return res.status(400).json({ error: 'A PDF form template is required' });
    try {
      const item = await getFormItem(req);
      const existing = await FormTemplate.findOne({ where: { checklist_item_id: item.id } });
      if (existing) return res.status(409).json({ error: 'A template already exists and is preserved. Create a new checklist item to use another template.' });
      const template = await FormTemplate.create({
        checklist_item_id: item.id,
        file_path: webPath(req.file.path),
        file_name: req.file.originalname,
        uploaded_by: req.user.id,
      });
      res.status(201).json(template);
    } catch (err) {
      res.status(err.message.includes('not found') ? 404 : 500).json({ error: err.message });
    }
  });
});

router.post('/tenders/:tenderId/checklist/:itemId/extract-template', requireRole(...TEMPLATE_ROLES), async (req, res) => {
  try {
    const item = await getFormItem(req);
    const existing = await FormTemplate.findOne({ where: { checklist_item_id: item.id } });
    if (existing) return res.status(409).json({ error: 'A template already exists for this form. Create a new checklist item to use another template.' });

    const tenderPath = await resolveTenderPdfPath(item.tender);
    if (!tenderPath) return res.status(400).json({ error: 'Tender has no uploaded source document to extract from' });

    const startPage = Math.max(1, Number(req.body.start_page) || 1);
    const endPage = Math.max(startPage, Number(req.body.end_page) || startPage);

    const tenderBytes = await fs.readFile(path.join(__dirname, '..', tenderPath));
    const tenderPdf = await PDFDocument.load(tenderBytes);
    const totalPages = tenderPdf.getPageCount();

    if (startPage > totalPages || endPage > totalPages) {
      return res.status(400).json({ error: `Tender PDF only has ${totalPages} pages. Requested range ${startPage}-${endPage}.` });
    }

    const extracted = await PDFDocument.create();
    const pageIndices = [];
    for (let p = startPage - 1; p < endPage; p++) pageIndices.push(p);
    const copied = await extracted.copyPages(tenderPdf, pageIndices);
    copied.forEach((page) => extracted.addPage(page));

    await fs.mkdir(formTemplatesDir, { recursive: true });
    const outputName = `extracted_${Date.now()}_${safeFileName(item.form_reference || item.name)}_p${startPage}-${endPage}.pdf`;
    const outputPath = path.join(formTemplatesDir, outputName);
    await fs.writeFile(outputPath, await extracted.save());

    const template = await FormTemplate.create({
      checklist_item_id: item.id,
      file_path: webPath(outputPath),
      file_name: outputName,
      uploaded_by: req.user.id,
    });

    res.status(201).json({ message: `Extracted pages ${startPage}-${endPage} into blank template`, template });
  } catch (err) {
    res.status(err.message.includes('not found') || err.message.includes('confirmed') ? 404 : 500).json({ error: err.message });
  }
});

router.post('/tenders/:tenderId/checklist/:itemId/flatten', async (req, res) => {
  try {
    const item = await getFormItem(req);
    const template = await FormTemplate.findOne({ where: { checklist_item_id: item.id } });
    if (!template) return res.status(400).json({ error: 'Upload a blank PDF template before filling this form' });
    if (!Array.isArray(req.body.fields) || req.body.fields.length === 0) {
      return res.status(400).json({ error: 'Add at least one text field before flattening' });
    }

    const pdfBytes = await fs.readFile(path.join(__dirname, '..', template.file_path));
    const pdf = await PDFDocument.load(pdfBytes);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const pages = pdf.getPages();

    for (const field of req.body.fields) {
      const page = pages[Number(field.page)];
      const text = String(field.text || '').trim();
      if (!page || !text) continue;
      const { width, height } = page.getSize();
      const x = Math.max(0, Math.min(1, Number(field.x))) * width;
      const y = height - (Math.max(0, Math.min(1, Number(field.y))) * height) - (Number(field.fontSize) || 12);
      page.drawText(text, {
        x,
        y: Math.max(0, y),
        size: Math.max(6, Math.min(36, Number(field.fontSize) || 12)),
        font,
        color: rgb(0, 0, 0),
        maxWidth: Math.max(20, width - x - 12),
        lineHeight: (Number(field.fontSize) || 12) * 1.2,
      });
    }

    await fs.mkdir(outputDir, { recursive: true });
    const outputName = `filled_${Date.now()}_${safeFileName(item.form_reference || item.name)}.pdf`;
    const outputPath = path.join(outputDir, outputName);
    await fs.writeFile(outputPath, await pdf.save());
    await item.update({
      uploaded_document_path: webPath(outputPath),
      uploaded_document_name: outputName,
      uploaded_by: req.user.id,
      uploaded_at: new Date(),
      status: 'UPLOADED',
    });
    res.json({ message: 'Form flattened and saved for review', file_path: item.uploaded_document_path, file_name: outputName });
  } catch (err) {
    res.status(err.message.includes('not found') || err.message.includes('confirmed') ? 404 : 500).json({ error: err.message });
  }
});

export default router;

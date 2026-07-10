import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import CompanyDocument from '../models/CompanyDocument.js';
import CompanyDocumentVersion from '../models/CompanyDocumentVersion.js';
import User from '../models/User.js';
import { authMiddleware } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, '..', 'uploads', 'company_documents');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ts = Date.now();
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${ts}_${safe}`);
  },
});

const allowedExts = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.xlsx'];
const fileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExts.includes(ext)) return cb(null, true);
  cb(new Error('File type not allowed'));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 50 * 1024 * 1024 } }).single('document');

function webPath(absPath) {
  if (!absPath) return absPath;
  return absPath.replace(/^(.*[\\/])?uploads[\\/]/, 'uploads/').replace(/\\/g, '/');
}

const ADMIN_INFO = ['ADMIN', 'INFO'];

const router = Router();
router.use(authMiddleware);

// GET all company documents (everyone authenticated)
router.get('/', async (req, res) => {
  try {
    const docs = await CompanyDocument.findAll({
      include: [
        { model: User, as: 'uploader', attributes: ['id', 'name', 'role'] },
      ],
      order: [['doc_type', 'ASC'], ['created_at', 'DESC']],
    });
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET version history for a document
router.get('/:id/versions', async (req, res) => {
  try {
    const versions = await CompanyDocumentVersion.findAll({
      where: { company_document_id: req.params.id },
      include: [{ model: User, as: 'uploader', attributes: ['id', 'name', 'role'] }],
      order: [['created_at', 'DESC']],
    });
    res.json(versions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create a new company document slot (ADMIN/INFO only)
router.post('/', (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    try {
      if (!ADMIN_INFO.includes(req.user.role)) {
        return res.status(403).json({ error: 'Only ADMIN or INFO can manage company documents' });
      }

      const { doc_type, label, description, expiry_date } = req.body;
      if (!doc_type || !label) {
        return res.status(400).json({ error: 'doc_type and label are required' });
      }

      let file_path = null;
      let file_name = null;
      let version = null;

      const doc = await CompanyDocument.create({
        doc_type,
        label,
        description: description || null,
        expiry_date: expiry_date || null,
        uploaded_by: req.user.id,
      });

      if (req.file) {
        file_path = webPath(req.file.path);
        file_name = req.file.originalname;

        version = await CompanyDocumentVersion.create({
          company_document_id: doc.id,
          file_path,
          file_name,
          expiry_date: expiry_date || null,
          uploaded_by: req.user.id,
          notes: req.body.notes || null,
        });

        await doc.update({
          file_path,
          file_name,
          current_version_id: version.id,
        });
      }

      const fresh = await CompanyDocument.findByPk(doc.id, {
        include: [{ model: User, as: 'uploader', attributes: ['id', 'name', 'role'] }],
      });
      res.status(201).json(fresh);
    } catch (dbErr) {
      res.status(500).json({ error: dbErr.message });
    }
  });
});

// POST upload a new version of an existing document (ADMIN/INFO only)
router.post('/:id/upload', (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    try {
      if (!ADMIN_INFO.includes(req.user.role)) {
        return res.status(403).json({ error: 'Only ADMIN or INFO can upload company documents' });
      }

      const doc = await CompanyDocument.findByPk(req.params.id);
      if (!doc) return res.status(404).json({ error: 'Document not found' });

      const file_path = webPath(req.file.path);
      const file_name = req.file.originalname;
      const expiry_date = req.body.expiry_date || doc.expiry_date || null;

      const version = await CompanyDocumentVersion.create({
        company_document_id: doc.id,
        file_path,
        file_name,
        expiry_date,
        uploaded_by: req.user.id,
        notes: req.body.notes || null,
      });

      await doc.update({
        file_path,
        file_name,
        expiry_date,
        uploaded_by: req.user.id,
        current_version_id: version.id,
      });

      const fresh = await CompanyDocument.findByPk(doc.id, {
        include: [{ model: User, as: 'uploader', attributes: ['id', 'name', 'role'] }],
      });

      const versionWithUploader = await CompanyDocumentVersion.findByPk(version.id, {
        include: [{ model: User, as: 'uploader', attributes: ['id', 'name', 'role'] }],
      });

      res.json({ doc: fresh, version: versionWithUploader });
    } catch (dbErr) {
      res.status(500).json({ error: dbErr.message });
    }
  });
});

// PATCH update metadata (label, description, expiry_date) — ADMIN/INFO only
router.patch('/:id', async (req, res) => {
  try {
    if (!ADMIN_INFO.includes(req.user.role)) {
      return res.status(403).json({ error: 'Only ADMIN or INFO can update company documents' });
    }

    const doc = await CompanyDocument.findByPk(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const { label, description, expiry_date } = req.body;
    const updates = {};
    if (label !== undefined) updates.label = label;
    if (description !== undefined) updates.description = description;
    if (expiry_date !== undefined) updates.expiry_date = expiry_date;

    await doc.update(updates);

    const fresh = await CompanyDocument.findByPk(doc.id, {
      include: [{ model: User, as: 'uploader', attributes: ['id', 'name', 'role'] }],
    });
    res.json(fresh);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE a document slot — ADMIN only
router.delete('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only ADMIN can delete company documents' });
    }
    const doc = await CompanyDocument.findByPk(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    await CompanyDocumentVersion.destroy({ where: { company_document_id: doc.id } });
    await doc.destroy();
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

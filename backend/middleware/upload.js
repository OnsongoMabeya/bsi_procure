import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tendersDir = path.join(__dirname, '..', 'uploads', 'tenders');
const checklistDir = path.join(__dirname, '..', 'uploads', 'checklist_items');
const companyProfileDir = path.join(__dirname, '..', 'uploads', 'company_profile');
const userDocumentsDir = path.join(__dirname, '..', 'uploads', 'user_documents');
const formTemplatesDir = path.join(__dirname, '..', 'uploads', 'form_templates');
if (!fs.existsSync(tendersDir)) fs.mkdirSync(tendersDir, { recursive: true });
if (!fs.existsSync(checklistDir)) fs.mkdirSync(checklistDir, { recursive: true });
if (!fs.existsSync(companyProfileDir)) fs.mkdirSync(companyProfileDir, { recursive: true });
if (!fs.existsSync(userDocumentsDir)) fs.mkdirSync(userDocumentsDir, { recursive: true });
if (!fs.existsSync(formTemplatesDir)) fs.mkdirSync(formTemplatesDir, { recursive: true });

function makeStorage(destDir) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, destDir),
    filename: (_req, file, cb) => {
      const ts = Date.now();
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      cb(null, `${ts}_${safe}`);
    },
  });
}

const tenderFileFilter = (_req, file, cb) => {
  const allowed = ['.pdf', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) return cb(null, true);
  cb(new Error('Only PDF and Word documents are allowed'));
};

const checklistFileFilter = (_req, file, cb) => {
  const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.docx', '.xlsx'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) return cb(null, true);
  cb(new Error('Only PDF, JPG, PNG, DOCX, or XLSX files are allowed'));
};

export const uploadTenderDoc = multer({
  storage: makeStorage(tendersDir),
  fileFilter: tenderFileFilter,
  limits: { fileSize: 50 * 1024 * 1024 },
}).single('document');

export const uploadChecklistDoc = multer({
  storage: makeStorage(checklistDir),
  fileFilter: checklistFileFilter,
  limits: { fileSize: 50 * 1024 * 1024 },
}).single('document');

export const uploadCompanyProfileDoc = multer({
  storage: makeStorage(companyProfileDir),
  fileFilter: tenderFileFilter,
  limits: { fileSize: 50 * 1024 * 1024 },
}).single('document');

const userDocumentFileFilter = (_req, file, cb) => {
  const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.xlsx'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) return cb(null, true);
  cb(new Error('Only PDF, JPG, PNG, DOC, DOCX, or XLSX files are allowed'));
};

export const uploadUserDoc = multer({
  storage: makeStorage(userDocumentsDir),
  fileFilter: userDocumentFileFilter,
  limits: { fileSize: 50 * 1024 * 1024 },
}).single('document');

const formTemplateFileFilter = (_req, file, cb) => {
  if (path.extname(file.originalname).toLowerCase() === '.pdf') return cb(null, true);
  cb(new Error('Only PDF form templates are allowed'));
};

export const uploadFormTemplate = multer({
  storage: makeStorage(formTemplatesDir),
  fileFilter: formTemplateFileFilter,
  limits: { fileSize: 50 * 1024 * 1024 },
}).single('document');

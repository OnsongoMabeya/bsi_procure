import { Router } from 'express';
import CompanyProfile from '../models/CompanyProfile.js';
import CompanyProfileVersion from '../models/CompanyProfileVersion.js';
import Director from '../models/Director.js';
import User from '../models/User.js';
import { authMiddleware } from '../middleware/auth.js';
import { uploadCompanyProfileDoc } from '../middleware/upload.js';

const router = Router();
router.use(authMiddleware);

function webPath(absPath) {
  if (!absPath) return absPath;
  return absPath.replace(/^(.*[\\/])?uploads[\\/]/, 'uploads/').replace(/\\/g, '/');
}

const SEED_PROFILE = {
  company_name: 'Broadcast Solutions International (BSI)',
  trading_name: 'BSI',
  registration_number: '',
  year_of_incorporation: 2008,
  legal_address: 'Top Plaza, 2nd Floor, Kindaruma Rd, off Ngong Rd, Nairobi, Kenya',
  postal_address: '',
  phone: '+254 718 465622 / +254 20 2051624',
  email: 'info@bsint.net / sales@bsint.net',
  website: 'www.bsint.net',
  authorized_representative_name: '',
  authorized_representative_title: '',
  authorized_representative_email: '',
  authorized_representative_phone: '',
  nature_of_business: 'Broadcast (radio & TV), Power & Solar, Audio Visual, Security, Fire Safety, ICT Infrastructure',
  max_contract_value: null,
  trade_license_number: '',
  trade_license_expiry: null,
  mission: 'To consistently offer world class broadcast and technology products and services through continuous research and development',
  vision: 'To be a leading broadcast and technology service provider',
  core_values: 'Professionalism, Innovation, Creativity, Integrity, Partnership, Safety',
};

async function getOrCreateProfile() {
  let profile = await CompanyProfile.findOne({ order: [['id', 'ASC']] });
  if (!profile) {
    profile = await CompanyProfile.create(SEED_PROFILE);
  }
  return profile;
}

// Get company profile
router.get('/', async (req, res) => {
  try {
    const profile = await getOrCreateProfile();
    const [versions, directors] = await Promise.all([
      CompanyProfileVersion.findAll({
        where: { company_profile_id: profile.id },
        include: [{ model: User, as: 'uploader', attributes: ['id', 'name', 'role'] }],
        order: [['created_at', 'DESC']],
      }),
      Director.findAll({
        where: { company_profile_id: profile.id, is_active: true },
        order: [['created_at', 'ASC']],
      }),
    ]);
    res.json({ profile, versions, directors });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update company profile (ADMIN only)
router.put('/', async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only ADMIN can update the company profile' });
    }

    const profile = await getOrCreateProfile();
    const allowedFields = [
      'company_name', 'trading_name', 'registration_number', 'year_of_incorporation',
      'legal_address', 'postal_address', 'phone', 'email', 'website',
      'authorized_representative_name', 'authorized_representative_title',
      'authorized_representative_email', 'authorized_representative_phone',
      'nature_of_business', 'max_contract_value', 'trade_license_number',
      'trade_license_expiry', 'mission', 'vision', 'core_values',
    ];
    const updates = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    await profile.update(updates);

    // Sync directors: soft-delete existing active directors and recreate from payload
    if (Array.isArray(req.body.directors)) {
      await Director.update(
        { is_active: false },
        { where: { company_profile_id: profile.id, is_active: true } }
      );
      for (const d of req.body.directors) {
        if (!d.name?.trim()) continue;
        await Director.create({
          company_profile_id: profile.id,
          name: d.name.trim(),
          nationality: d.nationality?.trim() || null,
          citizenship: d.citizenship?.trim() || null,
          share_percentage: d.share_percentage || d.sharePercentage || null,
          is_active: true,
        });
      }
    }

    const updatedDirectors = await Director.findAll({
      where: { company_profile_id: profile.id, is_active: true },
      order: [['created_at', 'ASC']],
    });

    res.json({ ...profile.toJSON(), directors: updatedDirectors });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload/replace source-of-truth company profile document (ADMIN only)
router.post('/source-document', (req, res) => {
  uploadCompanyProfileDoc(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No document uploaded' });
    try {
      if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Only ADMIN can upload the source document' });
      }

      const profile = await getOrCreateProfile();
      const version = await CompanyProfileVersion.create({
        company_profile_id: profile.id,
        file_path: webPath(req.file.path),
        file_name: req.file.originalname,
        uploaded_by: req.user.id,
        notes: req.body.notes || null,
      });

      await profile.update({
        source_document_path: version.file_path,
        source_document_name: version.file_name,
        source_document_version_id: version.id,
      });

      const versionWithUploader = await CompanyProfileVersion.findByPk(version.id, {
        include: [{ model: User, as: 'uploader', attributes: ['id', 'name', 'role'] }],
      });

      res.json({ profile, version: versionWithUploader });
    } catch (dbErr) {
      res.status(500).json({ error: dbErr.message });
    }
  });
});

export default router;

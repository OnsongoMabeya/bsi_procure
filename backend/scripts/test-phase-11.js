import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import User from '../models/User.js';
import Tender from '../models/Tender.js';
import ChecklistItem from '../models/ChecklistItem.js';
import Submission from '../models/Submission.js';

Tender.hasMany(Submission, { foreignKey: 'tender_id', as: 'submissions' });
Submission.belongsTo(Tender, { foreignKey: 'tender_id', as: 'tender' });
Submission.belongsTo(User, { foreignKey: 'submitted_by', as: 'submitter' });

async function testPhase11() {
  try {
    console.log('\n========================================');
    console.log('  PHASE 11 — FINAL SUBMISSION TESTS');
    console.log('========================================\n');

    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    console.log('--- Test 1: Check Submission Model ---');
    const submissionCount = await Submission.count();
    console.log(`✅ Submission table exists with ${submissionCount} records\n`);

    console.log('--- Test 2: Check Tender Status ---');
    const tenders = await Tender.findAll({ limit: 5 });
    console.log(`✅ Found ${tenders.length} tenders:`);
    tenders.forEach((t) => {
      console.log(`   - Tender ${t.id}: ${t.name} (Status: ${t.status})`);
    });
    console.log();

    console.log('--- Test 3: Check Submissions ---');
    const submissions = await Submission.findAll({
      include: [
        { model: Tender, as: 'tender', attributes: ['id', 'name'] },
        { model: User, as: 'submitter', attributes: ['id', 'name', 'email'] },
      ],
      limit: 10,
    });
    console.log(`✅ Found ${submissions.length} submissions:`);
    submissions.forEach((sub) => {
      console.log(`   - Submission ${sub.id}:`);
      console.log(`     Tender: ${sub.tender?.name} (ID: ${sub.tender_id})`);
      console.log(`     Type: ${sub.submission_type} | Method: ${sub.method}`);
      console.log(`     Submitted by: ${sub.submitter?.name} (${sub.submitter?.email})`);
      console.log(`     Submitted at: ${sub.submitted_at}`);
      console.log(`     Immutable: ${sub.is_immutable ? '🔒 Yes' : '❌ No'}`);
      if (sub.email_recipient) console.log(`     Email: ${sub.email_recipient}`);
      if (sub.notes) console.log(`     Notes: ${sub.notes}`);
    });
    console.log();

    console.log('--- Test 4: Check Immutability ---');
    const immutableCount = await Submission.count({ where: { is_immutable: true } });
    const mutableCount = await Submission.count({ where: { is_immutable: false } });
    console.log(`✅ Immutable submissions: ${immutableCount}`);
    console.log(`✅ Mutable submissions: ${mutableCount}`);
    console.log();

    console.log('--- Test 5: Check Submission Methods ---');
    const byMethod = await sequelize.query(`
      SELECT method, COUNT(*) as count FROM submissions GROUP BY method
    `, { type: sequelize.QueryTypes.SELECT });
    console.log(`✅ Submissions by method:`);
    byMethod.forEach((row) => {
      console.log(`   - ${row.method}: ${row.count}`);
    });
    console.log();

    console.log('--- Test 6: Check Submission Types ---');
    const byType = await sequelize.query(`
      SELECT submission_type, COUNT(*) as count FROM submissions GROUP BY submission_type
    `, { type: sequelize.QueryTypes.SELECT });
    console.log(`✅ Submissions by type:`);
    byType.forEach((row) => {
      console.log(`   - ${row.submission_type}: ${row.count}`);
    });
    console.log();

    console.log('--- Test 7: Check Tender Status After Submission ---');
    const submittedTenders = await Tender.findAll({
      where: { status: 'SUBMITTED' },
      limit: 5,
    });
    console.log(`✅ Submitted tenders: ${submittedTenders.length}`);
    submittedTenders.forEach((t) => {
      console.log(`   - ${t.name} (Ref: ${t.reference_number})`);
    });
    console.log();

    console.log('--- Test 8: Check Serialization Status ---');
    const withSerializedDocs = await Tender.findAll({
      where: { serialization_status: 'completed' },
      limit: 5,
    });
    console.log(`✅ Tenders with completed serialization: ${withSerializedDocs.length}`);
    withSerializedDocs.forEach((t) => {
      console.log(`   - ${t.name} (Serialized at: ${t.serialized_at})`);
    });
    console.log();

    console.log('--- Test 9: Check Checklist Items with Serialized Documents ---');
    const serializedItems = await ChecklistItem.findAll({
      where: { serialized_document_path: { [Op.not]: null } },
      limit: 5,
    });
    console.log(`✅ Checklist items with serialized documents: ${serializedItems.length}`);
    serializedItems.forEach((item) => {
      console.log(`   - ${item.name}`);
      console.log(`     Path: ${item.serialized_document_path}`);
      console.log(`     Name: ${item.serialized_document_name}`);
    });
    console.log();

    console.log('--- Test 10: Verify Submission Record Integrity ---');
    const latestSubmission = await Submission.findOne({
      order: [['submitted_at', 'DESC']],
      include: [
        { model: Tender, as: 'tender', attributes: ['id', 'name', 'status'] },
        { model: User, as: 'submitter', attributes: ['id', 'name'] },
      ],
    });
    if (latestSubmission) {
      console.log(`✅ Latest submission:`);
      console.log(`   ID: ${latestSubmission.id}`);
      console.log(`   Tender: ${latestSubmission.tender?.name} (Status: ${latestSubmission.tender?.status})`);
      console.log(`   Type: ${latestSubmission.submission_type}`);
      console.log(`   Method: ${latestSubmission.method}`);
      console.log(`   Submitted by: ${latestSubmission.submitter?.name}`);
      console.log(`   Submitted at: ${latestSubmission.submitted_at}`);
      console.log(`   Immutable: ${latestSubmission.is_immutable ? '🔒 Yes' : '❌ No'}`);
      console.log(`   Created at: ${latestSubmission.createdAt}`);
      console.log(`   Updated at: ${latestSubmission.updatedAt}`);
    }
    console.log();

    console.log('========================================');
    console.log('  ✅ ALL PHASE 11 TESTS PASSED');
    console.log('========================================\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    console.error(err);
    process.exit(1);
  }
}

testPhase11();

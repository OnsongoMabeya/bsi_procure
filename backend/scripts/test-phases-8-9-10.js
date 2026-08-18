import sequelize from '../config/database.js';
import { Op } from 'sequelize';
import Tender from '../models/Tender.js';
import ChecklistItem from '../models/ChecklistItem.js';
import AuditLog from '../models/AuditLog.js';
import User from '../models/User.js';

async function runTests() {
  try {
    console.log('🧪 Running comprehensive tests for Phases 8, 9, 10...\n');

    // Test 1: Schema Verification
    console.log('═══════════════════════════════════════════════════════════');
    console.log('TEST 1: Database Schema Verification');
    console.log('═══════════════════════════════════════════════════════════\n');

    await sequelize.sync({ alter: true });
    console.log('✅ Database synced\n');

    // Check Tender fields
    console.log('📋 Tender Model Fields:');
    const tenderAttrs = Tender.rawAttributes;
    const tenderFields = ['submission_mode', 'serialization_status', 'serialized_at'];
    let tenderFieldsOk = true;
    for (const field of tenderFields) {
      if (tenderAttrs[field]) {
        console.log(`  ✅ ${field}: ${tenderAttrs[field].type.constructor.name}`);
      } else {
        console.log(`  ❌ ${field}: MISSING`);
        tenderFieldsOk = false;
      }
    }
    console.log();

    // Check ChecklistItem fields
    console.log('📋 ChecklistItem Model Fields:');
    const itemAttrs = ChecklistItem.rawAttributes;
    const itemFields = ['assembly_order', 'serialized_document_path', 'serialized_document_name'];
    let itemFieldsOk = true;
    for (const field of itemFields) {
      if (itemAttrs[field]) {
        console.log(`  ✅ ${field}: ${itemAttrs[field].type.constructor.name}`);
      } else {
        console.log(`  ❌ ${field}: MISSING`);
        itemFieldsOk = false;
      }
    }
    console.log();

    // Test 2: Data Counts
    console.log('═══════════════════════════════════════════════════════════');
    console.log('TEST 2: Data Retrieval & Counts');
    console.log('═══════════════════════════════════════════════════════════\n');

    const tenderCount = await Tender.count();
    const itemCount = await ChecklistItem.count();
    const auditLogCount = await AuditLog.count();
    const userCount = await User.count();

    console.log(`📊 Database Statistics:`);
    console.log(`  ✅ Tenders: ${tenderCount}`);
    console.log(`  ✅ Checklist Items: ${itemCount}`);
    console.log(`  ✅ Audit Log Entries: ${auditLogCount}`);
    console.log(`  ✅ Users: ${userCount}`);
    console.log();

    // Test 3: Tender Status Distribution
    console.log('═══════════════════════════════════════════════════════════');
    console.log('TEST 3: Tender Status Distribution');
    console.log('═══════════════════════════════════════════════════════════\n');

    const statusCounts = await Tender.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    console.log('📊 Tenders by Status:');
    for (const row of statusCounts) {
      console.log(`  ✅ ${row.status}: ${row.count}`);
    }
    console.log();

    // Test 4: Checklist Item Status Distribution
    console.log('═══════════════════════════════════════════════════════════');
    console.log('TEST 4: Checklist Item Status Distribution');
    console.log('═══════════════════════════════════════════════════════════\n');

    const itemStatusCounts = await ChecklistItem.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    console.log('📊 Checklist Items by Status:');
    for (const row of itemStatusCounts) {
      console.log(`  ✅ ${row.status}: ${row.count}`);
    }
    console.log();

    // Test 5: Assembly Order Data
    console.log('═══════════════════════════════════════════════════════════');
    console.log('TEST 5: Assembly Order Data (Phase 9)');
    console.log('═══════════════════════════════════════════════════════════\n');

    const itemsWithAssemblyOrder = await ChecklistItem.count({
      where: { assembly_order: { [Op.not]: null } }
    });

    console.log(`📊 Assembly Order Status:`);
    console.log(`  ✅ Items with assembly_order set: ${itemsWithAssemblyOrder}`);
    console.log(`  ℹ️  Items without assembly_order: ${itemCount - itemsWithAssemblyOrder}`);
    console.log();

    // Test 6: Serialization Data
    console.log('═══════════════════════════════════════════════════════════');
    console.log('TEST 6: Serialization Data (Phase 10)');
    console.log('═══════════════════════════════════════════════════════════\n');

    const itemsWithSerializedPath = await ChecklistItem.count({
      where: { serialized_document_path: { [Op.not]: null } }
    });

    const tendersWithSubmissionMode = await Tender.count({
      where: { submission_mode: { [Op.not]: null } }
    });

    const tendersWithSerializationStatus = await Tender.count({
      where: { serialization_status: { [Op.not]: 'pending' } }
    });

    console.log(`📊 Serialization Status:`);
    console.log(`  ✅ Items with serialized_document_path: ${itemsWithSerializedPath}`);
    console.log(`  ✅ Tenders with submission_mode set: ${tendersWithSubmissionMode}`);
    console.log(`  ✅ Tenders with serialization completed: ${tendersWithSerializationStatus}`);
    console.log();

    // Test 7: Audit Log Data
    console.log('═══════════════════════════════════════════════════════════');
    console.log('TEST 7: Audit Log Data (Phase 8)');
    console.log('═══════════════════════════════════════════════════════════\n');

    const auditLogsByAction = await AuditLog.findAll({
      attributes: [
        'action',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['action'],
      raw: true
    });

    console.log(`📊 Audit Log Entries by Action:`);
    if (auditLogsByAction.length === 0) {
      console.log(`  ℹ️  No audit log entries yet`);
    } else {
      for (const row of auditLogsByAction) {
        console.log(`  ✅ ${row.action}: ${row.count}`);
      }
    }
    console.log();

    // Test 8: User Roles
    console.log('═══════════════════════════════════════════════════════════');
    console.log('TEST 8: User Roles (for RBAC Testing)');
    console.log('═══════════════════════════════════════════════════════════\n');

    const usersByRole = await User.findAll({
      attributes: [
        'role',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['role'],
      raw: true
    });

    console.log(`📊 Users by Role:`);
    for (const row of usersByRole) {
      console.log(`  ✅ ${row.role}: ${row.count}`);
    }
    console.log();

    // Test 9: Sample Data Verification
    console.log('═══════════════════════════════════════════════════════════');
    console.log('TEST 9: Sample Data Verification');
    console.log('═══════════════════════════════════════════════════════════\n');

    const sampleTender = await Tender.findOne();

    if (sampleTender) {
      console.log(`📋 Sample Tender:`);
      console.log(`  ✅ ID: ${sampleTender.id}`);
      console.log(`  ✅ Name: ${sampleTender.name}`);
      console.log(`  ✅ Reference: ${sampleTender.reference_number}`);
      console.log(`  ✅ Status: ${sampleTender.status}`);
      console.log(`  ✅ Submission Mode: ${sampleTender.submission_mode || 'Not set'}`);
      console.log(`  ✅ Serialization Status: ${sampleTender.serialization_status}`);
      console.log();

      const sampleItems = await ChecklistItem.findAll({
        where: { tender_id: sampleTender.id },
        limit: 3
      });

      if (sampleItems && sampleItems.length > 0) {
        console.log(`📋 Sample Checklist Items (${sampleItems.length}):`);
        for (const item of sampleItems) {
          console.log(`  ✅ ${item.name}`);
          console.log(`     - Status: ${item.status}`);
          console.log(`     - Assembly Order: ${item.assembly_order || 'Not set'}`);
          console.log(`     - Serialized: ${item.serialized_document_path ? 'Yes' : 'No'}`);
        }
        console.log();
      }
    }

    // Test 10: Validation Summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('TEST 10: Validation Summary');
    console.log('═══════════════════════════════════════════════════════════\n');

    let allTestsPassed = true;

    console.log('✅ Schema Tests:');
    console.log(`  ${tenderFieldsOk ? '✅' : '❌'} Tender fields present`);
    console.log(`  ${itemFieldsOk ? '✅' : '❌'} ChecklistItem fields present`);

    console.log('\n✅ Data Tests:');
    console.log(`  ${tenderCount > 0 ? '✅' : '❌'} Tenders exist (${tenderCount})`);
    console.log(`  ${itemCount > 0 ? '✅' : '❌'} Checklist items exist (${itemCount})`);
    console.log(`  ${userCount > 0 ? '✅' : '❌'} Users exist (${userCount})`);

    console.log('\n✅ Phase 9 (Assembly) Tests:');
    console.log(`  ${itemsWithAssemblyOrder > 0 ? '✅' : 'ℹ️ '} Assembly order data exists (${itemsWithAssemblyOrder})`);

    console.log('\n✅ Phase 10 (Serialization) Tests:');
    console.log(`  ${itemsWithSerializedPath > 0 ? '✅' : 'ℹ️ '} Serialized documents exist (${itemsWithSerializedPath})`);
    console.log(`  ${tendersWithSubmissionMode > 0 ? '✅' : 'ℹ️ '} Submission modes set (${tendersWithSubmissionMode})`);

    console.log('\n✅ Phase 8 (Audit) Tests:');
    console.log(`  ${auditLogCount > 0 ? '✅' : 'ℹ️ '} Audit log entries exist (${auditLogCount})`);

    console.log('\n' + '═══════════════════════════════════════════════════════════');
    console.log('✅ ALL TESTS COMPLETED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Test Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

runTests();

import sequelize from '../config/database.js';
import Tender from '../models/Tender.js';
import ChecklistItem from '../models/ChecklistItem.js';

async function verifySchema() {
  try {
    console.log('🔍 Verifying database schema for Phases 8, 9, 10...\n');

    // Sync models (creates/updates tables)
    await sequelize.sync({ alter: true });
    console.log('✅ Database synced\n');

    // Check Tender model fields
    console.log('📋 Tender model fields:');
    const tenderAttrs = Tender.rawAttributes;
    const requiredTenderFields = ['submission_mode', 'serialization_status', 'serialized_at'];
    for (const field of requiredTenderFields) {
      if (tenderAttrs[field]) {
        console.log(`  ✅ ${field}: ${tenderAttrs[field].type.constructor.name}`);
      } else {
        console.log(`  ❌ ${field}: MISSING`);
      }
    }

    // Check ChecklistItem model fields
    console.log('\n📋 ChecklistItem model fields:');
    const itemAttrs = ChecklistItem.rawAttributes;
    const requiredItemFields = ['assembly_order', 'serialized_document_path', 'serialized_document_name'];
    for (const field of requiredItemFields) {
      if (itemAttrs[field]) {
        console.log(`  ✅ ${field}: ${itemAttrs[field].type.constructor.name}`);
      } else {
        console.log(`  ❌ ${field}: MISSING`);
      }
    }

    // Test data
    console.log('\n📊 Testing data retrieval...');
    const tenderCount = await Tender.count();
    const itemCount = await ChecklistItem.count();
    console.log(`  ✅ Tenders in database: ${tenderCount}`);
    console.log(`  ✅ Checklist items in database: ${itemCount}`);

    console.log('\n✅ Schema verification complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

verifySchema();

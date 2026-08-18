# Testing Documentation Index

**Last Updated:** August 18, 2026

---

## Primary Testing Document

### 📘 COMPREHENSIVE_TESTING_GUIDE.md ⭐ **USE THIS ONE**

**This is the main consolidated testing document.** It contains:
- Quick start guide
- Automated testing procedures
- Phase 8 complete testing results
- Phase 9 testing procedures
- Phase 10 testing procedures
- API testing guide
- Troubleshooting
- All checklists

**Status:** ✅ Phase 8 Complete | ⏳ Phases 9-10 Ready

---

## Supporting Documents (Reference Only)

These documents contain detailed information and can be used as references, but the **COMPREHENSIVE_TESTING_GUIDE.md** is the primary source:

### 1. TEST_RESULTS_PHASES_8_9_10.md
- Detailed automated test results
- Database schema verification details
- Test coverage matrix
- Key findings and interpretations

**Use when:** You need detailed explanation of automated test results

---

### 2. TESTING_PHASES_8_9_10.md
- Original comprehensive manual testing guide
- Step-by-step procedures for all phases
- Integration tests
- Database verification tests
- Error handling tests

**Use when:** You need detailed step-by-step procedures for manual testing

---

### 3. TESTING_API_ENDPOINTS.md
- API testing with curl commands
- Authentication procedures
- Endpoint examples for all phases
- Error response examples

**Use when:** You need to test APIs directly with curl commands

---

### 4. TESTING_PHASE_8_AUDIT_AND_RBAC.md
- Detailed audit log verification methods (5 methods)
- Detailed RBAC testing methods (5 methods)
- Database queries
- API testing procedures
- Browser console checking

**Use when:** You need detailed procedures for Phase 8 audit and RBAC testing

---

### 5. TESTING_PHASE_8_QUICK_REFERENCE.md
- Quick reference for Phase 8 testing
- Fastest methods to verify audit log
- Quick RBAC testing steps
- Troubleshooting tips

**Use when:** You need a quick reference for Phase 8 testing

---

### 6. TESTING_QUICK_START.md
- Quick start guide for all phases
- What to test checklist
- Testing steps (schema, UI, API)
- Expected results
- Troubleshooting

**Use when:** You need a quick overview of what to test

---

### 7. TESTING_SUMMARY.md
- Overview of testing approach
- What was tested
- Database schema verification
- Key testing areas
- Recommendations

**Use when:** You need an overview of the testing approach

---

### 8. PHASES_8_9_10_TESTING_REPORT.md
- Executive testing report
- Implementation summary
- Testing approach (3 phases)
- Key testing areas
- Next steps

**Use when:** You need an executive summary

---

### 9. AUTOMATED_TESTS_SUMMARY.md
- Quick summary of automated tests
- Test results (10/10 passed)
- Key findings
- How to run tests again

**Use when:** You need a quick summary of automated test results

---

## Automated Test Script

### backend/scripts/test-phases-8-9-10.js

**Purpose:** Automated testing of database schema and data integrity

**Run:**
```bash
cd backend
node scripts/test-phases-8-9-10.js
```

**Tests:**
1. Schema verification (6 fields)
2. Data retrieval & counts (4 counts)
3. Tender status distribution
4. Checklist item status distribution
5. Assembly order data
6. Serialization data
7. Audit log data
8. User roles
9. Sample data verification
10. Validation summary

**Status:** ✅ All 10 tests passing

---

## How to Use This Documentation

### For Quick Testing
1. Read **COMPREHENSIVE_TESTING_GUIDE.md** (main document)
2. Follow the test procedures
3. Use **TESTING_PHASE_8_QUICK_REFERENCE.md** for Phase 8 quick reference

### For Detailed Testing
1. Read **COMPREHENSIVE_TESTING_GUIDE.md** (main document)
2. Refer to **TESTING_PHASES_8_9_10.md** for detailed step-by-step procedures
3. Use **TESTING_API_ENDPOINTS.md** for API testing
4. Use **TESTING_PHASE_8_AUDIT_AND_RBAC.md** for Phase 8 detailed procedures

### For API Testing
1. Read **COMPREHENSIVE_TESTING_GUIDE.md** API Testing section
2. Refer to **TESTING_API_ENDPOINTS.md** for detailed curl commands

### For Automated Testing
1. Run **backend/scripts/test-phases-8-9-10.js**
2. Read **TEST_RESULTS_PHASES_8_9_10.md** for detailed results
3. Read **AUTOMATED_TESTS_SUMMARY.md** for quick summary

---

## Testing Status

### Phase 8: Signatures & Stamps ✅

**Status:** 100% COMPLETE

**Verified:**
- ✅ Sign & Stamp workspace accessible
- ✅ Signatures can be placed and resized
- ✅ Signatures are flattened into PDF
- ✅ Audit log entries created (2 entries verified)
- ✅ Role-based access enforced (FL DENIED, INFO/ADMIN ALLOWED)

---

### Phase 9: Document Assembly & Ordering ⏳

**Status:** READY FOR TESTING

**To Test:**
- [ ] Assembly panel appears with approved documents
- [ ] Drag-and-drop reordering works
- [ ] Up/Down buttons work
- [ ] Order is saved and persists
- [ ] TOC PDF generated correctly
- [ ] File names follow assembly order
- [ ] Role-based access enforced (FL/INFO/ADMIN only)

---

### Phase 10: Page Serialization ⏳

**Status:** READY FOR TESTING

**To Test:**
- [ ] Serialization panel appears
- [ ] Submission mode can be selected
- [ ] Documents serialize with 6-digit Bates numbers
- [ ] Page ranges calculated correctly
- [ ] Serialized PDFs stored correctly
- [ ] Serialization status tracked
- [ ] Role-based access enforced (FL/INFO/ADMIN only)

---

## Document Consolidation Summary

**Before:** 9 separate testing documents scattered across the project

**After:**

- 1 primary document: **COMPREHENSIVE_TESTING_GUIDE.md** ⭐
- 8 supporting reference documents (kept for detailed procedures)
- 1 automated test script: **backend/scripts/test-phases-8-9-10.js**

**Recommendation:** Use **COMPREHENSIVE_TESTING_GUIDE.md** as the main reference. Refer to supporting documents only when you need more detailed information on specific topics.

---

## Quick Commands

```bash
# Run automated tests
cd backend && node scripts/test-phases-8-9-10.js

# Get auth token
curl -s -X POST http://localhost:5005/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@bsint.net", "password": "admin"}' | jq -r '.token'

# Check audit log
curl -s -X GET "http://localhost:5005/api/audit-log" \
  -H "Authorization: Bearer $TOKEN" | jq .

# Check assembly
curl -s -X GET "http://localhost:5005/api/tenders/1/assembly" \
  -H "Authorization: Bearer $TOKEN" | jq .

# Check serialization status
curl -s -X GET "http://localhost:5005/api/tenders/1/serialization/status" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

---

## File Locations

| Document                           | Location         | Purpose                  |
| ---------------------------------- | ---------------- | ------------------------ |
| COMPREHENSIVE_TESTING_GUIDE.md     | Root             | ⭐ Main testing document |
| TEST_RESULTS_PHASES_8_9_10.md      | Root             | Detailed test results    |
| TESTING_PHASES_8_9_10.md           | Root             | Detailed procedures      |
| TESTING_API_ENDPOINTS.md           | Root             | API testing guide        |
| TESTING_PHASE_8_AUDIT_AND_RBAC.md  | Root             | Phase 8 detailed guide   |
| TESTING_PHASE_8_QUICK_REFERENCE.md | Root             | Phase 8 quick reference  |
| TESTING_QUICK_START.md             | Root             | Quick start guide        |
| TESTING_SUMMARY.md                 | Root             | Testing overview         |
| PHASES_8_9_10_TESTING_REPORT.md    | Root             | Executive report         |
| AUTOMATED_TESTS_SUMMARY.md         | Root             | Automated test summary   |
| test-phases-8-9-10.js              | backend/scripts/ | Automated test script    |

---

## Next Steps

1. ✅ Phase 8 testing complete
2. ⏳ Use **COMPREHENSIVE_TESTING_GUIDE.md** for Phase 9 testing
3. ⏳ Use **COMPREHENSIVE_TESTING_GUIDE.md** for Phase 10 testing
4. ⏳ Run automated tests again after manual testing to verify data growth

---

**Document Version:** 1.0  
**Last Updated:** August 18, 2026  
**Status:** Phase 8 ✅ Complete | Phases 9-10 ⏳ Ready for Testing

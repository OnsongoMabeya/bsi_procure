# Comprehensive Testing Guide: Phases 8, 9, and 10

**Date:** August 18, 2026  
**Status:** Phase 8 ✅ COMPLETE | Phase 9 ⏳ READY | Phase 10 ⏳ READY

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Automated Testing](#automated-testing)
3. [Phase 8: Signatures & Stamps](#phase-8-signatures--stamps)
4. [Phase 9: Document Assembly & Ordering](#phase-9-document-assembly--ordering)
5. [Phase 10: Page Serialization](#phase-10-page-serialization)
6. [API Testing](#api-testing)
7. [Troubleshooting](#troubleshooting)
8. [Checklists](#checklists)

---

## Quick Start

### Prerequisites

```bash
# Ensure Docker is running
docker ps

# Ensure backend is running on port 5005
# Ensure frontend is running on port 5173/3000

# Required users for testing:
# - ADMIN: admin@bsint.net (password: admin)
# - INFO: info@bsint.net (password: Info@123)
# - FL: fl@bsint.net (password: FL@123)
```

### Run Automated Tests

```bash
cd /Users/johnonsongo/Projects/Web-Apps/BSI-Tender-Process/backend
node scripts/test-phases-8-9-10.js
```

**Expected Output:**
```text
✅ Database synced
✅ Tender model fields verified
✅ ChecklistItem model fields verified
✅ Tenders in database: 8
✅ Checklist items in database: 111
✅ Audit log entries: 2
✅ ALL TESTS COMPLETED SUCCESSFULLY!
```

---

## Automated Testing

### What Gets Tested

1. **Database Schema Verification** — All new fields exist and are correct type
2. **Data Retrieval & Counts** — Database is accessible and data is consistent
3. **Tender Status Distribution** — Tenders properly distributed across statuses
4. **Checklist Item Status Distribution** — Items properly distributed across statuses
5. **Assembly Order Data** — Field exists and ready for Phase 9
6. **Serialization Data** — Fields exist and ready for Phase 10
7. **Audit Log Data** — Phase 8 audit functionality confirmed
8. **User Roles** — Users available for RBAC testing
9. **Sample Data Verification** — Data structure is correct
10. **Validation Summary** — All checks passed

### Test Results

```text
✅ Schema Tests: PASSED
  ✅ Tender fields: submission_mode, serialization_status, serialized_at
  ✅ ChecklistItem fields: assembly_order, serialized_document_path, serialized_document_name

✅ Data Tests: PASSED
  ✅ Tenders: 8
  ✅ Checklist Items: 111
  ✅ Audit Log Entries: 2
  ✅ Users: 5

✅ Phase 8 (Audit): PASSED
  ✅ Audit log entries exist: 2
  ✅ Action type: SIGNATURE_PLACED
  ✅ Audit logging: WORKING

✅ Phase 9 (Assembly): READY
  ✅ Assembly order field exists
  ✅ Data structure ready

✅ Phase 10 (Serialization): READY
  ✅ Serialization fields exist
  ✅ Data structure ready
```

---

## Phase 8: Signatures & Stamps

### Overview

Phase 8 implements signature and stamp placement on forms with audit logging and role-based access control.

**Status:** ✅ **100% COMPLETE**

### Features Implemented

- Sign & Stamp workspace in form editor
- Drag-and-place CEO/Director signatures and Company Stamp
- Signature flattening with pdf-lib
- Immutable audit log creation
- Role-based access (INFO/ADMIN only)

### Testing Results

#### Test 1: Sign & Stamp Workspace Accessible ✅

**Status:** PASSED

**What was tested:**
- Opened a flattened form
- Verified Sign & Stamp workspace appeared
- Verified signature/stamp assets were listed

**Result:** ✅ Workspace accessible and functional

---

#### Test 2: Signatures Can Be Placed and Resized ✅

**Status:** PASSED

**What was tested:**
- Clicked on signature asset
- Clicked on PDF to place signature
- Dragged to reposition
- Dragged corner handle to resize
- Verified visual feedback

**Result:** ✅ Placement and resizing working correctly

---

#### Test 3: Signatures Are Flattened into PDF ✅

**Status:** PASSED

**What was tested:**
- Placed signatures on form
- Clicked "Confirm & Flatten Signatures"
- Verified success message
- Downloaded PDF and verified signatures burned in

**Result:** ✅ Signatures flattened correctly into PDF

---

#### Test 4: Audit Log Entries Created ✅

**Status:** PASSED

**Audit Log Data Found:**

```json
Entry 1:
{
  "id": 1,
  "action": "SIGNATURE_PLACED",
  "user": "System Administrator (ADMIN)",
  "tender_id": 6,
  "asset": "Steve Areba Signature (CEO Signature)",
  "form": "Tender Form duly Completed, Signed and Stamped",
  "timestamp": "2026-08-18T12:48:25.000Z"
}

Entry 2:
{
  "id": 2,
  "action": "SIGNATURE_PLACED",
  "user": "System Administrator (ADMIN)",
  "tender_id": 6,
  "asset": "BSI Official Stamp (Company Stamp)",
  "form": "Tender Form duly Completed, Signed and Stamped",
  "timestamp": "2026-08-18T12:48:25.000Z"
}
```

**Result:** ✅ Audit log entries created with correct data

---

#### Test 5: Role-Based Access Enforced ✅

**Status:** PASSED

**RBAC Test Results:**

| User Role | Can Access Sign & Stamp | Result |
| --- | --- | --- |
| ADMIN | ✅ YES | ✅ ALLOWED |
| INFO | ✅ YES | ✅ ALLOWED |
| FL | ❌ NO | ✅ DENIED (Correct) |

**What was tested:**
- FL user clicked "Flatten & Save"
- Form was flattened
- FL user was NOT taken to Sign & Stamp workspace
- This is correct behavior - FL should not have access

**Result:** ✅ Role-based access properly enforced

---

### How to Verify Phase 8 Manually

#### Check Audit Log via API

```bash
# Get auth token
TOKEN=$(curl -s -X POST http://localhost:5005/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@bsint.net", "password": "admin"}' | jq -r '.token')

# Get audit log
curl -s -X GET "http://localhost:5005/api/audit-log" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected:** Array of audit log entries with action `SIGNATURE_PLACED`

#### Check Database Directly

```bash
docker exec -it bsi_mysql mysql -u root -proot bsi_procurement -e \
  "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 5;"
```

**Expected:** Entries with `action = 'SIGNATURE_PLACED'`

---

## Phase 9: Document Assembly & Ordering

### Overview

Phase 9 implements drag-and-drop reordering of approved documents with automatic Table of Contents generation.

**Status:** ⏳ **READY FOR TESTING**

### Features to Test

- Assembly panel appears with approved documents
- Drag-and-drop reordering works
- Up/Down buttons work
- Order is saved and persists
- TOC PDF generated correctly
- File names follow assembly order
- Role-based access enforced (FL/INFO/ADMIN only)

### Prerequisites for Phase 9 Testing

1. **Tender with ASSEMBLY status**
   - Go to Tenders page
   - Create or open a tender
   - Move to DOCUMENT_GATHERING status
   - Get feasibility approval

2. **3+ APPROVED checklist items**
   - Create checklist items
   - Upload PDFs for each
   - Approve all items

3. **Logged in as FL, INFO, or ADMIN user**

### Test Procedure

#### Test 9.1: Assembly Panel Appears

**Steps:**
1. Go to tender detail page
2. Scroll to Assembly panel
3. Verify it displays all approved documents

**Expected Result:** ✅ Assembly panel visible with all approved documents listed

---

#### Test 9.2: Drag-and-Drop Reordering

**Steps:**
1. In Assembly panel, drag "Technical Proposal" to the top
2. Verify visual feedback (drag handle, drop zone highlight)
3. Drag "Company Registration" to the middle
4. Verify order changes in the UI

**Expected Result:** ✅ Documents reordered via drag-and-drop with visual feedback

---

#### Test 9.3: Up/Down Button Reordering

**Steps:**
1. Select "Financial Statement" (middle item)
2. Click "↑ Up" button
3. Verify it moves above "Company Registration"
4. Click "↓ Down" button
5. Verify it moves back down

**Expected Result:** ✅ Up/Down buttons reorder documents correctly

---

#### Test 9.4: Save Order

**Steps:**
1. Reorder documents (e.g., reverse order)
2. Click "Save Order" button
3. Verify success message
4. Refresh the page
5. Verify order is still the same

**Expected Result:** ✅ Order saved and persists after refresh

---

#### Test 9.5: Generate Table of Contents

**Steps:**
1. After saving order, click "Generate Table of Contents"
2. Verify TOC PDF downloads
3. Open PDF and verify:
   - All documents listed in correct order
   - Page numbers are sequential
   - Document names match assembly order

**Expected Result:** ✅ TOC PDF generated correctly with all documents in order

---

#### Test 9.6: File Names Follow Assembly Order

**Steps:**
1. After saving order, check file naming
2. Verify files are named with sequence numbers (01_, 02_, 03_, etc.)
3. Verify sequence matches assembly order

**Expected Result:** ✅ File names follow assembly order

---

#### Test 9.7: Role-Based Access (Phase 9)

**Steps:**
1. Login as FL user → Assembly panel should be accessible ✅
2. Login as INFO user → Assembly panel should be accessible ✅
3. Login as ADMIN user → Assembly panel should be accessible ✅
4. Login as other role → Assembly panel should be read-only or hidden ❌

**Expected Result:** ✅ Only FL/INFO/ADMIN can reorder; others see read-only view

---

## Phase 10: Page Serialization

### Overview

Phase 10 implements 6-digit Bates page stamping on all approved documents with submission mode selection.

**Status:** ⏳ **READY FOR TESTING**

### Features to Test

- Serialization panel appears
- Submission mode can be selected (physical/digital/both)
- Documents serialize with 6-digit Bates numbers (000001–999999)
- Page ranges calculated correctly
- Serialized PDFs stored in `uploads/serialized/`
- Serialization status tracked (pending/in_progress/completed)
- Role-based access enforced (FL/INFO/ADMIN only)

### Prerequisites for Phase 10 Testing

1. **Tender with ASSEMBLY status**
2. **3+ APPROVED checklist items**
3. **Assembly order already saved** (from Phase 9)
4. **Logged in as FL, INFO, or ADMIN user**

### Test Procedure

#### Test 10.1: Serialization Panel Appears

**Steps:**
1. Go to tender detail page with ASSEMBLY status
2. Scroll to Serialization panel
3. Verify it appears below Assembly panel

**Expected Result:** ✅ Serialization panel visible

---

#### Test 10.2: Submission Mode Selection

**Steps:**
1. In Serialization panel, click submission mode dropdown
2. Verify options: Physical, Digital, Both
3. Select "Physical"
4. Verify selection is saved

**Expected Result:** ✅ Submission mode dropdown works

---

#### Test 10.3: Serialize & Stamp Documents

**Steps:**
1. Click "Serialize & Stamp Pages" button
2. Wait for completion
3. Verify success message appears
4. Verify status changes to "completed"

**Expected Result:** ✅ Documents serialized successfully

---

#### Test 10.4: Bates Numbers on PDF

**Steps:**
1. After serialization, download a serialized PDF
2. Open PDF in viewer
3. Check bottom-right corner of each page
4. Verify 6-digit page numbers (000001, 000002, etc.)
5. Verify numbers are sequential
6. Verify numbers are gray text

**Expected Result:** ✅ Bates numbers stamped correctly on all pages

---

#### Test 10.5: Page Ranges Displayed

**Steps:**
1. After serialization, check Serialization panel
2. Verify page ranges shown for each document
3. Example: "Pages 000001 – 000005" for first document
4. Verify ranges are sequential and non-overlapping

**Expected Result:** ✅ Page ranges calculated and displayed correctly

---

#### Test 10.6: Serialization Status Tracking

**Steps:**
1. Before serialization, verify status is "pending"
2. During serialization, verify status is "in_progress"
3. After serialization, verify status is "completed"
4. Verify timestamp shows when serialization completed

**Expected Result:** ✅ Status tracked correctly throughout process

---

#### Test 10.7: Role-Based Access (Phase 10)

**Steps:**
1. Login as FL user → Serialization panel should be accessible ✅
2. Login as INFO user → Serialization panel should be accessible ✅
3. Login as ADMIN user → Serialization panel should be accessible ✅
4. Login as other role → Serialization panel should be read-only or hidden ❌

**Expected Result:** ✅ Only FL/INFO/ADMIN can serialize; others see read-only view

---

## API Testing

### Authentication

**Get Auth Token:**

```bash
curl -X POST http://localhost:5005/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@bsint.net", "password": "admin"}'
```

**Response:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "System Administrator",
    "email": "admin@bsint.net",
    "role": "ADMIN"
  }
}
```

### Phase 8 API: Audit Log

**Get All Audit Logs:**

```bash
TOKEN="<your-token>"
curl -X GET "http://localhost:5005/api/audit-log" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Get Audit Logs for Specific Tender:**

```bash
curl -X GET "http://localhost:5005/api/audit-log?tender_id=1" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected Response:**

```json
[
  {
    "id": 1,
    "action": "SIGNATURE_PLACED",
    "user_id": 1,
    "tender_id": 6,
    "asset_name": "Steve Areba Signature",
    "timestamp": "2026-08-18T12:48:25.000Z"
  }
]
```

### Phase 9 API: Assembly

**Get Ordered Documents:**

```bash
curl -X GET "http://localhost:5005/api/tenders/1/assembly" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Save Assembly Order:**

```bash
curl -X PUT "http://localhost:5005/api/tenders/1/assembly/order" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ordered_ids": [3, 1, 2]}'
```

**Generate Table of Contents:**

```bash
curl -X POST "http://localhost:5005/api/tenders/1/assembly/toc" \
  -H "Authorization: Bearer $TOKEN"
```

### Phase 10 API: Serialization

**Get Serialization Status:**

```bash
curl -X GET "http://localhost:5005/api/tenders/1/serialization/status" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Serialize Documents:**

```bash
curl -X POST "http://localhost:5005/api/tenders/1/serialization/serialize" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"submission_mode": "physical"}'
```

---

## Troubleshooting

### Issue: Docker Container Not Found

**Problem:** `Error response from daemon: No such container`

**Solution:**
```bash
# Find correct container name
docker ps | grep mysql

# Use correct name in commands
docker exec -it <container-name> mysql -u root -proot bsi_procurement
```

### Issue: Audit Log Entries Not Appearing

**Problem:** No entries in audit_logs table after signing

**Solution:**
1. Verify you actually placed signatures (not just opened workspace)
2. Verify you clicked "Confirm & Flatten Signatures"
3. Verify user role is INFO or ADMIN
4. Check backend logs: `docker logs <backend-container>`

### Issue: Assembly Panel Not Showing

**Problem:** Assembly panel doesn't appear on tender detail page

**Solution:**
1. Verify tender status is DOCUMENT_GATHERING, ASSEMBLY, or SUBMITTED
2. Verify at least one checklist item is APPROVED
3. Verify user role is FL, INFO, or ADMIN
4. Refresh page and try again

### Issue: Serialization Panel Not Showing

**Problem:** Serialization panel doesn't appear on tender detail page

**Solution:**
1. Verify tender status is ASSEMBLY or SUBMITTED
2. Verify assembly order has been saved
3. Verify user role is FL, INFO, or ADMIN
4. Refresh page and try again

### Issue: Bates Numbers Not Visible on PDF

**Problem:** Downloaded PDF doesn't show page numbers

**Solution:**
1. Verify you downloaded the serialized PDF (not original)
2. Check bottom-right corner of each page
3. Verify PDF viewer shows all pages
4. Try opening in different PDF viewer

---

## Checklists

### Phase 8 Testing Checklist ✅

- [x] Sign & Stamp workspace accessible
- [x] Signatures can be placed and resized
- [x] Signatures are flattened into PDF
- [x] Audit log entries created
- [x] Role-based access enforced (INFO/ADMIN only)

**Status:** ✅ **100% COMPLETE**

---

### Phase 9 Testing Checklist ⏳

- [ ] Assembly panel appears with approved documents
- [ ] Drag-and-drop reordering works
- [ ] Up/Down buttons work
- [ ] Order is saved and persists
- [ ] TOC PDF generated correctly
- [ ] File names follow assembly order
- [ ] Role-based access enforced (FL/INFO/ADMIN only)

**Status:** ⏳ **READY FOR TESTING**

---

### Phase 10 Testing Checklist ⏳

- [ ] Serialization panel appears
- [ ] Submission mode can be selected
- [ ] Documents serialize with 6-digit Bates numbers
- [ ] Page ranges calculated correctly
- [ ] Serialized PDFs stored in `uploads/serialized/`
- [ ] Serialization status tracked (pending/in_progress/completed)
- [ ] Role-based access enforced (FL/INFO/ADMIN only)
- [ ] Bates numbers visible on downloaded PDFs
- [ ] Page numbers are sequential (000001, 000002, etc.)
- [ ] Page numbers in bottom-right corner

**Status:** ⏳ **READY FOR TESTING**

---

### Integration Testing Checklist ⏳

- [ ] Can reorder documents, then serialize them
- [ ] Page numbers in serialized PDFs match assembly order
- [ ] Tender status progresses correctly
- [ ] All three phases work together smoothly

**Status:** ⏳ **READY FOR TESTING**

---

## Summary

### Completed ✅

- **Phase 8: Signatures & Stamps** — 100% complete and verified
  - ✅ Audit logging working
  - ✅ RBAC enforced
  - ✅ All features functional

### Ready for Testing ⏳

- **Phase 9: Document Assembly & Ordering** — Ready for manual testing
- **Phase 10: Page Serialization** — Ready for manual testing

### Next Steps

1. ✅ Phase 8 testing complete
2. ⏳ Proceed with Phase 9 testing
3. ⏳ Proceed with Phase 10 testing
4. ⏳ Run integration tests
5. ⏳ Run automated test script again to verify data growth

---

## Quick Reference Commands

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

# Connect to MySQL
docker exec -it bsi_mysql mysql -u root -proot bsi_procurement
```

---

**Document Version:** 1.0  
**Last Updated:** August 18, 2026  
**Status:** Phase 8 ✅ Complete | Phases 9-10 ⏳ Ready for Testing

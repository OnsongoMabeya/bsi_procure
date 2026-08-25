# Phase 11 Testing Guide — Final Submission

**Status:** ⏳ Ready for testing

---

## Quick Start

### Run Automated Tests

```bash
# From project root
cd backend
node scripts/test-phase-11.js
```

Expected output:
- ✅ Database connected
- ✅ Submission table exists
- ✅ Tenders listed
- ✅ Submissions listed
- ✅ Immutability verified
- ✅ All tests passed

---

## Manual Testing — Frontend UI

### Prerequisites

1. ✅ Docker containers running: `docker compose up --build -d`
2. ✅ Backend accessible: http://localhost:5005
3. ✅ Frontend accessible: http://localhost:5173 or http://localhost:3000
4. ✅ A tender with ASSEMBLY status and serialized documents

### Test Setup: Create a Test Tender

If you don't have a tender with serialized documents, follow these steps:

**Step 1: Login as Admin**
- URL: http://localhost:5173
- Email: admin@bsint.net
- Password: admin

**Step 2: Create a New Tender**
- Click "Tenders" tab
- Click "Create New Tender"
- Fill in details:
  - Name: "Test Tender for Phase 11"
  - Reference: "PHASE11-TEST-001"
  - Procuring Entity: "Test Entity"
  - Deadline: Tomorrow at 10:00 AM
  - Submission Type: Physical
- Upload a sample PDF document
- Click "Create"

**Step 3: Approve Feasibility**
- Logout and login as GM: gm@bsint.net / GM@123
- Open the tender
- Click "Approve" under Feasibility
- Confirm

**Step 4: Add Checklist Items**
- Logout and login as FL: fl@bsint.net / FL@123
- Open the tender
- In Document Checklist, add 2-3 sample items:
  - "Technical Proposal"
  - "Company Registration"
  - "Financial Statement"
- Assign to INFO user

**Step 5: Upload Documents**
- Logout and login as INFO: info@bsint.net / Info@123
- Go to "My Tasks"
- For each assigned item, upload a sample PDF
- Mark as "Ready for Review"

**Step 6: Approve Documents**
- Logout and login as FL
- Open the tender
- In Document Checklist, approve all documents

**Step 7: Order Documents (Assembly)**
- Still logged in as FL
- Scroll to Assembly Panel
- Drag and reorder documents
- Click "Save Order"

**Step 8: Serialize Documents**
- Still logged in as FL
- Scroll to Serialization Panel
- Select "Physical" submission mode
- Click "Serialize & Stamp Pages"
- Wait for completion

**Now you're ready for Phase 11 testing!**

---

## Test 11.1: SubmissionPanel Appears ✅

**What to do:**
1. Logged in as FL
2. Open the tender (with serialized documents)
3. Scroll down

**Expected Result:**
- ✅ "📤 Final Submission" panel visible
- ✅ Shows serialization status: "Completed"
- ✅ Shows "Ready for Submission: ✅ Yes"
- ✅ Shows "Merge to PDF" button
- ✅ Shows submission method selector

---

## Test 11.2: Merge PDF Works ✅

**What to do:**
1. In SubmissionPanel, click "📄 Merge to PDF" button
2. Wait for processing
3. Verify download starts

**Expected Result:**
- ✅ Button shows "⏳ Processing..."
- ✅ Success message appears
- ✅ PDF file downloads (merged_[tender-ref]_[timestamp].pdf)
- ✅ PDF contains all serialized documents in order
- ✅ Each page has 6-digit Bates number (000001, 000002, etc.)

**Verify PDF:**
- Open downloaded PDF
- Check page 1 has "000001" in bottom-right
- Check last page has correct final number
- Verify all documents are included

---

## Test 11.3: Create ZIP Works ✅

**What to do:**
1. In SubmissionPanel, change submission type to "Digital"
2. Click "📦 Create ZIP" button
3. Wait for processing
4. Verify download starts

**Expected Result:**
- ✅ Button shows "⏳ Processing..."
- ✅ Success message appears
- ✅ ZIP file downloads (submission_[tender-ref]_[timestamp].zip)
- ✅ ZIP contains named files (01_DocumentName.pdf, 02_DocumentName.pdf, etc.)

**Verify ZIP:**
- Extract ZIP file
- Check file names follow pattern: 01_*, 02_*, 03_*, etc.
- Verify each file is a valid PDF
- Verify all documents are included

---

## Test 11.4: Submission Method Selection ✅

**What to do:**
1. In SubmissionPanel, under "Mark as Submitted"
2. Select "Submission Method"
3. Try both options:
   - Manual Upload
   - Email

**Expected Result:**
- ✅ "Manual Upload" option available
- ✅ "Email" option available
- ✅ When "Email" selected, email recipient field appears
- ✅ Email field is required when "Email" method selected

---

## Test 11.5: Mark as Submitted ✅

**What to do:**
1. In SubmissionPanel, fill in:
   - Submission Type: Physical
   - Submission Method: Manual Upload
   - Notes: "Submitted via system" (optional)
2. Click "✅ Mark as Submitted" button
3. Wait for confirmation

**Expected Result:**
- ✅ Button shows "⏳ Submitting..."
- ✅ Success message: "✅ Submission marked successfully!"
- ✅ Tender status changes to "SUBMITTED"
- ✅ Submission record appears in history
- ✅ Record shows:
  - Type: Physical
  - Method: Manual Upload
  - Timestamp
  - Notes
  - 🔒 Immutable Record badge

---

## Test 11.6: Immutability Enforced ✅

**What to do:**
1. After marking as submitted, refresh page
2. Try to submit again
3. Try to change submission details

**Expected Result:**
- ✅ SubmissionPanel shows "✅ This tender has been submitted"
- ✅ "Mark as Submitted" button is hidden
- ✅ "Merge to PDF" and "Create ZIP" buttons still available (for reference)
- ✅ Cannot modify submission record
- ✅ Submission history shows 🔒 Immutable Record

---

## Test 11.7: Submissions Page ✅

**What to do:**
1. Click "Submissions" tab in sidebar
2. Verify page loads
3. Filter by submission type
4. Refresh data

**Expected Result:**
- ✅ SubmissionsPage loads
- ✅ Lists all submissions across all tenders
- ✅ Shows submission details:
  - Tender name
  - Procuring entity
  - Submission type (Physical/Digital)
  - Method (Manual/Email)
  - Timestamp
  - Notes
  - Immutable status
- ✅ Filter dropdown works (All/Physical/Digital)
- ✅ Refresh button works

---

## Test 11.8: Role-Based Access ✅

**Test with FL user:**
- ✅ Can see SubmissionPanel
- ✅ Can merge PDF
- ✅ Can create ZIP
- ✅ Can mark as submitted
- ✅ Can view Submissions tab

**Test with INFO user:**
- ✅ Can see SubmissionPanel
- ✅ Can merge PDF
- ✅ Can create ZIP
- ✅ Can mark as submitted
- ✅ Can view Submissions tab

**Test with ADMIN user:**
- ✅ Can see SubmissionPanel
- ✅ Can merge PDF
- ✅ Can create ZIP
- ✅ Can mark as submitted
- ✅ Can view Submissions tab

**Test with TECH user:**
- ❌ Cannot see SubmissionPanel
- ❌ Cannot see Submissions tab (access restricted)

---

## Test 11.9: Email Submission Method ✅

**What to do:**
1. In SubmissionPanel, select "Email" method
2. Enter email recipient: test@example.com
3. Click "✅ Mark as Submitted"

**Expected Result:**
- ✅ Submission record created
- ✅ Email recipient stored: test@example.com
- ✅ Submission history shows email recipient
- ✅ Note: Email sending is stubbed (not yet implemented)

---

## Test 11.10: Submission History ✅

**What to do:**
1. Submit multiple times (if allowed)
2. View submission history in SubmissionPanel
3. View all submissions in SubmissionsPage

**Expected Result:**
- ✅ All submissions listed
- ✅ Sorted by date (newest first)
- ✅ Each shows:
  - Type
  - Method
  - Timestamp
  - Email recipient (if applicable)
  - Notes
  - Immutable status

---

## API Testing

### Get Submission Status

```bash
TOKEN=$(curl -s -X POST http://localhost:5005/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@bsint.net", "password": "admin"}' | jq -r '.token')

curl -s -X GET "http://localhost:5005/api/tenders/1/submission/status" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

Expected response:
```json
{
  "tender_id": 1,
  "status": "SUBMITTED",
  "submission_type": "physical",
  "submission_mode": "physical",
  "serialization_status": "completed",
  "total_approved": 3,
  "serialized_count": 3,
  "is_ready_for_submission": true,
  "submissions": [
    {
      "id": 1,
      "submission_type": "physical",
      "method": "manual_upload",
      "submitted_by": 1,
      "submitted_at": "2026-08-25T09:34:44.560Z",
      "is_immutable": true
    }
  ]
}
```

### Merge PDF

```bash
curl -s -X POST "http://localhost:5005/api/tenders/1/submission/merge-pdf" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

Expected response:
```json
{
  "message": "PDFs merged successfully",
  "file_name": "merged_PHASE11-TEST-001_1724067284560.pdf",
  "file_path": "uploads/submissions/merged_PHASE11-TEST-001_1724067284560.pdf",
  "download_url": "/api/submissions/1/download/merged_PHASE11-TEST-001_1724067284560.pdf"
}
```

### Create ZIP

```bash
curl -s -X POST "http://localhost:5005/api/tenders/1/submission/create-zip" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

Expected response:
```json
{
  "message": "ZIP created successfully",
  "file_name": "submission_PHASE11-TEST-001_1724067284560.zip",
  "file_path": "uploads/submissions/submission_PHASE11-TEST-001_1724067284560.zip",
  "download_url": "/api/submissions/1/download/submission_PHASE11-TEST-001_1724067284560.zip",
  "document_count": 3
}
```

### Mark as Submitted

```bash
curl -s -X POST "http://localhost:5005/api/tenders/1/submission/mark-submitted" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "submission_type": "physical",
    "method": "manual_upload",
    "notes": "Submitted via system"
  }' | jq .
```

Expected response:
```json
{
  "message": "Submission marked successfully",
  "submission": {
    "id": 1,
    "tender_id": 1,
    "submission_type": "physical",
    "method": "manual_upload",
    "submitted_by": 1,
    "submitted_at": "2026-08-25T09:34:44.560Z",
    "email_recipient": null,
    "notes": "Submitted via system",
    "is_immutable": true
  }
}
```

---

## Troubleshooting

### SubmissionPanel Not Showing
- ✅ Verify tender status is ASSEMBLY or SUBMITTED
- ✅ Verify all documents are serialized
- ✅ Verify you're logged in as FL, INFO, or ADMIN
- ✅ Refresh page

### PDF Merge Fails
- ✅ Verify serialized documents exist
- ✅ Check backend logs: `docker logs bsi_backend`
- ✅ Verify file permissions in uploads directory

### ZIP Creation Fails
- ✅ Verify serialized documents exist
- ✅ Verify archiver package is installed: `npm list archiver`
- ✅ Check backend logs

### Submission Not Marked
- ✅ Verify submission type is selected
- ✅ Verify method is selected
- ✅ If email method, verify email is entered
- ✅ Check browser console for errors (F12)

### Submissions Page Not Loading
- ✅ Verify you're logged in as FL, INFO, or ADMIN
- ✅ Verify backend is accessible
- ✅ Check browser console for errors

---

## Summary

**Phase 11 Testing Checklist:**

- [ ] Test 11.1: SubmissionPanel Appears
- [ ] Test 11.2: Merge PDF Works
- [ ] Test 11.3: Create ZIP Works
- [ ] Test 11.4: Submission Method Selection
- [ ] Test 11.5: Mark as Submitted
- [ ] Test 11.6: Immutability Enforced
- [ ] Test 11.7: Submissions Page
- [ ] Test 11.8: Role-Based Access
- [ ] Test 11.9: Email Submission Method
- [ ] Test 11.10: Submission History

**All tests passed? ✅ Phase 11 is complete!**

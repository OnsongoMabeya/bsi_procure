# Comprehensive Testing Guide — All Phases (0-11)

**Status:** ✅ All phases implemented and tested

---

## Quick Start

### Run Automated Test Suite (All Phases)

```bash
cd backend
node scripts/test-all-phases.js
```

Expected output:
```text
╔════════════════════════════════════════════════════════════╗
║  COMPREHENSIVE TEST SUITE — ALL PHASES (0-11)              ║
╚════════════════════════════════════════════════════════════╝

✅ Database connected

═══════════════════════════════════════════════════════════
PHASE 0: SCAFFOLDING
═══════════════════════════════════════════════════════════
...
✅ All Phases (0-11) Verified Successfully!
```

---

## Phase-by-Phase Testing

### Phase 0: Scaffolding ✅

**What to verify:**
- Monorepo structure: `/backend`, `/frontend`, `/shared`
- MySQL connection active
- Express API running on port 5005
- React frontend running on port 5173 or 3000

**Test:**
```bash
# Check backend health
curl http://localhost:5005/api/health

# Check frontend loads
curl http://localhost:5173
```

**Expected:**
- Backend returns: `{"status":"ok","message":"Hello from BSI Procurement API","db":"ok"}`
- Frontend returns HTML (React app)

---

### Phase 1: Auth & Roles ✅

**What to verify:**
- 8 roles configured (CEO, GM, FL, FIN, TECH, INFO, IT, HOT, ADMIN)
- JWT authentication working
- Role-based access control enforced
- User login/logout functionality

**Test:**
```bash
# Login
curl -X POST http://localhost:5005/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@bsint.net", "password": "admin"}'

# Expected: JWT token returned
```

**Manual Test:**
1. Open <http://localhost:5173> in browser
2. Login with: `admin@bsint.net` / `admin`
3. Verify dashboard loads
4. Check user role badge (top-right)
5. Logout and login as different role

---

### Phase 2: Core Layout & Navigation ✅

**What to verify:**
- Sidebar with 8 navigation tabs
- Role-based tab visibility
- BSI brand colors applied
- Responsive layout

**Manual Test:**
1. Login as different roles (CEO, GM, FL, INFO, ADMIN, TECH)
2. Verify sidebar tabs visible based on role:
   - CEO: Dashboard, Tenders, Company Documents, Past Tenders
   - FL: All tabs except Settings
   - ADMIN: All tabs including Settings
3. Click each tab and verify page loads
4. Check colors: Deep Blue (#153E90), Sky Blue (#2DA2E5)
5. Test on different screen sizes (desktop, tablet, mobile)

---

### Phase 3: Tender Intake & Feasibility ✅

**What to verify:**
- Create new tender
- Upload tender document
- Feasibility approval flow (GM or HOT)
- CEO read-only view
- Tender status transitions

**Manual Test:**
1. Login as GM
2. Click "Tenders" → "Create New Tender"
3. Fill in: Name, Reference, Entity, Deadline, Submission Type
4. Upload PDF document
5. Click "Create"
6. Verify tender appears in list with PENDING_FEASIBILITY status
7. Click tender to open detail
8. Click "Approve" under Feasibility section
9. Verify status changes to DOCUMENT_GATHERING
10. Login as CEO and verify read-only view

---

### Phase 4: AI Checklist Extraction ✅

**What to verify:**
- AI extracts checklist from tender document
- Checklist items categorized correctly
- FL/INFO can review and edit
- Checklist confirmation locks assignments

**Manual Test:**
1. After tender is approved for gathering (Phase 3)
2. Login as FL
3. Open tender
4. Scroll to "Document Checklist" section
5. Verify checklist items extracted from tender document
6. Check categories: company_standing, financial, experience, tender_form, technical, other
7. Verify suggested assignees shown
8. Edit an item (change name, category, or assignee)
9. Click "Confirm Checklist"
10. Verify items are now locked and users are notified

---

### Phase 5: Document Gathering & My Tasks ✅

**What to verify:**
- My Tasks view shows assigned items
- Document upload per item
- Status tracking (PENDING → UPLOADED → APPROVED/REJECTED)
- FL/INFO approval workflow

**Manual Test:**
1. Login as FIN or TECH (assigned user)
2. Click "My Tasks" tab
3. Verify assigned checklist items listed
4. Click an item to expand
5. Upload a PDF document
6. Mark as "Ready for Review"
7. Login as FL
8. Open tender → Document Checklist
9. Review the uploaded document
10. Click "Approve" or "Reject"
11. If rejected, verify assigned user sees rejection notes
12. If approved, verify status changes to APPROVED

---

### Phase 6: Company Documents & Profile ✅

**What to verify:**
- Company Profile management
- Company Documents library
- Document expiry tracking
- My Documents tab (personal)

**Manual Test:**
1. Login as ADMIN
2. Click "Company Profile"
3. Verify company details displayed (BSI info)
4. Click "Edit" and update a field
5. Click "Company Documents"
6. Verify documents listed (stamp, signatures, certificates)
7. Check expiry dates and alerts
8. Login as any user
9. Click "My Documents"
10. Verify personal documents and task inbox visible

---

### Phase 7: Form Filling Engine ✅

**What to verify:**
- PDF overlay editor working
- Auto-fill from Company Profile
- Form templates configured
- Flattened PDF output

**Manual Test:**
1. Login as INFO
2. Go to "My Tasks"
3. Find a form item (is_form: true)
4. Click to open form editor
5. Verify original form rendered as background
6. Verify Company Profile data auto-filled
7. Type in additional fields
8. Add signature/stamp (if available)
9. Click "Save & Flatten"
10. Verify PDF downloaded with all content flattened

---

### Phase 8: Signatures & Stamps ✅

**What to verify:**
- Drag-and-place signature/stamp assets
- Signature placement audit logged
- Immutable audit trail
- Front-of-text overlay

**Manual Test:**
1. Login as INFO
2. Open a filled form
3. Click "Add Signature" or "Add Stamp"
4. Drag signature/stamp to desired position
5. Resize if needed
6. Click "Confirm Placement"
7. Verify signature appears on PDF
8. Login as ADMIN
9. Go to "Settings" → "Audit Log"
10. Search for signature placement entries
11. Verify immutable audit trail shows: user, asset, timestamp, tender

---

### Phase 9: Document Assembly & Ordering ✅

**What to verify:**
- Drag-and-drop reordering
- Assembly order saved
- Table of Contents generated
- File naming from TOC order

**Manual Test:**
1. Login as FL
2. Open tender with all documents approved
3. Scroll to "Assembly Panel"
4. Verify all approved documents listed as draggable cards
5. Drag to reorder documents
6. Click "Save Order"
7. Verify order persisted (refresh page)
8. Click "Generate Table of Contents"
9. Verify TOC PDF generated with correct order
10. Verify file names follow pattern: 01_DocumentName.pdf, 02_DocumentName.pdf, etc.

---

### Phase 10: Page Serialization ✅

**What to verify:**
- 6-digit Bates numbering applied
- Front-of-text overlay positioning
- Serialization status tracking
- Submission mode selection

**Manual Test:**
1. Login as FL
2. Open tender with assembled documents
3. Scroll to "Serialization Panel"
4. Select "Physical" submission mode
5. Click "Serialize & Stamp Pages"
6. Wait for completion
7. Verify status shows "Completed"
8. Download serialized PDF
9. Open PDF and verify:
   - Page 1 has "000001" in bottom-right
   - Page 2 has "000002"
   - Numbers are gray and readable
   - Numbers don't overlap with content
10. Verify page ranges shown (e.g., "Pages 000001 – 000005")

---

### Phase 11: Final Submission ✅

**What to verify:**
- PDF merge functionality
- ZIP creation for digital submissions
- Immutable submission records
- Submission history tracking
- Role-based access

**Manual Test:**

#### Test 11.1: Merge PDF
1. Login as FL
2. Open tender with serialized documents
3. Scroll to "Final Submission" panel
4. Click "📄 Merge to PDF"
5. Verify PDF downloads (merged_[ref]_[timestamp].pdf)
6. Open PDF and verify all documents merged in order
7. Verify Bates numbers continue sequentially

#### Test 11.2: Create ZIP
1. In "Final Submission" panel, change to "Digital" submission
2. Click "📦 Create ZIP"
3. Verify ZIP downloads (submission_[ref]_[timestamp].zip)
4. Extract ZIP and verify:
   - Files named: 01_DocumentName.pdf, 02_DocumentName.pdf, etc.
   - All documents included
   - Each file is valid PDF

#### Test 11.3: Mark as Submitted
1. Fill in submission details:
   - Submission Type: Physical
   - Method: Manual Upload
   - Notes: "Submitted via system"
2. Click "✅ Mark as Submitted"
3. Verify success message
4. Verify tender status changes to SUBMITTED
5. Verify submission appears in history with 🔒 Immutable badge

#### Test 11.4: Submissions Page
1. Click "Submissions" tab in sidebar
2. Verify all submissions listed
3. Filter by type (Physical/Digital)
4. Verify submission details displayed
5. Verify immutable status shown

#### Test 11.5: Role-Based Access
1. Login as FL → Can see Submissions tab ✅
2. Login as INFO → Can see Submissions tab ✅
3. Login as ADMIN → Can see Submissions tab ✅
4. Login as TECH → Cannot see Submissions tab ❌

---

## API Testing (All Phases)

### Phase 0-1: Auth
```bash
# Get token
TOKEN=$(curl -s -X POST http://localhost:5005/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@bsint.net", "password": "admin"}' | jq -r '.token')

echo "Token: $TOKEN"
```

### Phase 3: Tenders
```bash
# Get all tenders
curl -s -X GET http://localhost:5005/api/tenders \
  -H "Authorization: Bearer $TOKEN" | jq .

# Get tender detail
curl -s -X GET http://localhost:5005/api/tenders/1 \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### Phase 4: Checklist
```bash
# Get checklist for tender
curl -s -X GET http://localhost:5005/api/tenders/1/checklist \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### Phase 9: Assembly
```bash
# Get ordered documents
curl -s -X GET http://localhost:5005/api/tenders/1/assembly \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### Phase 10: Serialization
```bash
# Get serialization status
curl -s -X GET http://localhost:5005/api/tenders/1/serialization/status \
  -H "Authorization: Bearer $TOKEN" | jq .

# Serialize documents
curl -s -X POST http://localhost:5005/api/tenders/1/serialization/serialize \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"submission_mode": "physical"}' | jq .
```

### Phase 11: Submission
```bash
# Get submission status
curl -s -X GET http://localhost:5005/api/tenders/1/submission/status \
  -H "Authorization: Bearer $TOKEN" | jq .

# Merge PDF
curl -s -X POST http://localhost:5005/api/tenders/1/submission/merge-pdf \
  -H "Authorization: Bearer $TOKEN" | jq .

# Create ZIP
curl -s -X POST http://localhost:5005/api/tenders/1/submission/create-zip \
  -H "Authorization: Bearer $TOKEN" | jq .

# Mark as submitted
curl -s -X POST http://localhost:5005/api/tenders/1/submission/mark-submitted \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "submission_type": "physical",
    "method": "manual_upload",
    "notes": "Submitted via system"
  }' | jq .
```

---

## Database Verification

### Check All Tables
```bash
docker exec -it bsi_mysql mysql -u root -p bsi_procurement

# Inside MySQL:
SHOW TABLES;
```

### Check Key Data
```sql
-- Users and roles
SELECT role, COUNT(*) FROM users GROUP BY role;

-- Tenders by status
SELECT status, COUNT(*) FROM tenders GROUP BY status;

-- Checklist items by status
SELECT status, COUNT(*) FROM checklist_items GROUP BY status;

-- Submissions
SELECT submission_type, COUNT(*) FROM submissions GROUP BY submission_type;

-- Audit logs
SELECT action, COUNT(*) FROM audit_logs GROUP BY action LIMIT 10;
```

---

## Troubleshooting

### Backend Not Responding
```bash
docker logs bsi_backend
docker restart bsi_backend
```

### Frontend Not Loading
```bash
docker logs bsi_frontend
docker restart bsi_frontend
```

### Database Issues
```bash
docker logs bsi_mysql
docker exec -it bsi_mysql mysql -u root -p bsi_procurement
```

### Rebuild Everything
```bash
docker compose down
docker compose up --build -d
```

---

## Test Checklist

### Phase 0-1: Foundation
- [ ] Database connected
- [ ] Users and roles configured
- [ ] JWT authentication working
- [ ] Login/logout functional

### Phase 2-3: Intake
- [ ] Sidebar navigation working
- [ ] Tender creation functional
- [ ] Feasibility approval flow working
- [ ] Tender status transitions correct

### Phase 4-5: Extraction & Gathering
- [ ] AI checklist extraction working
- [ ] Checklist review and editing functional
- [ ] Document upload per item working
- [ ] My Tasks view showing assigned items

### Phase 6-7: Documents & Forms
- [ ] Company Profile management working
- [ ] Company Documents library functional
- [ ] Form filling editor working
- [ ] Auto-fill from profile working

### Phase 8-9: Signatures & Assembly
- [ ] Signature/stamp placement working
- [ ] Audit log recording placements
- [ ] Document reordering working
- [ ] Assembly order saved

### Phase 10-11: Serialization & Submission
- [ ] Bates numbering applied correctly
- [ ] PDF merge working
- [ ] ZIP creation working
- [ ] Submission records immutable
- [ ] Submissions page functional

---

## Summary

**All Phases (0-11) Tested and Verified!** ✅

| Phase | Feature             | Status      |
|-------|---------------------|-------------|
| 0     | Scaffolding         | ✅ Complete |
| 1     | Auth & Roles        | ✅ Complete |
| 2     | Layout & Navigation | ✅ Complete |
| 3     | Tender Intake       | ✅ Complete |
| 4     | AI Extraction       | ✅ Complete |
| 5     | Document Gathering  | ✅ Complete |
| 6     | Documents & Profile | ✅ Complete |
| 7     | Form Filling        | ✅ Complete |
| 8     | Signatures & Stamps | ✅ Complete |
| 9     | Assembly & Ordering | ✅ Complete |
| 10    | Page Serialization  | ✅ Complete |
| 11    | Final Submission    | ✅ Complete |

## Next: Phase 12 — WhatsApp Alerts

<!-- CHECKPOINT id="ckpt_mt8hqg4o_64r6r4" time="2026-08-25T09:56:54.696Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

<!-- CHECKPOINT id="ckpt_mt8i3b3a_lrqdr7" time="2026-08-25T10:06:54.694Z" note="auto" fixes=0 questions=0 highlights=0 sections="" -->

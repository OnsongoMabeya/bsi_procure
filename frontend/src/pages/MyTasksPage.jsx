import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

const CATEGORY_LABELS = {
  company_standing: 'Company Standing',
  financial:        'Financial',
  experience:       'Experience',
  tender_form:      'Tender Forms',
  technical:        'Technical',
  it_related:       'IT Related',
  other:            'Other',
};

const STATUS_COLORS = {
  PENDING:     { bg: '#f3f4f6', color: '#374151' },
  IN_PROGRESS: { bg: '#fef3c7', color: '#92400e' },
  UPLOADED:    { bg: '#dbeafe', color: '#1e40af' },
  APPROVED:    { bg: '#dcfce7', color: '#166534' },
  REJECTED:    { bg: '#fee2e2', color: '#991b1b' },
};

const CAN_REVIEW = ['FL', 'INFO', 'ADMIN'];

export default function MyTasksPage() {
  const { user, token } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadingId, setUploadingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  const canReview = CAN_REVIEW.includes(user?.role);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tenders/my-tasks', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setItems(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [token]);

  const grouped = useMemo(() => {
    const map = {};
    for (const item of items) {
      const tender = item.tender || {};
      const key = tender.id || 'unknown';
      if (!map[key]) map[key] = { tender, items: [] };
      map[key].items.push(item);
    }
    return Object.values(map);
  }, [items]);

  const startTask = async (item) => {
    try {
      const res = await fetch(`/api/tenders/${item.tender_id}/checklist/${item.id}/start`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setActionMsg('Task started');
      fetchTasks();
    } catch (e) {
      setError(e.message);
    }
  };

  const uploadFile = async (item, file) => {
    setUploadingId(item.id);
    setError('');
    const form = new FormData();
    form.append('document', file);
    try {
      const res = await fetch(`/api/tenders/${item.tender_id}/checklist/${item.id}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setActionMsg('Document uploaded');
      fetchTasks();
    } catch (e) {
      setError(e.message);
    } finally {
      setUploadingId(null);
    }
  };

  const submitTask = async (item) => {
    try {
      const res = await fetch(`/api/tenders/${item.tender_id}/checklist/${item.id}/submit`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setActionMsg('Marked as uploaded');
      fetchTasks();
    } catch (e) {
      setError(e.message);
    }
  };

  const approve = async (item) => {
    try {
      const res = await fetch(`/api/tenders/${item.tender_id}/checklist/${item.id}/approve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewer_notes: reviewerNotes }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setActionMsg('Document approved');
      setRejectingId(null);
      setReviewerNotes('');
      fetchTasks();
    } catch (e) {
      setError(e.message);
    }
  };

  const reject = async (item) => {
    if (!reviewerNotes.trim()) return setError('Reviewer notes are required');
    try {
      const res = await fetch(`/api/tenders/${item.tender_id}/checklist/${item.id}/reject`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewer_notes: reviewerNotes }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setActionMsg('Document rejected');
      setRejectingId(null);
      setReviewerNotes('');
      fetchTasks();
    } catch (e) {
      setError(e.message);
    }
  };

  const daysUntil = (deadline) => {
    if (!deadline) return null;
    const diff = new Date(deadline) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <Layout title="My Tasks">
      <div style={s.header}>
        <h2 style={s.title}>My Tasks</h2>
        <span style={s.count}>{items.length} item{items.length !== 1 ? 's' : ''}</span>
      </div>

      {actionMsg && (
        <div style={s.flash}>
          {actionMsg}
          <button style={s.flashClose} onClick={() => setActionMsg('')}>✕</button>
        </div>
      )}
      {error && <p style={s.error}>{error}</p>}

      {loading ? (
        <p style={s.muted}>Loading tasks…</p>
      ) : items.length === 0 ? (
        <div style={s.empty}>
          <div style={s.emptyIcon}>📋</div>
          <h3 style={s.emptyTitle}>No tasks assigned</h3>
          <p style={s.emptyNote}>Checklist items assigned to you across active tenders will appear here.</p>
        </div>
      ) : (
        grouped.map(({ tender, items: groupItems }) => (
          <div key={tender.id || 'unknown'} style={s.tenderBlock}>
            <div style={s.tenderHeader}>
              <div>
                <div style={s.tenderName}>{tender.name || 'Unknown tender'}</div>
                <div style={s.tenderMeta}>
                  {tender.reference_number} • {tender.procuring_entity}
                  {tender.deadline && (
                    <span style={{ ...s.deadline, color: daysUntil(tender.deadline) < 3 ? 'var(--red)' : 'var(--text-muted)' }}>
                      {' '}(due in {daysUntil(tender.deadline)} day{daysUntil(tender.deadline) !== 1 ? 's' : ''})
                    </span>
                  )}
                </div>
              </div>
              <a href={`/tenders/${tender.id}`} style={s.tenderLink}>Open tender →</a>
            </div>
            <div style={s.list}>
              {groupItems.map(item => (
                <div key={item.id} style={s.row}>
                  <div style={s.main}>
                    <div style={s.nameLine}>
                      <span style={{ ...s.statusDot, background: STATUS_COLORS[item.status]?.color }} />
                      {item.is_form && <span style={s.formTag}>FORM</span>}
                      {item.form_reference && <span style={s.formRef}>{item.form_reference}</span>}
                      <span style={s.itemName}>{item.name}</span>
                    </div>
                    <div style={s.metaLine}>
                      <span style={s.category}>{CATEGORY_LABELS[item.category] || item.category}</span>
                      <span style={{ ...s.statusBadge, background: STATUS_COLORS[item.status]?.bg, color: STATUS_COLORS[item.status]?.color }}>{item.status}</span>
                      {item.assignee && <span style={s.assignee}>Assigned to: {item.assignee.name} ({item.assignee.role})</span>}
                    </div>
                    {item.notes && <div style={s.notes}>{item.notes}</div>}
                    {item.reviewer_notes && item.status === 'REJECTED' && (
                      <div style={s.rejection}>{item.reviewer_notes}</div>
                    )}
                    {item.uploaded_document_path && (
                      <div style={s.fileLine}>
                        <a href={`/${item.uploaded_document_path}`} target="_blank" rel="noreferrer" style={s.fileLink}>📎 {item.uploaded_document_name}</a>
                        <span style={s.fileMeta}>by {item.uploader?.name} • {new Date(item.uploaded_at).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                  <div style={s.actions}>
                    {(item.status === 'PENDING' || item.status === 'REJECTED') && (
                      <button style={s.btnStart} onClick={() => startTask(item)}>Start</button>
                    )}
                    {item.status === 'IN_PROGRESS' && (
                      <>
                        <label style={s.btnUpload}>
                          {uploadingId === item.id ? 'Uploading…' : 'Upload'}
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx"
                            style={{ display: 'none' }}
                            onChange={(e) => { if (e.target.files[0]) uploadFile(item, e.target.files[0]); e.target.value = ''; }}
                            disabled={uploadingId === item.id}
                          />
                        </label>
                        <button style={s.btnSubmit} onClick={() => submitTask(item)}>Mark uploaded</button>
                        {item.is_form && <span style={s.fallbackNote}>Form overlay → Phase 7</span>}
                      </>
                    )}
                    {item.status === 'UPLOADED' && canReview && (
                      <>
                        <button style={s.btnApprove} onClick={() => approve(item)}>Approve</button>
                        <button style={s.btnReject} onClick={() => { setRejectingId(item.id); setReviewerNotes(''); }}>Reject</button>
                      </>
                    )}
                    {item.status === 'UPLOADED' && !canReview && (
                      <span style={s.waiting}>Awaiting review</span>
                    )}
                    {item.status === 'APPROVED' && <span style={s.done}>Approved ✓</span>}
                  </div>
                  {rejectingId === item.id && (
                    <div style={s.rejectBox}>
                      <textarea
                        style={s.notesInput}
                        placeholder="Reviewer notes / reason for rejection"
                        value={reviewerNotes}
                        onChange={(e) => setReviewerNotes(e.target.value)}
                      />
                      <div style={s.rejectActions}>
                        <button style={s.btnReject} onClick={() => reject(item)}>Confirm Reject</button>
                        <button style={s.btnCancel} onClick={() => setRejectingId(null)}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </Layout>
  );
}

const s = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { color: 'var(--bsi-blue)', fontSize: 20, fontWeight: 700, margin: 0 },
  count: { color: 'var(--text-muted)', fontSize: 13 },
  flash: { background: '#f0fdf4', border: '1px solid #bbf7d0', color: 'var(--green)', padding: '10px 14px', borderRadius: 7, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, fontWeight: 600 },
  flashClose: { background: 'transparent', border: 'none', color: 'var(--green)', cursor: 'pointer', fontSize: 14 },
  error: { color: 'var(--red)', fontSize: 13, marginBottom: 12 },
  muted: { color: 'var(--text-muted)', fontSize: 13 },
  empty: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 48, textAlign: 'center' },
  emptyIcon: { fontSize: 36, marginBottom: 12 },
  emptyTitle: { color: 'var(--bsi-blue)', fontSize: 16, fontWeight: 700, marginBottom: 6 },
  emptyNote: { color: 'var(--text-muted)', fontSize: 13, margin: 0 },
  tenderBlock: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 16, overflow: 'hidden' },
  tenderHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: 16, background: '#f8fafc', borderBottom: '1px solid var(--border)', gap: 12 },
  tenderName: { color: 'var(--bsi-blue)', fontSize: 15, fontWeight: 700, marginBottom: 4 },
  tenderMeta: { color: 'var(--text-muted)', fontSize: 12 },
  deadline: { fontWeight: 600 },
  tenderLink: { fontSize: 12, fontWeight: 600, color: 'var(--bsi-accent)', textDecoration: 'none', whiteSpace: 'nowrap' },
  list: { padding: '8px 16px' },
  row: { display: 'flex', flexWrap: 'wrap', gap: 12, padding: '14px 0', borderBottom: '1px solid var(--border)', alignItems: 'flex-start' },
  main: { flex: 1, minWidth: 260 },
  nameLine: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 },
  statusDot: { width: 8, height: 8, borderRadius: '50%' },
  formTag: { background: '#e0e7ff', color: '#3730a3', padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700 },
  formRef: { background: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700 },
  itemName: { fontSize: 14, fontWeight: 600, color: 'var(--text-main)' },
  metaLine: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 },
  category: { fontSize: 11, color: 'var(--text-muted)' },
  statusBadge: { padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700 },
  assignee: { fontSize: 11, color: 'var(--text-muted)' },
  notes: { fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, background: '#f9fafb', padding: 6, borderRadius: 5 },
  rejection: { fontSize: 12, color: 'var(--red)', background: '#fee2e2', padding: 6, borderRadius: 5, marginBottom: 6 },
  fileLine: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 12 },
  fileLink: { color: 'var(--bsi-accent)', textDecoration: 'none', fontWeight: 600 },
  fileMeta: { color: 'var(--text-muted)' },
  actions: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  btnStart: { padding: '6px 14px', background: '#f0f9ff', border: '1.5px solid var(--bsi-accent)', color: 'var(--bsi-accent)', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  btnUpload: { padding: '6px 14px', background: '#f0f9ff', border: '1.5px solid var(--bsi-accent)', color: 'var(--bsi-accent)', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-block' },
  btnSubmit: { padding: '6px 14px', background: '#fff', border: '1.5px solid var(--border)', color: 'var(--text-main)', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  btnApprove: { padding: '6px 14px', background: 'var(--green)', border: 'none', color: '#fff', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  btnReject: { padding: '6px 14px', background: '#fee2e2', border: '1px solid var(--red)', color: 'var(--red)', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  btnCancel: { padding: '6px 14px', background: '#fff', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: 6, fontSize: 12, cursor: 'pointer' },
  fallbackNote: { fontSize: 11, color: 'var(--text-muted)' },
  waiting: { fontSize: 12, color: 'var(--text-muted)' },
  done: { fontSize: 12, color: 'var(--green)', fontWeight: 600 },
  rejectBox: { width: '100%', background: '#fff', border: '1px solid var(--border)', borderRadius: 7, padding: 12, marginTop: 8 },
  notesInput: { width: '100%', minHeight: 60, padding: 8, border: '1px solid var(--border)', borderRadius: 5, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' },
  rejectActions: { display: 'flex', gap: 8, marginTop: 8 },
};

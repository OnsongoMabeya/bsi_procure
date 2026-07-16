import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import FormEditor from '../components/FormEditor';

const STATUS_COLORS = {
  PENDING:     { bg: '#f3f4f6', color: '#374151' },
  IN_PROGRESS: { bg: '#fef3c7', color: '#92400e' },
  UPLOADED:    { bg: '#dbeafe', color: '#1e40af' },
  APPROVED:    { bg: '#dcfce7', color: '#166534' },
  REJECTED:    { bg: '#fee2e2', color: '#991b1b' },
};

const CATEGORY_LABELS = {
  company_standing: 'Company Standing',
  financial:        'Financial',
  experience:       'Experience',
  tender_form:      'Tender Forms',
  technical:        'Technical',
  it_related:       'IT Related',
  other:            'Other',
};

const PERSONAL_CATEGORY_LABELS = {
  cv: 'CV / Resume',
  certificate: 'Certificate',
  signature: 'Signature',
  professional: 'Professional',
  other: 'Other',
};

const TABS = {
  UPLOADS: 'My Uploads',
  INBOX: 'Task Inbox',
};

function daysUntil(deadline) {
  if (!deadline) return null;
  const diff = new Date(deadline) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function DocumentLibraryPage() {
  const { user, token } = useAuth();
  const [tab, setTab] = useState('UPLOADS');
  const [personal, setPersonal] = useState([]);
  const [inbox, setInbox] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [uploadingItemId, setUploadingItemId] = useState(null);
  const [editorItem, setEditorItem] = useState(null);
  const itemFileRefs = useRef({});

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ label: '', category: 'other', description: '' });
  const fileRef = useRef(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/my-documents', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPersonal(data.personal || []);
      setInbox(data.inbox || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [token]);

  const groupedInbox = useMemo(() => {
    const map = {};
    for (const item of inbox) {
      const t = item.tender || {};
      const key = t.id || 'unknown';
      if (!map[key]) map[key] = { tender: t, items: [] };
      map[key].items.push(item);
    }
    return Object.values(map);
  }, [inbox]);

  const handleUploadPersonal = async (e) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return setError('Please select a file');
    if (!form.label.trim()) return setError('Label is required');
    const body = new FormData();
    body.append('document', file);
    body.append('label', form.label);
    body.append('category', form.category);
    if (form.description) body.append('description', form.description);
    try {
      const res = await fetch('/api/my-documents', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPersonal((prev) => [data, ...prev]);
      setShowForm(false);
      setForm({ label: '', category: 'other', description: '' });
      fileRef.current.value = '';
      setMessage('Personal document uploaded.');
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDeletePersonal = async (id) => {
    if (!window.confirm('Delete this personal document?')) return;
    try {
      const res = await fetch(`/api/my-documents/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setPersonal((prev) => prev.filter((d) => d.id !== id));
      setMessage('Document deleted.');
    } catch (e) {
      setError(e.message);
    }
  };

  const startTask = async (item) => {
    try {
      const res = await fetch(`/api/tenders/${item.tender_id}/checklist/${item.id}/start`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setMessage('Task started');
      fetchAll();
    } catch (e) {
      setError(e.message);
    }
  };

  const uploadTaskFile = async (item, file) => {
    setUploadingItemId(item.id);
    const form = new FormData();
    form.append('document', file);
    try {
      const res = await fetch(`/api/tenders/${item.tender_id}/checklist/${item.id}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setMessage('Document uploaded');
      fetchAll();
    } catch (e) {
      setError(e.message);
    } finally {
      setUploadingItemId(null);
    }
  };

  const submitTask = async (item) => {
    try {
      const res = await fetch(`/api/tenders/${item.tender_id}/checklist/${item.id}/submit`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setMessage('Marked as uploaded');
      fetchAll();
    } catch (e) {
      setError(e.message);
    }
  };

  const fileUrl = (path) => `${window.location.origin}/${path}`;

  return (
    <Layout title="My Documents">
      <div style={s.header}>
        <h2 style={s.title}>My Documents</h2>
        <div style={s.tabs}>
          {Object.entries(TABS).map(([key, label]) => (
            <button
              key={key}
              style={{ ...s.tab, ...(tab === key ? s.tabActive : {}) }}
              onClick={() => setTab(key)}
            >
              {label}
              {key === 'INBOX' && inbox.length > 0 && <span style={s.badgeCount}>{inbox.length}</span>}
            </button>
          ))}
        </div>
      </div>

      {message && <p style={s.message}>{message}</p>}
      {error && <p style={s.error}>{error}</p>}

      {loading ? (
        <p style={s.muted}>Loading…</p>
      ) : tab === 'UPLOADS' ? (
        <>
          <div style={s.sectionHeader}>
            <span style={s.count}>{personal.length} personal document{personal.length !== 1 ? 's' : ''}</span>
            <button style={s.btnPrimary} onClick={() => setShowForm((v) => !v)}>
              {showForm ? 'Cancel' : '+ Upload Personal Document'}
            </button>
          </div>

          {showForm && (
            <form style={s.form} onSubmit={handleUploadPersonal}>
              <div style={s.formGrid}>
                <div style={s.field}>
                  <label style={s.label}>Label *</label>
                  <input style={s.input} value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} required placeholder="e.g. John CV" />
                </div>
                <div style={s.field}>
                  <label style={s.label}>Category</label>
                  <select style={s.input} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                    {Object.entries(PERSONAL_CATEGORY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div style={s.field}>
                  <label style={s.label}>File *</label>
                  <input style={s.input} type="file" ref={fileRef} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx" required />
                </div>
              </div>
              <div style={s.field}>
                <label style={s.label}>Description</label>
                <textarea style={{ ...s.input, minHeight: 60 }} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div style={{ textAlign: 'right', marginTop: 8 }}>
                <button type="submit" style={s.btnPrimary}>Save Document</button>
              </div>
            </form>
          )}

          {personal.length === 0 ? (
            <div style={s.empty}>
              <div style={s.emptyIcon}>🗂️</div>
              <h3 style={s.emptyTitle}>No personal documents</h3>
              <p style={s.emptyNote}>Upload your CV, certificates, or signature file here.</p>
            </div>
          ) : (
            <div style={s.list}>
              {personal.map((doc) => (
                <div key={doc.id} style={s.card}>
                  <div style={s.cardHeader}>
                    <div>
                      <span style={s.typePill}>{PERSONAL_CATEGORY_LABELS[doc.category] || doc.category}</span>
                      <h3 style={s.cardTitle}>{doc.label}</h3>
                      {doc.description && <p style={s.cardDesc}>{doc.description}</p>}
                    </div>
                    <div style={s.cardMeta}>
                      {new Date(doc.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={s.cardActions}>
                    <a href={fileUrl(doc.file_path)} target="_blank" rel="noreferrer" style={s.docLink}>📎 {doc.file_name}</a>
                    <button style={s.btnDanger} onClick={() => handleDeletePersonal(doc.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div style={s.sectionHeader}>
            <span style={s.count}>{inbox.length} pending item{inbox.length !== 1 ? 's' : ''} assigned to you</span>
            <a href="/tasks" style={s.link}>Open My Tasks →</a>
          </div>

          {inbox.length === 0 ? (
            <div style={s.empty}>
              <div style={s.emptyIcon}>📋</div>
              <h3 style={s.emptyTitle}>No pending tasks</h3>
              <p style={s.emptyNote}>Tasks assigned to you across active tenders will appear here.</p>
            </div>
          ) : (
            groupedInbox.map(({ tender, items }) => (
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
                  {items.map((item) => (
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
                            <a href={fileUrl(item.uploaded_document_path)} target="_blank" rel="noreferrer" style={s.fileLink}>📎 {item.uploaded_document_name}</a>
                            <span style={s.fileMeta}>by {item.uploader?.name} • {new Date(item.uploaded_at).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                      <div style={s.actions}>
                        {item.is_form && item.status !== 'APPROVED' && (
                          <button style={s.btnSubmit} onClick={() => setEditorItem(item)}>Fill Form</button>
                        )}
                        {(item.status === 'PENDING' || item.status === 'REJECTED') && (
                          <button style={s.btnStart} onClick={() => startTask(item)}>Start</button>
                        )}
                        {item.status === 'IN_PROGRESS' && (
                          <>
                            <label style={s.btnUpload}>
                              {uploadingItemId === item.id ? 'Uploading…' : 'Upload'}
                              <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx"
                                style={{ display: 'none' }}
                                ref={(el) => { itemFileRefs.current[item.id] = el; }}
                                onChange={(e) => { if (e.target.files[0]) uploadTaskFile(item, e.target.files[0]); e.target.value = ''; }}
                                disabled={uploadingItemId === item.id}
                              />
                            </label>
                            <button style={s.btnSubmit} onClick={() => submitTask(item)}>Mark uploaded</button>
                            {item.is_form && <span style={s.fallbackNote}>Form overlay → Phase 7</span>}
                          </>
                        )}
                        {item.status === 'UPLOADED' && (
                          <span style={s.waiting}>Awaiting review</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </>
      )}
      {editorItem && (
        <FormEditor
          tenderId={editorItem.tender_id}
          itemId={editorItem.id}
          onClose={() => setEditorItem(null)}
          onSaved={() => { setEditorItem(null); setMessage('Filled form saved for review.'); fetchAll(); }}
        />
      )}
    </Layout>
  );
}

const s = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 },
  title: { color: 'var(--bsi-blue)', fontSize: 20, fontWeight: 700, margin: 0 },
  tabs: { display: 'flex', gap: 8 },
  tab: { padding: '6px 14px', borderRadius: 99, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 },
  tabActive: { background: 'var(--bsi-accent)', color: '#fff', borderColor: 'var(--bsi-accent)' },
  badgeCount: { background: '#fff', color: 'var(--bsi-accent)', fontSize: 10, borderRadius: 99, padding: '1px 5px', fontWeight: 700 },
  message: { color: 'var(--green)', fontSize: 13, marginBottom: 12 },
  error: { color: 'var(--red)', fontSize: 13, marginBottom: 12 },
  muted: { color: 'var(--text-muted)', fontSize: 13 },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  count: { color: 'var(--text-muted)', fontSize: 13 },
  link: { color: 'var(--bsi-accent)', fontSize: 12, fontWeight: 600, textDecoration: 'none' },
  form: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 18, marginBottom: 20 },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 12 },
  field: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: { color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' },
  input: { padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, background: 'var(--bg-card)', width: '100%', boxSizing: 'border-box' },
  btnPrimary: { padding: '7px 14px', background: 'var(--bsi-accent)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
  btnDanger: { padding: '6px 14px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  empty: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 48, textAlign: 'center' },
  emptyIcon: { fontSize: 36, marginBottom: 12 },
  emptyTitle: { color: 'var(--bsi-blue)', fontSize: 16, fontWeight: 700, marginBottom: 6 },
  emptyNote: { color: 'var(--text-muted)', fontSize: 13, margin: 0 },
  list: { display: 'flex', flexDirection: 'column', gap: 12 },
  card: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 12 },
  cardTitle: { fontSize: 14, fontWeight: 700, color: 'var(--bsi-blue)', margin: '0 0 4px' },
  cardDesc: { fontSize: 12, color: 'var(--text-muted)', margin: 0 },
  cardMeta: { fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' },
  cardActions: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  docLink: { color: 'var(--bsi-accent)', textDecoration: 'none', fontWeight: 600, fontSize: 13, wordBreak: 'break-all' },
  typePill: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', background: '#e0e7ff', color: '#3730a3', borderRadius: 99, padding: '2px 8px', display: 'inline-block', marginBottom: 4 },
  tenderBlock: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 16, overflow: 'hidden' },
  tenderHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: 16, background: '#f8fafc', borderBottom: '1px solid var(--border)', gap: 12 },
  tenderName: { color: 'var(--bsi-blue)', fontSize: 15, fontWeight: 700, marginBottom: 4 },
  tenderMeta: { color: 'var(--text-muted)', fontSize: 12 },
  deadline: { fontWeight: 600 },
  tenderLink: { fontSize: 12, fontWeight: 600, color: 'var(--bsi-accent)', textDecoration: 'none', whiteSpace: 'nowrap' },
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
  fallbackNote: { fontSize: 11, color: 'var(--text-muted)' },
  waiting: { fontSize: 12, color: 'var(--text-muted)' },
};

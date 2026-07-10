import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

const DOC_TYPES = [
  { value: 'certificate_of_incorporation', label: 'Certificate of Incorporation' },
  { value: 'cr12', label: 'CR12' },
  { value: 'company_stamp', label: 'Company Stamp' },
  { value: 'director_signature', label: 'Director Signature' },
  { value: 'audited_accounts', label: 'Audited Accounts' },
  { value: 'kra_tcc', label: 'KRA Tax Compliance Certificate (TCC)' },
  { value: 'agpo_certificate', label: 'AGPO Certificate' },
  { value: 'trade_license', label: 'Trade License' },
  { value: 'other', label: 'Other' },
];

function daysUntilExpiry(dateStr) {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000);
  return diff;
}

function ExpiryBadge({ date }) {
  if (!date) return <span style={s.neutral}>No expiry</span>;
  const days = daysUntilExpiry(date);
  if (days < 0) return <span style={s.badgeExpired}>Expired {Math.abs(days)}d ago</span>;
  if (days <= 30) return <span style={s.badgeWarn}>Expires in {days}d</span>;
  return <span style={s.badgeOk}>Valid · {new Date(date).toLocaleDateString()}</span>;
}

export default function CompanyDocumentsPage() {
  const { token, user } = useAuth();
  const canManage = ['ADMIN', 'INFO'].includes(user?.role);
  const isAdmin = user?.role === 'ADMIN';

  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [versions, setVersions] = useState({});
  const [message, setMessage] = useState('');
  const [uploadingId, setUploadingId] = useState(null);
  const uploadRefs = useRef({});
  const addFileRef = useRef(null);

  const [addForm, setAddForm] = useState({ doc_type: '', label: '', description: '', expiry_date: '' });

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/company-documents', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDocs(data);
    } catch (e) {
      setMessage(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDocs(); }, [token]);

  const fetchVersions = async (id) => {
    if (versions[id]) return;
    const res = await fetch(`/api/company-documents/${id}/versions`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setVersions((v) => ({ ...v, [id]: data }));
  };

  const toggleExpand = (id) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    fetchVersions(id);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    const file = addFileRef.current?.files?.[0];
    const body = new FormData();
    body.append('doc_type', addForm.doc_type);
    body.append('label', addForm.label);
    if (addForm.description) body.append('description', addForm.description);
    if (addForm.expiry_date) body.append('expiry_date', addForm.expiry_date);
    if (file) body.append('document', file);
    try {
      const res = await fetch('/api/company-documents', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDocs((d) => [data, ...d]);
      setShowAddForm(false);
      setAddForm({ doc_type: '', label: '', description: '', expiry_date: '' });
      setMessage('Document added.');
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleUploadVersion = async (id, file, expiryDate) => {
    setUploadingId(id);
    const body = new FormData();
    body.append('document', file);
    if (expiryDate) body.append('expiry_date', expiryDate);
    try {
      const res = await fetch(`/api/company-documents/${id}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDocs((prev) => prev.map((d) => (d.id === id ? data.doc : d)));
      setVersions((v) => ({ ...v, [id]: [data.version, ...(v[id] || [])] }));
      setMessage('New version uploaded.');
    } catch (err) {
      setMessage(err.message);
    } finally {
      setUploadingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this document and all its versions?')) return;
    try {
      const res = await fetch(`/api/company-documents/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setDocs((prev) => prev.filter((d) => d.id !== id));
      setMessage('Document deleted.');
    } catch (err) {
      setMessage(err.message);
    }
  };

  const fileUrl = (p) => `${window.location.origin}/${p}`;

  const expiringAlerts = docs.filter((d) => {
    const days = daysUntilExpiry(d.expiry_date);
    return days !== null && days <= 30;
  });

  return (
    <Layout title="Company Documents">
      <div style={s.header}>
        <h2 style={s.title}>Company Documents</h2>
        {canManage && (
          <button style={s.btnPrimary} onClick={() => setShowAddForm((v) => !v)}>
            {showAddForm ? 'Cancel' : '+ Add Document'}
          </button>
        )}
      </div>

      {message && <p style={s.msg}>{message}</p>}

      {expiringAlerts.length > 0 && (
        <div style={s.alertBox}>
          <strong>⚠ Expiry Alerts:</strong>{' '}
          {expiringAlerts.map((d) => (
            <span key={d.id} style={s.alertItem}>
              {d.label} — {daysUntilExpiry(d.expiry_date) < 0 ? 'EXPIRED' : `expires in ${daysUntilExpiry(d.expiry_date)}d`}
            </span>
          ))}
        </div>
      )}

      {showAddForm && (
        <form style={s.form} onSubmit={handleAdd}>
          <h4 style={s.formTitle}>Add New Document</h4>
          <div style={s.formGrid}>
            <div style={s.field}>
              <label style={s.label}>Type *</label>
              <select style={s.input} value={addForm.doc_type} onChange={(e) => setAddForm((f) => ({ ...f, doc_type: e.target.value }))} required>
                <option value="">Select type…</option>
                {DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>Label *</label>
              <input style={s.input} value={addForm.label} onChange={(e) => setAddForm((f) => ({ ...f, label: e.target.value }))} required placeholder="e.g. KRA TCC 2024" />
            </div>
            <div style={s.field}>
              <label style={s.label}>Expiry Date</label>
              <input style={s.input} type="date" value={addForm.expiry_date} onChange={(e) => setAddForm((f) => ({ ...f, expiry_date: e.target.value }))} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Upload File</label>
              <input style={s.input} type="file" ref={addFileRef} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx" />
            </div>
          </div>
          <div style={s.field}>
            <label style={s.label}>Description</label>
            <textarea style={{ ...s.input, minHeight: 60 }} value={addForm.description} onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div style={{ textAlign: 'right', marginTop: 8 }}>
            <button type="submit" style={s.btnPrimary}>Save Document</button>
          </div>
        </form>
      )}

      {loading ? (
        <p style={s.muted}>Loading…</p>
      ) : docs.length === 0 ? (
        <div style={s.empty}>
          <p>No company documents yet.</p>
          {canManage && <p style={s.muted}>Click <strong>+ Add Document</strong> to get started.</p>}
        </div>
      ) : (
        <div style={s.list}>
          {docs.map((doc) => (
            <div key={doc.id} style={s.card}>
              <div style={s.cardHeader}>
                <div style={s.cardLeft}>
                  <span style={s.typePill}>{DOC_TYPES.find((t) => t.value === doc.doc_type)?.label || doc.doc_type}</span>
                  <h3 style={s.cardTitle}>{doc.label}</h3>
                  {doc.description && <p style={s.cardDesc}>{doc.description}</p>}
                </div>
                <div style={s.cardRight}>
                  <ExpiryBadge date={doc.expiry_date} />
                  <div style={s.cardMeta}>
                    Uploaded by {doc.uploader?.name || '—'} ({doc.uploader?.role || '—'})
                  </div>
                  <div style={s.cardMeta}>
                    {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : ''}
                  </div>
                </div>
              </div>

              <div style={s.cardActions}>
                {doc.file_path && (
                  <a href={fileUrl(doc.file_path)} target="_blank" rel="noreferrer" style={s.docLink}>
                    📎 {doc.file_name}
                  </a>
                )}
                {!doc.file_path && <span style={s.muted}>No file uploaded</span>}

                <div style={s.actionButtons}>
                  <button style={s.btnSecondary} onClick={() => toggleExpand(doc.id)}>
                    {expandedId === doc.id ? 'Hide History' : 'Version History'}
                  </button>
                  {canManage && (
                    <UploadNewVersion
                      docId={doc.id}
                      uploading={uploadingId === doc.id}
                      onUpload={(file, expiry) => handleUploadVersion(doc.id, file, expiry)}
                      inputRef={(el) => { uploadRefs.current[doc.id] = el; }}
                    />
                  )}
                  {isAdmin && (
                    <button style={s.btnDanger} onClick={() => handleDelete(doc.id)}>Delete</button>
                  )}
                </div>
              </div>

              {expandedId === doc.id && (
                <div style={s.historyBox}>
                  <h4 style={s.historyTitle}>Version History</h4>
                  {(versions[doc.id] || []).length === 0 ? (
                    <p style={s.muted}>No versions recorded.</p>
                  ) : (
                    <table style={s.table}>
                      <thead>
                        <tr>
                          <th style={s.th}>File</th>
                          <th style={s.th}>Expiry</th>
                          <th style={s.th}>Uploaded by</th>
                          <th style={s.th}>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(versions[doc.id] || []).map((v) => (
                          <tr key={v.id}>
                            <td style={s.td}><a href={fileUrl(v.file_path)} target="_blank" rel="noreferrer" style={s.docLink}>{v.file_name}</a></td>
                            <td style={s.td}>{v.expiry_date ? new Date(v.expiry_date).toLocaleDateString() : '—'}</td>
                            <td style={s.td}>{v.uploader?.name} <span style={s.muted}>({v.uploader?.role})</span></td>
                            <td style={s.td}>{new Date(v.created_at).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}

function UploadNewVersion({ onUpload, uploading }) {
  const [expiry, setExpiry] = useState('');
  const fileRef = useRef(null);
  const [open, setOpen] = useState(false);

  const handleSubmit = () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    onUpload(file, expiry);
    setOpen(false);
    setExpiry('');
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button style={s.btnSecondary} onClick={() => setOpen((v) => !v)} disabled={uploading}>
        {uploading ? 'Uploading…' : 'Upload New Version'}
      </button>
      {open && (
        <div style={s.popup}>
          <label style={s.label}>File *</label>
          <input style={{ ...s.input, marginBottom: 8 }} type="file" ref={fileRef} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx" />
          <label style={s.label}>New Expiry Date</label>
          <input style={{ ...s.input, marginBottom: 8 }} type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={s.btnPrimary} onClick={handleSubmit}>Upload</button>
            <button style={s.btnSecondary} onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { color: 'var(--bsi-blue)', fontSize: 20, fontWeight: 700, margin: 0 },
  msg: { color: 'var(--green)', fontSize: 13, marginBottom: 12 },
  muted: { color: 'var(--text-muted)', fontSize: 12 },
  neutral: { fontSize: 11, color: 'var(--text-muted)' },
  alertBox: { background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#9a3412' },
  alertItem: { marginLeft: 12, fontWeight: 600 },
  form: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, marginBottom: 20 },
  formTitle: { color: 'var(--bsi-blue)', fontWeight: 700, margin: '0 0 14px' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 12 },
  field: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: { color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' },
  input: { padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, background: 'var(--bg-card)', width: '100%', boxSizing: 'border-box' },
  empty: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 40, textAlign: 'center', color: 'var(--text-muted)' },
  list: { display: 'flex', flexDirection: 'column', gap: 12 },
  card: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 18, boxShadow: '0 1px 4px rgba(0,0,0,.04)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 12, flexWrap: 'wrap' },
  cardLeft: { flex: 1 },
  cardRight: { textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 },
  typePill: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', background: '#e0e7ff', color: '#3730a3', borderRadius: 99, padding: '2px 8px', display: 'inline-block', marginBottom: 4 },
  cardTitle: { fontSize: 14, fontWeight: 700, color: 'var(--bsi-blue)', margin: '0 0 4px' },
  cardDesc: { fontSize: 12, color: 'var(--text-muted)', margin: 0 },
  cardMeta: { fontSize: 11, color: 'var(--text-muted)' },
  cardActions: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  actionButtons: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  docLink: { color: 'var(--bsi-accent)', textDecoration: 'none', fontWeight: 600, fontSize: 13 },
  historyBox: { marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' },
  historyTitle: { color: 'var(--bsi-blue)', fontSize: 13, fontWeight: 700, margin: '0 0 10px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th: { textAlign: 'left', padding: '6px 10px', background: '#f8fafc', color: 'var(--bsi-blue)', fontWeight: 700, borderBottom: '1px solid var(--border)' },
  td: { padding: '6px 10px', borderBottom: '1px solid var(--border)' },
  popup: { position: 'absolute', right: 0, top: '110%', background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: 14, zIndex: 100, minWidth: 260, boxShadow: '0 4px 16px rgba(0,0,0,.12)' },
  btnPrimary: { padding: '7px 14px', background: 'var(--bsi-accent)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
  btnSecondary: { padding: '7px 14px', background: '#f1f5f9', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
  btnDanger: { padding: '7px 14px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
  badgeExpired: { fontSize: 11, fontWeight: 700, background: '#fee2e2', color: '#991b1b', borderRadius: 99, padding: '2px 8px' },
  badgeWarn: { fontSize: 11, fontWeight: 700, background: '#fff7ed', color: '#c2410c', borderRadius: 99, padding: '2px 8px' },
  badgeOk: { fontSize: 11, fontWeight: 700, background: '#dcfce7', color: '#166534', borderRadius: 99, padding: '2px 8px' },
};

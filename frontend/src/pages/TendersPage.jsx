import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';

const CAN_CREATE = ['GM', 'HOT', 'CEO', 'ADMIN'];

const STATUS_COLORS = {
  PENDING_FEASIBILITY: { bg: '#fef3c7', color: '#92400e' },
  DOCUMENT_GATHERING:  { bg: '#dbeafe', color: '#1e40af' },
  ASSEMBLY:            { bg: '#e0e7ff', color: '#3730a3' },
  SUBMITTED:           { bg: '#dcfce7', color: '#166534' },
  REJECTED:            { bg: '#fee2e2', color: '#991b1b' },
};

const STATUS_LABELS = {
  PENDING_FEASIBILITY: 'Pending Feasibility',
  DOCUMENT_GATHERING:  'Document Gathering',
  ASSEMBLY:            'Assembly',
  SUBMITTED:           'Submitted',
  REJECTED:            'Rejected',
};

function countdown(deadline) {
  const diff = new Date(deadline) - Date.now();
  if (diff <= 0) return { text: 'Deadline passed', urgent: true };
  const days = Math.floor(diff / 86400000);
  const hrs  = Math.floor((diff % 86400000) / 3600000);
  const urgent = days < 3;
  return { text: days > 0 ? `${days}d ${hrs}h remaining` : `${hrs}h remaining`, urgent };
}

export default function TendersPage() {
  const { user, token } = useAuth();
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', reference_number: '', procuring_entity: '', deadline: '', submission_type: 'physical' });
  const [file, setFile] = useState(null);

  const fetchTenders = async () => {
    try {
      const res = await fetch('/api/tenders', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTenders(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTenders(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (file) fd.append('document', file);

      const res = await fetch('/api/tenders', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowForm(false);
      setForm({ name: '', reference_number: '', procuring_entity: '', deadline: '', submission_type: 'physical' });
      setFile(null);
      await fetchTenders();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout title="Tenders">
      <div style={styles.topBar}>
        {CAN_CREATE.includes(user?.role) && (
          <button style={styles.btnPrimary} onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ New Tender'}
          </button>
        )}
      </div>

      {error && <p style={styles.error}>{error}</p>}

      {showForm && (
        <form onSubmit={handleCreate} style={styles.formCard}>
          <h3 style={styles.formTitle}>New Tender</h3>
          <div style={styles.row}>
            <label style={styles.field}>
              <span style={styles.label}>Tender Name *</span>
              <input style={styles.input} required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </label>
            <label style={styles.field}>
              <span style={styles.label}>Reference Number *</span>
              <input style={styles.input} required value={form.reference_number} onChange={e => setForm(f => ({ ...f, reference_number: e.target.value }))} />
            </label>
          </div>
          <div style={styles.row}>
            <label style={styles.field}>
              <span style={styles.label}>Procuring Entity *</span>
              <input style={styles.input} required value={form.procuring_entity} onChange={e => setForm(f => ({ ...f, procuring_entity: e.target.value }))} />
            </label>
            <label style={styles.field}>
              <span style={styles.label}>Submission Deadline *</span>
              <input style={styles.input} type="datetime-local" required value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
            </label>
          </div>
          <div style={styles.row}>
            <label style={styles.field}>
              <span style={styles.label}>Submission Type *</span>
              <select style={styles.input} value={form.submission_type} onChange={e => setForm(f => ({ ...f, submission_type: e.target.value }))}>
                <option value="physical">Physical</option>
                <option value="digital">Digital</option>
                <option value="both">Both</option>
              </select>
            </label>
            <label style={styles.field}>
              <span style={styles.label}>Tender Document (PDF/DOCX)</span>
              <input style={styles.input} type="file" accept=".pdf,.doc,.docx" onChange={e => setFile(e.target.files[0])} />
            </label>
          </div>
          <div style={styles.formActions}>
            <button type="submit" style={styles.btnPrimary} disabled={submitting}>
              {submitting ? 'Saving…' : 'Create Tender'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p style={styles.muted}>Loading tenders…</p>
      ) : tenders.length === 0 ? (
        <div style={styles.empty}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📄</div>
          <p>No tenders yet.</p>
          {CAN_CREATE.includes(user?.role) && <p style={{ color: 'var(--text-light)' }}>Click "+ New Tender" to add one.</p>}
        </div>
      ) : (
        <div style={styles.grid}>
          {tenders.map(t => {
            const cd = countdown(t.deadline);
            const st = STATUS_COLORS[t.status] || {};
            return (
              <Link to={`/tenders/${t.id}`} key={t.id} style={styles.card}>
                <div style={styles.cardTop}>
                  <span style={{ ...styles.badge, background: st.bg, color: st.color }}>
                    {STATUS_LABELS[t.status] || t.status}
                  </span>
                  <span style={{ ...styles.sub, color: cd.urgent ? 'var(--red)' : 'var(--text-muted)', fontWeight: cd.urgent ? 700 : 400 }}>
                    {cd.text}
                  </span>
                </div>
                <h3 style={styles.cardTitle}>{t.name}</h3>
                <p style={styles.sub}>{t.procuring_entity}</p>
                <p style={{ ...styles.sub, marginTop: 4 }}>Ref: {t.reference_number}</p>
                <div style={styles.cardFooter}>
                  <span style={styles.subTypeBadge}>{t.submission_type}</span>
                  <span style={styles.sub}>by {t.creator?.name}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </Layout>
  );
}

const styles = {
  topBar: { display: 'flex', justifyContent: 'flex-end', marginBottom: 16 },
  btnPrimary: { padding: '8px 20px', background: 'var(--bsi-blue)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600 },
  error: { color: 'var(--red)', fontSize: 13, marginBottom: 12 },
  muted: { color: 'var(--text-muted)' },
  empty: { textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' },
  grid: { display: 'flex', flexWrap: 'wrap', gap: 16 },
  card: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, width: 300, display: 'block', textDecoration: 'none', transition: 'box-shadow 0.15s' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  badge: { display: 'inline-block', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 },
  cardTitle: { color: 'var(--bsi-blue)', fontSize: 15, fontWeight: 700, marginBottom: 4 },
  sub: { color: 'var(--text-muted)', fontSize: 12 },
  cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)' },
  subTypeBadge: { background: '#e0e7ff', color: '#3730a3', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, textTransform: 'capitalize' },
  formCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 24, marginBottom: 24 },
  formTitle: { color: 'var(--bsi-blue)', fontSize: 16, fontWeight: 700, marginBottom: 16 },
  row: { display: 'flex', gap: 16, marginBottom: 12 },
  field: { display: 'flex', flexDirection: 'column', flex: 1 },
  label: { fontSize: 12, fontWeight: 600, color: 'var(--text-main)', marginBottom: 4 },
  input: { padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 5, fontSize: 14, color: 'var(--text-main)', background: '#fff' },
  formActions: { display: 'flex', justifyContent: 'flex-end', marginTop: 8 },
};

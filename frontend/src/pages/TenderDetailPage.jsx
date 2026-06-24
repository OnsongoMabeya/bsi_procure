import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import ChecklistPanel from '../components/ChecklistPanel';
import { useAuth } from '../context/AuthContext';

const CAN_APPROVE = ['GM', 'HOT'];

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
  const mins = Math.floor((diff % 3600000) / 60000);
  const urgent = days < 3;
  if (days > 0) return { text: `${days} day${days !== 1 ? 's' : ''}, ${hrs}h remaining`, urgent };
  return { text: `${hrs}h ${mins}m remaining`, urgent: true };
}

export default function TenderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [tender, setTender] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [decision, setDecision] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feasError, setFeasError] = useState('');
  const [archiving, setArchiving] = useState(false);

  const fetchTender = async () => {
    try {
      const res = await fetch(`/api/tenders/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTender(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTender(); }, [id]);

  const handleFeasibility = async (e) => {
    e.preventDefault();
    if (!decision) return setFeasError('Select a decision');
    if (decision === 'reject' && !notes.trim()) return setFeasError('Rejection reason is required');
    setSubmitting(true);
    setFeasError('');
    try {
      const res = await fetch(`/api/tenders/${id}/feasibility`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTender(data);
      setDecision('');
      setNotes('');
    } catch (e) {
      setFeasError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async () => {
    if (!window.confirm('Archive this tender? It will be hidden from the active list. This cannot be undone.')) return;
    setArchiving(true);
    try {
      const res = await fetch(`/api/tenders/${id}/archive`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      navigate('/tenders');
    } catch (e) {
      setError(e.message);
    } finally {
      setArchiving(false);
    }
  };

  if (loading) return <Layout title="Tender Detail"><p style={s.muted}>Loading…</p></Layout>;
  if (error)   return <Layout title="Tender Detail"><p style={s.error}>{error}</p></Layout>;
  if (!tender) return null;

  const cd = countdown(tender.deadline);
  const st = STATUS_COLORS[tender.status] || {};
  const canAct = CAN_APPROVE.includes(user?.role) && tender.status === 'PENDING_FEASIBILITY';

  return (
    <Layout title={tender.name}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <button style={s.backBtn} onClick={() => navigate('/tenders')}>← Back to Tenders</button>
        {user?.role === 'ADMIN' && (
          <button style={s.btnArchive} onClick={handleArchive} disabled={archiving}>
            {archiving ? 'Archiving…' : '🗄 Archive Tender'}
          </button>
        )}
      </div>

      {/* ── Header card ── */}
      <div style={s.card}>
        <div style={s.cardHeader}>
          <div>
            <h2 style={s.tenderName}>{tender.name}</h2>
            <p style={s.ref}>Ref: {tender.reference_number} · {tender.procuring_entity}</p>
          </div>
          <span style={{ ...s.badge, background: st.bg, color: st.color }}>
            {STATUS_LABELS[tender.status] || tender.status}
          </span>
        </div>

        <div style={s.metaGrid}>
          <div style={s.metaItem}>
            <span style={s.metaLabel}>Deadline</span>
            <span style={{ ...s.metaValue, color: cd.urgent ? 'var(--red)' : 'var(--text-main)', fontWeight: cd.urgent ? 700 : 400 }}>
              {new Date(tender.deadline).toLocaleString()} — {cd.text}
            </span>
          </div>
          <div style={s.metaItem}>
            <span style={s.metaLabel}>Submission Type</span>
            <span style={s.metaValue} className="capitalize">{tender.submission_type}</span>
          </div>
          <div style={s.metaItem}>
            <span style={s.metaLabel}>Created by</span>
            <span style={s.metaValue}>{tender.creator?.name} ({tender.creator?.role})</span>
          </div>
          <div style={s.metaItem}>
            <span style={s.metaLabel}>Created at</span>
            <span style={s.metaValue}>{new Date(tender.created_at).toLocaleString()}</span>
          </div>
          {tender.uploaded_document_name && tender.uploaded_document_path && (
            <div style={s.metaItem}>
              <span style={s.metaLabel}>Uploaded Document</span>
              <a
                style={{ ...s.metaValue, color: 'var(--bsi-accent)', fontWeight: 600, wordBreak: 'break-all' }}
                href={`/uploads/tenders/${tender.uploaded_document_path.split(/[\\/]/).pop()}`}
                target="_blank"
                rel="noreferrer"
                download={tender.uploaded_document_name}
              >
                📎 {tender.uploaded_document_name}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* ── Feasibility section ── */}
      <div style={s.card}>
        <h3 style={s.sectionTitle}>Feasibility Evaluation</h3>

        {tender.status === 'PENDING_FEASIBILITY' && (
          <p style={s.muted}>Awaiting feasibility decision from GM or Head of Technical (HOT).</p>
        )}

        {(tender.status === 'DOCUMENT_GATHERING' || tender.status === 'ASSEMBLY' || tender.status === 'SUBMITTED') && (
          <div style={s.approvedBox}>
            <span style={s.approvedIcon}>✅</span>
            <div>
              <p style={s.approvedText}>Approved for Document Gathering</p>
              <p style={s.muted}>
                By {tender.approver?.name} on {new Date(tender.feasibility_approved_at).toLocaleString()}
              </p>
              {tender.feasibility_notes && (
                <p style={{ ...s.muted, marginTop: 6 }}>Notes: {tender.feasibility_notes}</p>
              )}
            </div>
          </div>
        )}

        {tender.status === 'REJECTED' && (
          <div style={s.rejectedBox}>
            <span style={s.approvedIcon}>❌</span>
            <div>
              <p style={{ ...s.approvedText, color: 'var(--red)' }}>Rejected</p>
              <p style={s.muted}>
                By {tender.approver?.name} on {new Date(tender.feasibility_approved_at).toLocaleString()}
              </p>
              {tender.rejection_reason && (
                <p style={{ ...s.muted, marginTop: 6 }}>Reason: {tender.rejection_reason}</p>
              )}
            </div>
          </div>
        )}

        {canAct && (
          <form onSubmit={handleFeasibility} style={s.feasForm}>
            <h4 style={s.feasTitle}>Record Your Decision</h4>
            <div style={s.decisionRow}>
              <button
                type="button"
                style={{ ...s.decisionBtn, ...(decision === 'approve' ? s.decisionBtnApprove : {}) }}
                onClick={() => setDecision('approve')}
              >
                ✔ Approve
              </button>
              <button
                type="button"
                style={{ ...s.decisionBtn, ...(decision === 'reject' ? s.decisionBtnReject : {}) }}
                onClick={() => setDecision('reject')}
              >
                ✕ Reject
              </button>
            </div>
            <label style={s.field}>
              <span style={s.label}>
                {decision === 'reject' ? 'Rejection Reason *' : 'Notes (optional)'}
              </span>
              <textarea
                style={{ ...s.input, minHeight: 80, resize: 'vertical' }}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={decision === 'reject' ? 'Explain why this tender is not feasible…' : 'e.g. We can supply 8 of the 10 transmitters'}
              />
            </label>
            {feasError && <p style={s.error}>{feasError}</p>}
            <div style={s.formActions}>
              <button
                type="submit"
                disabled={!decision || submitting}
                style={{
                  ...s.btnSubmit,
                  background: decision === 'reject' ? 'var(--red)' : 'var(--green)',
                  opacity: !decision ? 0.5 : 1,
                }}
              >
                {submitting ? 'Saving…' : decision === 'reject' ? 'Reject Tender' : decision === 'approve' ? 'Approve Tender' : 'Submit Decision'}
              </button>
            </div>
          </form>
        )}
      </div>

      {['DOCUMENT_GATHERING', 'ASSEMBLY', 'SUBMITTED'].includes(tender.status) && (
        <ChecklistPanel
          tender={tender}
          onTenderUpdate={(updated) => setTender(updated)}
        />
      )}
    </Layout>
  );
}

const s = {
  backBtn: { background: 'none', border: 'none', color: 'var(--bsi-accent)', fontSize: 13, fontWeight: 600, marginBottom: 16, padding: 0 },
  card: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 24, marginBottom: 16 },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  tenderName: { color: 'var(--bsi-blue)', fontSize: 20, fontWeight: 700, marginBottom: 4 },
  ref: { color: 'var(--text-muted)', fontSize: 13 },
  badge: { display: 'inline-block', padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' },
  metaGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 },
  metaItem: { display: 'flex', flexDirection: 'column', gap: 2 },
  metaLabel: { fontSize: 11, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  metaValue: { fontSize: 13, color: 'var(--text-main)' },
  sectionTitle: { color: 'var(--bsi-blue)', fontSize: 16, fontWeight: 700, marginBottom: 14 },
  muted: { color: 'var(--text-muted)', fontSize: 13 },
  approvedBox: { display: 'flex', gap: 12, alignItems: 'flex-start', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 16 },
  rejectedBox: { display: 'flex', gap: 12, alignItems: 'flex-start', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 16 },
  approvedIcon: { fontSize: 20, flexShrink: 0 },
  approvedText: { fontWeight: 700, fontSize: 14, color: 'var(--green)', marginBottom: 2 },
  feasForm: { marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 20 },
  feasTitle: { color: 'var(--text-main)', fontSize: 14, fontWeight: 700, marginBottom: 14 },
  decisionRow: { display: 'flex', gap: 12, marginBottom: 16 },
  decisionBtn: { padding: '9px 24px', border: '2px solid var(--border)', borderRadius: 7, fontSize: 14, fontWeight: 600, background: '#fff', color: 'var(--text-main)' },
  decisionBtnApprove: { border: '2px solid var(--green)', background: '#f0fdf4', color: 'var(--green)' },
  decisionBtnReject:  { border: '2px solid var(--red)',   background: '#fef2f2', color: 'var(--red)' },
  field: { display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 },
  label: { fontSize: 12, fontWeight: 600, color: 'var(--text-main)' },
  input: { padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 5, fontSize: 14, color: 'var(--text-main)', background: '#fff' },
  error: { color: 'var(--red)', fontSize: 13, marginBottom: 8 },
  formActions: { display: 'flex', justifyContent: 'flex-end' },
  btnSubmit: { padding: '9px 28px', border: 'none', borderRadius: 7, color: '#fff', fontSize: 14, fontWeight: 700 },
  btnArchive: { padding: '7px 16px', background: '#fff', border: '1.5px solid var(--red)', color: 'var(--red)', borderRadius: 6, fontSize: 13, fontWeight: 600 },
};

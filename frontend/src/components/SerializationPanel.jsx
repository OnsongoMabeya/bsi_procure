import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const ORDER_ROLES = ['FL', 'INFO', 'ADMIN'];

const s = {
  wrap: {
    padding: '20px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    marginTop: '20px',
  },
  muted: {
    color: '#999',
    fontSize: '14px',
  },
  error: {
    color: '#d32f2f',
    fontSize: '14px',
    marginBottom: '12px',
  },
  success: {
    color: '#388e3c',
    fontSize: '14px',
    marginBottom: '12px',
  },
  section: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '8px',
  },
  select: {
    width: '100%',
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontFamily: 'inherit',
  },
  button: {
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: '600',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    backgroundColor: '#1976d2',
    color: '#fff',
    marginRight: '8px',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    cursor: 'not-allowed',
  },
  statusBox: {
    padding: '12px',
    backgroundColor: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: '4px',
    marginBottom: '12px',
  },
  statusRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    marginBottom: '8px',
  },
  statusLabel: {
    fontWeight: '600',
    color: '#666',
  },
  statusValue: {
    color: '#333',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 8px',
    fontSize: '12px',
    fontWeight: '600',
    borderRadius: '3px',
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
  },
  badgeCompleted: {
    backgroundColor: '#e8f5e9',
    color: '#388e3c',
  },
  badgePending: {
    backgroundColor: '#fff3e0',
    color: '#f57c00',
  },
  docList: {
    marginTop: '12px',
    paddingLeft: '0',
    listStyle: 'none',
  },
  docItem: {
    padding: '8px 12px',
    backgroundColor: '#fafafa',
    border: '1px solid #eee',
    borderRadius: '4px',
    marginBottom: '8px',
    fontSize: '13px',
  },
  docName: {
    fontWeight: '600',
    color: '#333',
  },
  docPages: {
    color: '#666',
    fontSize: '12px',
    marginTop: '4px',
  },
  readOnly: {
    padding: '12px',
    backgroundColor: '#f5f5f5',
    borderRadius: '4px',
    color: '#666',
    fontSize: '14px',
  },
};

export default function SerializationPanel({ tender, onTenderUpdate }) {
  const { user, token } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submissionMode, setSubmissionMode] = useState('physical');
  const [serializing, setSerializing] = useState(false);
  const [serializedDocs, setSerializedDocs] = useState([]);

  const canSerialize = ORDER_ROLES.includes(user?.role);

  const fetchStatus = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/tenders/${tender.id}/serialization/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error);
      setStatus(payload);
      if (payload.submission_mode) setSubmissionMode(payload.submission_mode);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [tender.id]);

  const handleSerialize = async () => {
    setSerializing(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`/api/tenders/${tender.id}/serialization/serialize`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ submission_mode: submissionMode }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error);
      setMessage('Documents serialized and stamped successfully.');
      setSerializedDocs(payload.documents);
      await fetchStatus();
      if (onTenderUpdate) {
        onTenderUpdate({ ...tender, serialization_status: 'completed', submission_mode: submissionMode });
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSerializing(false);
    }
  };

  if (loading) return <div style={s.wrap}><p style={s.muted}>Loading serialization status…</p></div>;

  if (!canSerialize) {
    return (
      <div style={s.wrap}>
        <h3 style={{ marginTop: 0 }}>Page Serialization</h3>
        <div style={s.readOnly}>
          Only FL, INFO, and ADMIN roles can manage page serialization. Current status: {status?.serialization_status || 'pending'}
        </div>
      </div>
    );
  }

  return (
    <div style={s.wrap}>
      <h3 style={{ marginTop: 0 }}>Page Serialization & Bates Stamping</h3>

      {error && <p style={s.error}>❌ {error}</p>}
      {message && <p style={s.success}>✓ {message}</p>}

      <div style={s.section}>
        <label style={s.label}>Submission Mode</label>
        <select
          style={s.select}
          value={submissionMode}
          onChange={(e) => setSubmissionMode(e.target.value)}
          disabled={status?.serialization_status === 'completed'}
        >
          <option value="physical">Physical Submission</option>
          <option value="digital">Digital Submission</option>
          <option value="both">Both (Physical & Digital)</option>
        </select>
        <p style={{ ...s.muted, marginTop: '6px' }}>
          Choose how this tender will be submitted. This affects document formatting and packaging.
        </p>
      </div>

      <div style={s.section}>
        <label style={s.label}>Serialization Status</label>
        <div style={s.statusBox}>
          <div style={s.statusRow}>
            <span style={s.statusLabel}>Status:</span>
            <span style={{ ...s.badge, ...(status?.serialization_status === 'completed' ? s.badgeCompleted : s.badgePending) }}>
              {status?.serialization_status || 'pending'}
            </span>
          </div>
          <div style={s.statusRow}>
            <span style={s.statusLabel}>Documents Serialized:</span>
            <span style={s.statusValue}>{status?.serialized_count || 0} / {status?.total_approved || 0}</span>
          </div>
          {status?.serialized_at && (
            <div style={s.statusRow}>
              <span style={s.statusLabel}>Serialized At:</span>
              <span style={s.statusValue}>{new Date(status.serialized_at).toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>

      {status?.serialization_status !== 'completed' && (
        <div style={s.section}>
          <button
            style={{ ...s.button, ...(serializing ? s.buttonDisabled : {}) }}
            onClick={handleSerialize}
            disabled={serializing || !status?.total_approved}
          >
            {serializing ? 'Serializing…' : '🔢 Serialize & Stamp Pages'}
          </button>
          <p style={s.muted}>
            This will add 6-digit Bates page numbers to all approved documents in assembly order.
          </p>
        </div>
      )}

      {serializedDocs.length > 0 && (
        <div style={s.section}>
          <label style={s.label}>Serialized Documents</label>
          <ul style={s.docList}>
            {serializedDocs.map((doc) => (
              <li key={doc.id} style={s.docItem}>
                <div style={s.docName}>{doc.name}</div>
                <div style={s.docPages}>
                  Pages {String(doc.start_page).padStart(6, '0')} – {String(doc.end_page).padStart(6, '0')} ({doc.page_count} page{doc.page_count !== 1 ? 's' : ''})
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {status?.is_complete && (
        <div style={{ ...s.section, padding: '12px', backgroundColor: '#e8f5e9', borderRadius: '4px', border: '1px solid #c8e6c9' }}>
          <p style={{ margin: 0, color: '#388e3c', fontWeight: '600' }}>
            ✓ All documents have been serialized and stamped. Ready for final submission.
          </p>
        </div>
      )}
    </div>
  );
}

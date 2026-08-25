import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const SUBMISSION_ROLES = ['FL', 'INFO', 'ADMIN'];

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
  textarea: {
    width: '100%',
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontFamily: 'inherit',
    minHeight: '80px',
    resize: 'vertical',
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
    marginBottom: '8px',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    cursor: 'not-allowed',
  },
  buttonSecondary: {
    backgroundColor: '#757575',
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
    borderRadius: '4px',
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
  },
  badgeSuccess: {
    backgroundColor: '#e8f5e9',
    color: '#388e3c',
  },
  badgeWarning: {
    backgroundColor: '#fff3e0',
    color: '#f57c00',
  },
  submissionList: {
    marginTop: '16px',
  },
  submissionItem: {
    padding: '12px',
    backgroundColor: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: '4px',
    marginBottom: '8px',
  },
  submissionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  submissionType: {
    fontWeight: '600',
    color: '#333',
  },
  submissionDate: {
    fontSize: '12px',
    color: '#999',
  },
  submissionDetails: {
    fontSize: '13px',
    color: '#666',
    lineHeight: '1.5',
  },
};

export default function SubmissionPanel({ tender, onRefresh }) {
  const { user, token } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [submissionType, setSubmissionType] = useState('physical');
  const [method, setMethod] = useState('manual_upload');
  const [emailRecipient, setEmailRecipient] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = SUBMISSION_ROLES.includes(user?.role);

  useEffect(() => {
    if (!tender || !token) return;
    fetchStatus();
  }, [tender, token]);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:5005/api/tenders/${tender.id}/submission/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch submission status');
      const data = await res.json();
      setStatus(data);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMergePDF = async () => {
    try {
      setSubmitting(true);
      setError('');
      const res = await fetch(`http://localhost:5005/api/tenders/${tender.id}/submission/merge-pdf`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to merge PDF');
      const data = await res.json();
      setSuccess(`PDF merged: ${data.file_name}`);
      setTimeout(() => {
        window.location.href = `http://localhost:5005/${data.file_path}`;
      }, 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateZIP = async () => {
    try {
      setSubmitting(true);
      setError('');
      const res = await fetch(`http://localhost:5005/api/tenders/${tender.id}/submission/create-zip`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to create ZIP');
      const data = await res.json();
      setSuccess(`ZIP created: ${data.file_name}`);
      setTimeout(() => {
        window.location.href = `http://localhost:5005/${data.file_path}`;
      }, 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkSubmitted = async () => {
    if (!submissionType || !method) {
      setError('Please select submission type and method');
      return;
    }
    if (method === 'email' && !emailRecipient) {
      setError('Please enter email recipient');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const res = await fetch(`http://localhost:5005/api/tenders/${tender.id}/submission/mark-submitted`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submission_type: submissionType,
          method,
          email_recipient: method === 'email' ? emailRecipient : null,
          notes,
        }),
      });
      if (!res.ok) throw new Error('Failed to mark submission');
      setSuccess('✅ Submission marked successfully!');
      setTimeout(() => {
        fetchStatus();
        onRefresh?.();
      }, 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!canSubmit) {
    return (
      <div style={s.wrap}>
        <p style={s.muted}>📋 Submission Panel (Access restricted to FL, INFO, ADMIN)</p>
      </div>
    );
  }

  if (loading) {
    return <div style={s.wrap}>Loading submission status...</div>;
  }

  const isReadyForSubmission = status?.is_ready_for_submission;
  const hasSubmissions = status?.submissions?.length > 0;
  const isAlreadySubmitted = hasSubmissions && status.submissions[0].is_immutable;

  return (
    <div style={s.wrap}>
      <h3 style={{ marginTop: 0, marginBottom: '16px' }}>📤 Final Submission</h3>

      {error && <div style={s.error}>❌ {error}</div>}
      {success && <div style={s.success}>✅ {success}</div>}

      <div style={s.statusBox}>
        <div style={s.statusRow}>
          <span style={s.statusLabel}>Serialization Status:</span>
          <span style={s.statusValue}>
            {status?.serialization_status === 'completed' ? (
              <span style={{ ...s.badge, ...s.badgeSuccess }}>✅ Completed</span>
            ) : (
              <span style={{ ...s.badge, ...s.badgeWarning }}>⏳ {status?.serialization_status}</span>
            )}
          </span>
        </div>
        <div style={s.statusRow}>
          <span style={s.statusLabel}>Documents Serialized:</span>
          <span style={s.statusValue}>{status?.serialized_count} / {status?.total_approved}</span>
        </div>
        <div style={s.statusRow}>
          <span style={s.statusLabel}>Ready for Submission:</span>
          <span style={s.statusValue}>
            {isReadyForSubmission ? (
              <span style={{ ...s.badge, ...s.badgeSuccess }}>✅ Yes</span>
            ) : (
              <span style={{ ...s.badge, ...s.badgeWarning }}>❌ No</span>
            )}
          </span>
        </div>
      </div>

      {!isReadyForSubmission && (
        <div style={s.muted}>
          ⚠️ Please complete serialization before submitting. All {status?.total_approved} documents must be serialized.
        </div>
      )}

      {isReadyForSubmission && !isAlreadySubmitted && (
        <div style={s.section}>
          <h4 style={{ marginTop: '16px', marginBottom: '12px' }}>Prepare Submission</h4>

          <div style={s.section}>
            <label style={s.label}>Submission Type:</label>
            <select
              style={s.select}
              value={submissionType}
              onChange={(e) => setSubmissionType(e.target.value)}
              disabled={submitting}
            >
              <option value="physical">Physical (Merged PDF)</option>
              <option value="digital">Digital (ZIP Archive)</option>
            </select>
          </div>

          <div style={s.section}>
            <button
              style={{ ...s.button, ...(submitting ? s.buttonDisabled : {}) }}
              onClick={submissionType === 'physical' ? handleMergePDF : handleCreateZIP}
              disabled={submitting}
            >
              {submitting ? '⏳ Processing...' : submissionType === 'physical' ? '📄 Merge to PDF' : '📦 Create ZIP'}
            </button>
          </div>

          <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid #ddd' }} />

          <h4 style={{ marginTop: '16px', marginBottom: '12px' }}>Mark as Submitted</h4>

          <div style={s.section}>
            <label style={s.label}>Submission Method:</label>
            <select
              style={s.select}
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              disabled={submitting}
            >
              <option value="manual_upload">Manual Upload</option>
              <option value="email">Email</option>
            </select>
          </div>

          {method === 'email' && (
            <div style={s.section}>
              <label style={s.label}>Email Recipient:</label>
              <input
                type="email"
                style={s.select}
                placeholder="recipient@example.com"
                value={emailRecipient}
                onChange={(e) => setEmailRecipient(e.target.value)}
                disabled={submitting}
              />
            </div>
          )}

          <div style={s.section}>
            <label style={s.label}>Notes (Optional):</label>
            <textarea
              style={s.textarea}
              placeholder="Add any notes about this submission..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={submitting}
            />
          </div>

          <button
            style={{ ...s.button, ...(submitting ? s.buttonDisabled : {}) }}
            onClick={handleMarkSubmitted}
            disabled={submitting}
          >
            {submitting ? '⏳ Submitting...' : '✅ Mark as Submitted'}
          </button>
        </div>
      )}

      {hasSubmissions && (
        <div style={s.submissionList}>
          <h4 style={{ marginTop: '16px', marginBottom: '12px' }}>Submission History</h4>
          {status.submissions.map((sub) => (
            <div key={sub.id} style={s.submissionItem}>
              <div style={s.submissionHeader}>
                <span style={s.submissionType}>
                  {sub.submission_type === 'physical' ? '📄 Physical' : '📦 Digital'} - {sub.method === 'email' ? '📧 Email' : '📤 Manual'}
                </span>
                <span style={s.submissionDate}>{new Date(sub.submitted_at).toLocaleString()}</span>
              </div>
              <div style={s.submissionDetails}>
                {sub.email_recipient && <div>📧 To: {sub.email_recipient}</div>}
                {sub.notes && <div>📝 Notes: {sub.notes}</div>}
                {sub.is_immutable && <div style={{ color: '#388e3c', fontWeight: '600' }}>🔒 Immutable Record</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {isAlreadySubmitted && (
        <div style={{ ...s.statusBox, backgroundColor: '#e8f5e9', borderColor: '#388e3c' }}>
          <div style={{ color: '#388e3c', fontWeight: '600', fontSize: '16px' }}>
            ✅ This tender has been submitted
          </div>
          <div style={{ color: '#666', fontSize: '14px', marginTop: '8px' }}>
            Submission records are immutable and cannot be changed.
          </div>
        </div>
      )}
    </div>
  );
}

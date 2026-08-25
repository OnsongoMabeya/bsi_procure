import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';

const SUBMISSION_ROLES = ['FL', 'INFO', 'ADMIN'];

export default function SubmissionsPage() {
  const { user, token } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    if (!token) return;
    fetchSubmissions();
  }, [token]);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:5005/api/tenders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch tenders');
      const tenders = await res.json();

      const allSubmissions = [];
      for (const tender of tenders) {
        try {
          const statusRes = await fetch(`http://localhost:5005/api/tenders/${tender.id}/submission/status`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            if (statusData.submissions && statusData.submissions.length > 0) {
              statusData.submissions.forEach((sub) => {
                allSubmissions.push({
                  ...sub,
                  tender_id: tender.id,
                  tender_name: tender.name,
                  tender_ref: tender.reference_number,
                  procuring_entity: tender.procuring_entity,
                });
              });
            }
          }
        } catch (err) {
          console.error(`Error fetching submissions for tender ${tender.id}:`, err);
        }
      }

      setSubmissions(allSubmissions.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at)));
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const canViewSubmissions = SUBMISSION_ROLES.includes(user?.role);

  if (!canViewSubmissions) {
    return (
      <Layout>
        <div style={s.container}>
          <h1 style={s.title}>📤 Submissions</h1>
          <div style={s.restricted}>
            <p>Access restricted to FL, INFO, and ADMIN roles.</p>
          </div>
        </div>
      </Layout>
    );
  }

  const filteredSubmissions = filterType === 'all'
    ? submissions
    : submissions.filter((s) => s.submission_type === filterType);

  return (
    <Layout>
      <div style={s.container}>
        <h1 style={s.title}>📤 Submissions</h1>

        {error && <div style={s.error}>❌ {error}</div>}

        <div style={s.filterBar}>
          <label style={s.filterLabel}>Filter by Type:</label>
          <select
            style={s.filterSelect}
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">All Submissions</option>
            <option value="physical">Physical Only</option>
            <option value="digital">Digital Only</option>
          </select>
          <button style={s.refreshBtn} onClick={fetchSubmissions}>
            🔄 Refresh
          </button>
        </div>

        {loading ? (
          <div style={s.loading}>Loading submissions...</div>
        ) : filteredSubmissions.length === 0 ? (
          <div style={s.empty}>
            <p>No submissions found.</p>
          </div>
        ) : (
          <div style={s.submissionsList}>
            {filteredSubmissions.map((sub) => (
              <div key={`${sub.id}-${sub.tender_id}`} style={s.submissionCard}>
                <div style={s.cardHeader}>
                  <div>
                    <h3 style={s.cardTitle}>{sub.tender_name}</h3>
                    <p style={s.cardMeta}>
                      {sub.procuring_entity} • {sub.tender_ref}
                    </p>
                  </div>
                  <div style={s.cardBadges}>
                    <span style={{
                      ...s.badge,
                      backgroundColor: sub.submission_type === 'physical' ? '#dbeafe' : '#f3e8ff',
                      color: sub.submission_type === 'physical' ? '#1e40af' : '#6b21a8',
                    }}>
                      {sub.submission_type === 'physical' ? '📄 Physical' : '📦 Digital'}
                    </span>
                    <span style={{
                      ...s.badge,
                      backgroundColor: sub.method === 'email' ? '#fef3c7' : '#e0e7ff',
                      color: sub.method === 'email' ? '#92400e' : '#3730a3',
                    }}>
                      {sub.method === 'email' ? '📧 Email' : '📤 Manual'}
                    </span>
                  </div>
                </div>

                <div style={s.cardDetails}>
                  <div style={s.detailRow}>
                    <span style={s.detailLabel}>Submitted:</span>
                    <span style={s.detailValue}>
                      {new Date(sub.submitted_at).toLocaleString()}
                    </span>
                  </div>

                  {sub.email_recipient && (
                    <div style={s.detailRow}>
                      <span style={s.detailLabel}>Email Recipient:</span>
                      <span style={s.detailValue}>{sub.email_recipient}</span>
                    </div>
                  )}

                  {sub.email_sent_at && (
                    <div style={s.detailRow}>
                      <span style={s.detailLabel}>Email Sent:</span>
                      <span style={s.detailValue}>
                        {new Date(sub.email_sent_at).toLocaleString()}
                      </span>
                    </div>
                  )}

                  {sub.notes && (
                    <div style={s.detailRow}>
                      <span style={s.detailLabel}>Notes:</span>
                      <span style={s.detailValue}>{sub.notes}</span>
                    </div>
                  )}

                  {sub.is_immutable && (
                    <div style={{ ...s.detailRow, color: '#388e3c' }}>
                      <span style={s.detailLabel}>Status:</span>
                      <span style={s.detailValue}>🔒 Immutable Record</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

const s = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#153E90',
    marginBottom: '24px',
  },
  restricted: {
    padding: '16px',
    backgroundColor: '#fee2e2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    color: '#991b1b',
  },
  error: {
    padding: '12px',
    backgroundColor: '#fee2e2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    color: '#991b1b',
    marginBottom: '16px',
  },
  filterBar: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    marginBottom: '24px',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
  },
  filterLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
  },
  filterSelect: {
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontFamily: 'inherit',
  },
  refreshBtn: {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '600',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: '#1976d2',
    color: '#fff',
    cursor: 'pointer',
  },
  loading: {
    padding: '24px',
    textAlign: 'center',
    color: '#999',
  },
  empty: {
    padding: '24px',
    textAlign: 'center',
    color: '#999',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
  },
  submissionsList: {
    display: 'grid',
    gap: '16px',
  },
  submissionCard: {
    padding: '16px',
    backgroundColor: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#153E90',
    margin: '0 0 4px 0',
  },
  cardMeta: {
    fontSize: '13px',
    color: '#999',
    margin: '0',
  },
  cardBadges: {
    display: 'flex',
    gap: '8px',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 8px',
    fontSize: '12px',
    fontWeight: '600',
    borderRadius: '4px',
  },
  cardDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
  },
  detailLabel: {
    fontWeight: '600',
    color: '#666',
  },
  detailValue: {
    color: '#333',
  },
};

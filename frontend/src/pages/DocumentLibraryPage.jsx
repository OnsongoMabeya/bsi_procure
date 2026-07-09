import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

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

export default function DocumentLibraryPage() {
  const { token } = useAuth();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tenderFilter, setTenderFilter] = useState('');

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tenders/documents', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDocs(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [token]);

  const tenders = useMemo(() => {
    const map = new Map();
    for (const d of docs) {
      if (d.tender) map.set(d.tender.id, d.tender);
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [docs]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return docs.filter(d => {
      const matchesSearch =
        d.name?.toLowerCase().includes(q) ||
        d.itemName?.toLowerCase().includes(q) ||
        d.tender?.name?.toLowerCase().includes(q) ||
        d.tender?.reference_number?.toLowerCase().includes(q);
      const matchesStatus = !statusFilter || d.status === statusFilter;
      const matchesTender = !tenderFilter || String(d.tender?.id) === tenderFilter;
      return matchesSearch && matchesStatus && matchesTender;
    });
  }, [docs, search, statusFilter, tenderFilter]);

  const fileUrl = (path) => `${window.location.origin}/${path}`;

  return (
    <Layout title="Document Library">
      <div style={s.header}>
        <h2 style={s.title}>Document Library</h2>
        <span style={s.count}>{filtered.length} document{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {error && <p style={s.error}>{error}</p>}

      <div style={s.filters}>
        <input
          style={s.search}
          type="text"
          placeholder="Search documents, items, or tenders..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select style={s.select} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="APPROVED">Approved</option>
          <option value="UPLOADED">Uploaded</option>
          <option value="PENDING">Pending</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <select style={s.select} value={tenderFilter} onChange={(e) => setTenderFilter(e.target.value)}>
          <option value="">All tenders</option>
          {tenders.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p style={s.muted}>Loading documents…</p>
      ) : filtered.length === 0 ? (
        <div style={s.empty}>
          <div style={s.emptyIcon}>🗂</div>
          <h3 style={s.emptyTitle}>No documents found</h3>
          <p style={s.emptyNote}>Uploaded and approved documents across active tenders will appear here.</p>
        </div>
      ) : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Document</th>
                <th style={s.th}>Tender</th>
                <th style={s.th}>Item / Category</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Uploaded by</th>
                <th style={s.th}>Date</th>
                <th style={s.th}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(doc => (
                <tr key={doc.id} style={s.tr}>
                  <td style={s.td}>
                    <a href={fileUrl(doc.path)} target="_blank" rel="noreferrer" style={s.docLink}>📎 {doc.name}</a>
                  </td>
                  <td style={s.td}>
                    <div style={s.tenderName}>{doc.tender?.name || '—'}</div>
                    <div style={s.tenderMeta}>{doc.tender?.reference_number}</div>
                  </td>
                  <td style={s.td}>
                    <div>{doc.itemName || '—'}</div>
                    <div style={s.meta}>{CATEGORY_LABELS[doc.category] || doc.category}</div>
                  </td>
                  <td style={s.td}>
                    <span style={{ ...s.badge, background: STATUS_COLORS[doc.status]?.bg, color: STATUS_COLORS[doc.status]?.color }}>
                      {doc.status}
                    </span>
                  </td>
                  <td style={s.td}>{doc.uploader?.name || '—'} {doc.uploader?.role && <span style={s.meta}>({doc.uploader.role})</span>}</td>
                  <td style={s.td}>{doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : '—'}</td>
                  <td style={s.td}>
                    <a href={fileUrl(doc.path)} target="_blank" rel="noreferrer" style={s.view}>View ↗</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}

const s = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { color: 'var(--bsi-blue)', fontSize: 20, fontWeight: 700, margin: 0 },
  count: { color: 'var(--text-muted)', fontSize: 13 },
  error: { color: 'var(--red)', fontSize: 13, marginBottom: 12 },
  muted: { color: 'var(--text-muted)', fontSize: 13 },
  filters: { display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' },
  search: { flex: 1, minWidth: 220, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, background: 'var(--bg-card)' },
  select: { padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, background: 'var(--bg-card)', minWidth: 140 },
  tableWrap: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '12px 16px', background: '#f8fafc', color: 'var(--bsi-blue)', fontWeight: 700, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid var(--border)' },
  td: { padding: '12px 16px', verticalAlign: 'top' },
  docLink: { color: 'var(--bsi-accent)', textDecoration: 'none', fontWeight: 600, wordBreak: 'break-all' },
  tenderName: { fontWeight: 600, color: 'var(--text-main)' },
  tenderMeta: { color: 'var(--text-muted)', fontSize: 11, marginTop: 2 },
  meta: { color: 'var(--text-muted)', fontSize: 11 },
  badge: { padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' },
  view: { color: 'var(--bsi-accent)', textDecoration: 'none', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' },
  empty: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 48, textAlign: 'center' },
  emptyIcon: { fontSize: 36, marginBottom: 12 },
  emptyTitle: { color: 'var(--bsi-blue)', fontSize: 16, fontWeight: 700, marginBottom: 6 },
  emptyNote: { color: 'var(--text-muted)', fontSize: 13, margin: 0 },
};

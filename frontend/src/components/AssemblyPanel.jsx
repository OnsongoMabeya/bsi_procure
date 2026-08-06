import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const ORDER_ROLES = ['FL', 'INFO', 'ADMIN'];

export default function AssemblyPanel({ tender, onTenderUpdate }) {
  const { user, token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [toc, setToc] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [dirty, setDirty] = useState(false);

  const canOrder = ORDER_ROLES.includes(user?.role);

  const fetchAssembly = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/tenders/${tender.id}/assembly`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error);
      setData(payload);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAssembly(); }, [tender.id]);

  const moveTo = (fromId, toId) => {
    if (fromId === toId) return;
    setData((prev) => {
      const docs = [...prev.documents];
      const fromIndex = docs.findIndex((d) => d.id === fromId);
      const toIndex = docs.findIndex((d) => d.id === toId);
      if (fromIndex < 0 || toIndex < 0) return prev;
      const [moved] = docs.splice(fromIndex, 1);
      docs.splice(toIndex, 0, moved);
      return { ...prev, documents: docs };
    });
    setDirty(true);
    setToc(null);
  };

  const saveOrder = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`/api/tenders/${tender.id}/assembly/order`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ordered_ids: data.documents.map((d) => d.id) }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error);
      setDirty(false);
      setMessage('Order saved. The Table of Contents, page serialization, and file naming will follow this sequence.');
      await fetchAssembly();
      if (data.all_items_approved && tender.status === 'DOCUMENT_GATHERING') {
        onTenderUpdate?.({ ...tender, status: 'ASSEMBLY' });
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const generateToc = async () => {
    setGenerating(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`/api/tenders/${tender.id}/assembly/toc`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error);
      setToc(payload);
      setMessage('Table of Contents generated.');
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <div style={s.wrap}><p style={s.muted}>Loading assembly…</p></div>;

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <div>
          <h3 style={s.title}>Document Assembly &amp; Ordering</h3>
          <p style={s.muted}>
            {data?.approved_items || 0} of {data?.total_items || 0} checklist items approved
            {data?.all_items_approved ? ' — all documents ready for assembly.' : ' — only approved documents appear here.'}
          </p>
        </div>
        {canOrder && data?.documents?.length > 0 && (
          <div style={s.actions}>
            <button style={{ ...s.btnPrimary, opacity: dirty ? 1 : 0.55 }} disabled={!dirty || saving} onClick={saveOrder}>
              {saving ? 'Saving…' : 'Save Order'}
            </button>
            <button style={s.btnSecondary} disabled={generating || dirty} onClick={generateToc} title={dirty ? 'Save the order first' : ''}>
              {generating ? 'Generating…' : 'Generate Table of Contents'}
            </button>
          </div>
        )}
      </div>

      {error && <p style={s.error}>{error}</p>}
      {message && <p style={s.message}>{message}</p>}

      {(!data || data.documents.length === 0) ? (
        <div style={s.empty}>No approved documents yet. Documents appear here once checklist items are approved.</div>
      ) : (
        <div style={s.list}>
          {data.documents.map((doc, index) => (
            <div
              key={doc.id}
              draggable={canOrder}
              onDragStart={() => setDragId(doc.id)}
              onDragOver={(e) => { e.preventDefault(); if (dragId != null && dragId !== doc.id) moveTo(dragId, doc.id); }}
              onDragEnd={() => setDragId(null)}
              style={{ ...s.card, ...(dragId === doc.id ? s.cardDragging : {}), cursor: canOrder ? 'grab' : 'default' }}
            >
              <span style={s.seq}>{String(index + 1).padStart(2, '0')}</span>
              <div style={s.cardMain}>
                <div style={s.cardName}>
                  {doc.is_form && <span style={s.formTag}>FORM</span>}
                  {doc.form_reference && <span style={s.formRef}>{doc.form_reference}</span>}
                  {doc.name}
                </div>
                <div style={s.cardMeta}>
                  {doc.uploaded_document_path ? (
                    <a href={`/${doc.uploaded_document_path}`} target="_blank" rel="noreferrer" style={s.fileLink}>📎 {doc.uploaded_document_name}</a>
                  ) : <span style={s.mutedSmall}>No file</span>}
                  <span style={s.mutedSmall}>
                    {doc.page_count != null ? `${doc.page_count} page${doc.page_count !== 1 ? 's' : ''}` : 'page count n/a (counted as 1)'} · starts at page {doc.start_page}
                  </span>
                </div>
                <div style={s.fileName}>→ {doc.suggested_file_name}</div>
              </div>
              {canOrder && (
                <div style={s.arrows}>
                  <button style={s.arrowBtn} disabled={index === 0} onClick={() => moveTo(doc.id, data.documents[index - 1].id)}>↑</button>
                  <button style={s.arrowBtn} disabled={index === data.documents.length - 1} onClick={() => moveTo(doc.id, data.documents[index + 1].id)}>↓</button>
                </div>
              )}
            </div>
          ))}
          <div style={s.totals}>Total: {data.documents.length} documents · {data.total_pages} pages (before TOC)</div>
        </div>
      )}

      {toc && (
        <div style={s.tocBox}>
          <div style={s.tocHeader}>
            <span style={s.tocTitle}>Table of Contents</span>
            <a href={`/${toc.toc_path}`} target="_blank" rel="noreferrer" style={s.btnSecondary}>Open TOC PDF</a>
          </div>
          <table style={s.tocTable}>
            <thead>
              <tr>
                <th style={s.th}>#</th>
                <th style={{ ...s.th, textAlign: 'left' }}>Document</th>
                <th style={s.th}>Starts at page</th>
                <th style={s.th}>Pages</th>
              </tr>
            </thead>
            <tbody>
              {toc.entries.map((entry, i) => (
                <tr key={i}>
                  <td style={s.td}>{String(i + 1).padStart(2, '0')}</td>
                  <td style={{ ...s.td, textAlign: 'left' }}>{entry.form_reference ? `[${entry.form_reference}] ` : ''}{entry.name}</td>
                  <td style={s.td}>{entry.start_page}</td>
                  <td style={s.td}>{entry.page_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const s = {
  wrap: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 24, marginBottom: 16 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14, flexWrap: 'wrap' },
  title: { color: 'var(--bsi-blue)', fontSize: 16, fontWeight: 700, marginBottom: 4 },
  actions: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  btnPrimary: { padding: '7px 16px', background: 'var(--bsi-blue)', border: 'none', color: '#fff', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  btnSecondary: { padding: '7px 14px', background: '#fff', border: '1.5px solid var(--bsi-accent)', color: 'var(--bsi-accent)', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'none', display: 'inline-block' },
  error: { color: 'var(--red)', fontSize: 13, marginBottom: 8 },
  message: { color: 'var(--green)', fontSize: 13, marginBottom: 8, fontWeight: 600 },
  muted: { color: 'var(--text-muted)', fontSize: 13 },
  mutedSmall: { color: 'var(--text-muted)', fontSize: 11 },
  empty: { textAlign: 'center', padding: '28px 0', color: 'var(--text-muted)', fontSize: 13 },
  list: { display: 'grid', gap: 8 },
  card: { display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' },
  cardDragging: { opacity: 0.5, border: '1.5px dashed var(--bsi-accent)' },
  seq: { fontSize: 16, fontWeight: 800, color: 'var(--bsi-blue)', width: 30, flexShrink: 0 },
  cardMain: { flex: 1, minWidth: 0 },
  cardName: { fontSize: 13, fontWeight: 600, color: 'var(--text-main)', display: 'flex', gap: 6, alignItems: 'baseline', flexWrap: 'wrap' },
  cardMeta: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 3 },
  fileLink: { color: 'var(--bsi-accent)', textDecoration: 'none', fontWeight: 600, fontSize: 11 },
  fileName: { fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: 3 },
  formTag: { background: '#e0e7ff', color: '#3730a3', padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, flexShrink: 0 },
  formRef: { background: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, flexShrink: 0 },
  arrows: { display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 },
  arrowBtn: { width: 26, height: 22, border: '1px solid var(--border)', background: '#f9fafb', borderRadius: 4, fontSize: 12, cursor: 'pointer', color: 'var(--text-main)' },
  totals: { fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, paddingTop: 6 },
  tocBox: { marginTop: 18, borderTop: '1px solid var(--border)', paddingTop: 14 },
  tocHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 },
  tocTitle: { fontSize: 14, fontWeight: 700, color: 'var(--bsi-blue)' },
  tocTable: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th: { padding: '6px 8px', borderBottom: '2px solid var(--bsi-blue)', color: 'var(--bsi-blue)', fontSize: 11, textAlign: 'center' },
  td: { padding: '6px 8px', borderBottom: '1px solid var(--border)', color: 'var(--text-main)', textAlign: 'center' },
};

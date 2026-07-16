import { useEffect, useRef, useState } from 'react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { useAuth } from '../context/AuthContext';

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const TEMPLATE_ROLES = ['FL', 'INFO', 'ADMIN'];

export default function FormEditor({ tenderId, itemId, onClose, onSaved }) {
  const { user, token } = useAuth();
  const canvasRef = useRef(null);
  const [form, setForm] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(0);
  const [fields, setFields] = useState([]);
  const [activeText, setActiveText] = useState('');
  const [fontSize, setFontSize] = useState(12);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  const request = async (path, options = {}) => {
    const res = await fetch(`/api/forms${path}`, {
      ...options,
      headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  };

  const loadForm = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await request(`/tenders/${tenderId}/checklist/${itemId}`);
      setForm(data);
      if (data.template) {
        const pdf = await getDocument(`/${data.template.file_path}`).promise;
        setPageCount(pdf.numPages);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadForm(); }, [tenderId, itemId, token]);

  useEffect(() => {
    if (!form?.template) return undefined;
    let cancelled = false;
    const render = async () => {
      setRendering(true);
      try {
        const pdf = await getDocument(`/${form.template.file_path}`).promise;
        const pdfPage = await pdf.getPage(pageNumber + 1);
        const viewport = pdfPage.getViewport({ scale: 1.45 });
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await pdfPage.render({ canvasContext: context, viewport }).promise;
      } catch (err) {
        if (!cancelled) setError(`Unable to render the PDF template: ${err.message}`);
      } finally {
        if (!cancelled) setRendering(false);
      }
    };
    render();
    return () => { cancelled = true; };
  }, [form?.template?.file_path, pageNumber]);

  const uploadTemplate = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const body = new FormData();
    body.append('document', file);
    try {
      await request(`/tenders/${tenderId}/checklist/${itemId}/template`, { method: 'POST', body });
      setMessage('Blank template saved. You can now place text fields.');
      await loadForm();
    } catch (err) {
      setError(err.message);
    } finally {
      event.target.value = '';
    }
  };

  const addField = (event) => {
    if (!activeText.trim()) {
      setError('Enter text or select an auto-fill value before placing a field.');
      return;
    }
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    setFields((current) => [...current, { id: crypto.randomUUID(), page: pageNumber, x, y, text: activeText, fontSize }]);
    setError('');
  };

  const updateField = (id, text) => setFields((current) => current.map((field) => field.id === id ? { ...field, text } : field));
  const removeField = (id) => setFields((current) => current.filter((field) => field.id !== id));
  const pageFields = fields.filter((field) => field.page === pageNumber);

  const flatten = async () => {
    if (!fields.length) return setError('Place at least one text field before flattening.');
    setSaving(true);
    setError('');
    try {
      const data = await request(`/tenders/${tenderId}/checklist/${itemId}/flatten`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
      });
      setMessage('Filled PDF flattened and sent for review.');
      onSaved?.(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const canUploadTemplate = TEMPLATE_ROLES.includes(user?.role);

  if (loading) return <div style={styles.state}>Loading form editor…</div>;

  return (
    <section style={styles.modal}>
      <header style={styles.header}>
        <div>
          <h2 style={styles.title}>{form?.item?.form_reference || 'Tender Form'} — {form?.item?.name}</h2>
          <p style={styles.subtitle}>Place text over the blank PDF, then flatten it into a submission-ready file.</p>
        </div>
        <button style={styles.close} onClick={onClose}>Close</button>
      </header>

      {error && <div style={styles.error}>{error}</div>}
      {message && <div style={styles.message}>{message}</div>}

      {!form?.template ? (
        <div style={styles.templateState}>
          <h3 style={{ marginTop: 0 }}>Blank PDF template required</h3>
          <p style={styles.subtitle}>The original template is preserved separately from the flattened output.</p>
          {canUploadTemplate ? (
            <>
              <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" onChange={uploadTemplate} style={{ display: 'none' }} />
              <button style={styles.primary} onClick={() => fileInputRef.current?.click()}>Upload Blank PDF Template</button>
            </>
          ) : <p style={styles.error}>Ask FL or INFO to upload the blank PDF template for this form.</p>}
        </div>
      ) : (
        <div style={styles.workspace}>
          <aside style={styles.panel}>
            <label style={styles.label}>Text to place</label>
            <textarea value={activeText} onChange={(e) => setActiveText(e.target.value)} style={styles.textarea} placeholder="Type a value, then click the form" />
            <label style={styles.label}>Font size</label>
            <input type="number" min="6" max="36" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value) || 12)} style={styles.input} />
            <div style={styles.autofillHeader}>Company and tender auto-fill</div>
            <div style={styles.autofillList}>
              {Object.entries(form.autofill || {}).filter(([, value]) => value).map(([key, value]) => (
                <button key={key} onClick={() => setActiveText(String(value))} style={styles.autofillButton} title={String(value)}>
                  <strong>{key.replaceAll('_', ' ')}</strong><span>{String(value)}</span>
                </button>
              ))}
            </div>
            <div style={styles.fieldHeader}>Fields on this page ({pageFields.length})</div>
            <div style={styles.fieldList}>
              {pageFields.map((field) => (
                <div key={field.id} style={styles.fieldRow}>
                  <input value={field.text} onChange={(e) => updateField(field.id, e.target.value)} style={styles.fieldInput} />
                  <button onClick={() => removeField(field.id)} style={styles.delete}>×</button>
                </div>
              ))}
            </div>
          </aside>

          <div style={styles.viewerWrap}>
            <div style={styles.toolbar}>
              <button disabled={pageNumber === 0} onClick={() => setPageNumber((p) => p - 1)} style={styles.secondary}>← Previous</button>
              <span>Page {pageNumber + 1} of {pageCount}</span>
              <button disabled={pageNumber >= pageCount - 1} onClick={() => setPageNumber((p) => p + 1)} style={styles.secondary}>Next →</button>
              <button disabled={saving} onClick={flatten} style={styles.primary}>{saving ? 'Flattening…' : 'Flatten & Save'}</button>
            </div>
            <div style={styles.canvasScroll}>
              <div style={styles.canvasFrame} onClick={addField}>
                {rendering && <div style={styles.rendering}>Rendering…</div>}
                <canvas ref={canvasRef} style={styles.canvas} />
                {pageFields.map((field) => (
                  <span key={field.id} style={{ ...styles.overlayText, left: `${field.x * 100}%`, top: `${field.y * 100}%`, fontSize: `${field.fontSize}px` }}>{field.text}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

const styles = {
  modal: { background: '#fff', border: '1px solid #dbe3f0', borderRadius: 10, marginTop: 16, overflow: 'hidden' },
  header: { padding: '16px 20px', display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', borderBottom: '1px solid #e5e7eb' },
  title: { margin: 0, color: '#153E90', fontSize: 18 }, subtitle: { color: '#6b7280', margin: '5px 0 0', fontSize: 13 },
  close: { border: '1px solid #cbd5e1', background: '#fff', borderRadius: 6, padding: '7px 12px', cursor: 'pointer' },
  error: { margin: 12, padding: 10, background: '#fee2e2', color: '#991b1b', borderRadius: 6, fontSize: 13 },
  message: { margin: 12, padding: 10, background: '#dcfce7', color: '#166534', borderRadius: 6, fontSize: 13 },
  state: { padding: 24, color: '#6b7280' }, templateState: { padding: 28, textAlign: 'center' },
  workspace: { display: 'flex', minHeight: 620 }, panel: { width: 275, flexShrink: 0, borderRight: '1px solid #e5e7eb', padding: 16, background: '#f8fafc', overflowY: 'auto' },
  label: { display: 'block', fontWeight: 700, color: '#334155', fontSize: 12, marginBottom: 6 }, textarea: { width: '100%', minHeight: 74, boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: 6, padding: 8, resize: 'vertical' },
  input: { width: '100%', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: 6, padding: 7, marginBottom: 14 },
  autofillHeader: { fontWeight: 700, color: '#153E90', fontSize: 13, margin: '8px 0' }, autofillList: { maxHeight: 210, overflowY: 'auto', display: 'grid', gap: 6 },
  autofillButton: { textAlign: 'left', border: '1px solid #dbeafe', background: '#fff', borderRadius: 6, padding: 7, color: '#1e3a8a', cursor: 'pointer', overflow: 'hidden' },
  fieldHeader: { fontWeight: 700, color: '#334155', fontSize: 13, margin: '16px 0 8px' }, fieldList: { display: 'grid', gap: 6 }, fieldRow: { display: 'flex', gap: 4 }, fieldInput: { minWidth: 0, flex: 1, border: '1px solid #cbd5e1', borderRadius: 4, padding: 5 }, delete: { border: 0, background: '#fee2e2', color: '#991b1b', borderRadius: 4, cursor: 'pointer', width: 28 },
  viewerWrap: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }, toolbar: { padding: 12, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, borderBottom: '1px solid #e5e7eb' },
  primary: { background: '#153E90', color: '#fff', border: 0, borderRadius: 6, padding: '8px 12px', cursor: 'pointer', fontWeight: 700 }, secondary: { background: '#fff', color: '#153E90', border: '1px solid #93c5fd', borderRadius: 6, padding: '7px 10px', cursor: 'pointer' },
  canvasScroll: { flex: 1, overflow: 'auto', padding: 24, background: '#e2e8f0', textAlign: 'center' }, canvasFrame: { display: 'inline-block', position: 'relative', cursor: 'crosshair', lineHeight: 0, boxShadow: '0 4px 18px rgba(15, 23, 42, .22)', background: '#fff' }, canvas: { display: 'block', maxWidth: '100%', height: 'auto' },
  overlayText: { position: 'absolute', lineHeight: 1.2, color: '#111827', whiteSpace: 'pre-wrap', textAlign: 'left', pointerEvents: 'none', transform: 'translateY(-10%)' }, rendering: { position: 'absolute', inset: 0, zIndex: 2, display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,.8)', color: '#153E90', fontWeight: 700 },
};

import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const CAN_EDIT = ['FL', 'INFO', 'ADMIN'];
const CAN_SCAN = ['FL', 'INFO', 'ADMIN'];

const CATEGORY_LABELS = {
  company_standing: 'Company Standing',
  financial:        'Financial',
  experience:       'Experience',
  tender_form:      'Tender Forms',
  technical:        'Technical',
  it_related:       'IT Related',
  other:            'Other',
};

const CATEGORY_ORDER = ['tender_form', 'company_standing', 'financial', 'experience', 'technical', 'it_related', 'other'];

const STATUS_COLORS = {
  PENDING:     { bg: '#f3f4f6', color: '#374151' },
  IN_PROGRESS: { bg: '#fef3c7', color: '#92400e' },
  UPLOADED:    { bg: '#dbeafe', color: '#1e40af' },
  APPROVED:    { bg: '#dcfce7', color: '#166534' },
  REJECTED:    { bg: '#fee2e2', color: '#991b1b' },
};

const ROLES = ['FL', 'FIN', 'TECH', 'INFO', 'IT', 'HOT', 'ADMIN'];

export default function ChecklistPanel({ tender, onTenderUpdate }) {
  const { user, token } = useAuth();
  const [items, setItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', category: 'other', is_form: false, form_reference: '', notes: '', suggested_assignee_role: 'INFO', assigned_to: '' });

  const canEdit = CAN_EDIT.includes(user?.role);
  const canScan = CAN_SCAN.includes(user?.role);
  const isConfirmed = tender?.checklist_confirmed;

  const fetchItems = async () => {
    try {
      const res = await fetch(`/api/tenders/${tender.id}/checklist`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setItems(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setUsers(data);
    } catch {}
  };

  useEffect(() => {
    fetchItems();
    if (canEdit) fetchUsers();
  }, [tender.id]);

  const handleScan = async () => {
    if (!window.confirm('This will replace the current checklist with AI-extracted items. Continue?')) return;
    setScanning(true);
    setError('');
    try {
      const res = await fetch(`/api/ai/scan-tender/${tender.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await fetchItems();
    } catch (e) {
      setError(e.message);
    } finally {
      setScanning(false);
    }
  };

  const handleConfirm = async () => {
    if (!window.confirm('Confirm checklist? This locks task assignments and notifies assigned users.')) return;
    setConfirming(true);
    setError('');
    try {
      const res = await fetch(`/api/tenders/${tender.id}/checklist/confirm`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onTenderUpdate?.({ ...tender, checklist_confirmed: true });
    } catch (e) {
      setError(e.message);
    } finally {
      setConfirming(false);
    }
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm('Delete this checklist item?')) return;
    try {
      const res = await fetch(`/api/tenders/${tender.id}/checklist/${itemId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setItems(prev => prev.filter(i => i.id !== itemId));
    } catch (e) {
      setError(e.message);
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditForm({
      name: item.name,
      category: item.category,
      is_form: item.is_form,
      form_reference: item.form_reference || '',
      notes: item.notes || '',
      suggested_assignee_role: item.suggested_assignee_role || '',
      assigned_to: item.assigned_to || '',
    });
  };

  const saveEdit = async (itemId) => {
    try {
      const res = await fetch(`/api/tenders/${tender.id}/checklist/${itemId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editForm,
          assigned_to: editForm.assigned_to || null,
          form_reference: editForm.form_reference || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEditingId(null);
      await fetchItems();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/tenders/${tender.id}/checklist`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newItem,
          assigned_to: newItem.assigned_to || null,
          form_reference: newItem.form_reference || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowAddForm(false);
      setNewItem({ name: '', category: 'other', is_form: false, form_reference: '', notes: '', suggested_assignee_role: 'INFO', assigned_to: '' });
      await fetchItems();
    } catch (e) {
      setError(e.message);
    }
  };

  const grouped = CATEGORY_ORDER.reduce((acc, cat) => {
    const group = items.filter(i => i.category === cat);
    if (group.length > 0) acc[cat] = group;
    return acc;
  }, {});

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <h3 style={s.title}>Document Checklist</h3>
        <div style={s.actions}>
          {canScan && !isConfirmed && (
            <button style={s.btnScan} onClick={handleScan} disabled={scanning}>
              {scanning ? '⏳ Scanning…' : '✨ Scan with AI'}
            </button>
          )}
          {canEdit && !isConfirmed && (
            <button style={s.btnAdd} onClick={() => setShowAddForm(!showAddForm)}>
              {showAddForm ? 'Cancel' : '+ Add Item'}
            </button>
          )}
          {canEdit && !isConfirmed && items.length > 0 && (
            <button style={s.btnConfirm} onClick={handleConfirm} disabled={confirming}>
              {confirming ? 'Confirming…' : '✔ Confirm Checklist'}
            </button>
          )}
        </div>
      </div>

      {isConfirmed && (
        <div style={s.confirmedBanner}>
          ✅ Checklist confirmed — task assignments are locked.
        </div>
      )}

      {error && <p style={s.error}>{error}</p>}

      {showAddForm && !isConfirmed && (
        <form onSubmit={handleAddItem} style={s.addForm}>
          <div style={s.row}>
            <label style={s.field}>
              <span style={s.lbl}>Document Name *</span>
              <input style={s.input} required value={newItem.name} onChange={e => setNewItem(f => ({ ...f, name: e.target.value }))} />
            </label>
            <label style={s.field}>
              <span style={s.lbl}>Category</span>
              <select style={s.input} value={newItem.category} onChange={e => setNewItem(f => ({ ...f, category: e.target.value }))}>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
          </div>
          <div style={s.row}>
            <label style={s.field}>
              <span style={s.lbl}>Assign Role</span>
              <select style={s.input} value={newItem.suggested_assignee_role} onChange={e => setNewItem(f => ({ ...f, suggested_assignee_role: e.target.value }))}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            <label style={s.field}>
              <span style={s.lbl}>Assign User</span>
              <select style={s.input} value={newItem.assigned_to} onChange={e => setNewItem(f => ({ ...f, assigned_to: e.target.value }))}>
                <option value="">— unassigned —</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
              </select>
            </label>
          </div>
          <div style={s.row}>
            <label style={{ ...s.field, flexDirection: 'row', alignItems: 'center', gap: 8, flex: 'none' }}>
              <input type="checkbox" checked={newItem.is_form} onChange={e => setNewItem(f => ({ ...f, is_form: e.target.checked }))} />
              <span style={s.lbl}>Is a fillable form</span>
            </label>
            {newItem.is_form && (
              <label style={s.field}>
                <span style={s.lbl}>Form Reference</span>
                <input style={s.input} value={newItem.form_reference} placeholder="e.g. ELI-1.1" onChange={e => setNewItem(f => ({ ...f, form_reference: e.target.value }))} />
              </label>
            )}
          </div>
          <label style={s.field}>
            <span style={s.lbl}>Notes</span>
            <textarea style={{ ...s.input, minHeight: 60, resize: 'vertical' }} value={newItem.notes} onChange={e => setNewItem(f => ({ ...f, notes: e.target.value }))} />
          </label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="submit" style={s.btnConfirm}>Add Item</button>
          </div>
        </form>
      )}

      {loading ? (
        <p style={s.muted}>Loading checklist…</p>
      ) : items.length === 0 ? (
        <div style={s.empty}>
          <p>No checklist items yet.</p>
          {canScan && <p style={{ color: 'var(--text-light)', marginTop: 4 }}>Click "✨ Scan with AI" to extract from the tender document, or add items manually.</p>}
        </div>
      ) : (
        Object.entries(grouped).map(([cat, catItems]) => (
          <div key={cat} style={s.group}>
            <div style={s.groupHeader}>
              <span style={s.groupTitle}>{CATEGORY_LABELS[cat] || cat}</span>
              <span style={s.groupCount}>{catItems.length} item{catItems.length !== 1 ? 's' : ''}</span>
            </div>
            {catItems.map(item => (
              <div key={item.id} style={s.itemRow}>
                {editingId === item.id ? (
                  <div style={s.editBlock}>
                    <div style={s.row}>
                      <label style={s.field}>
                        <span style={s.lbl}>Name</span>
                        <input style={s.input} value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                      </label>
                      <label style={s.field}>
                        <span style={s.lbl}>Category</span>
                        <select style={s.input} value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}>
                          {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </label>
                    </div>
                    <div style={s.row}>
                      <label style={s.field}>
                        <span style={s.lbl}>Assign User</span>
                        <select style={s.input} value={editForm.assigned_to} onChange={e => setEditForm(f => ({ ...f, assigned_to: e.target.value }))}>
                          <option value="">— unassigned —</option>
                          {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                        </select>
                      </label>
                      <label style={s.field}>
                        <span style={s.lbl}>Suggested Role</span>
                        <select style={s.input} value={editForm.suggested_assignee_role} onChange={e => setEditForm(f => ({ ...f, suggested_assignee_role: e.target.value }))}>
                          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </label>
                    </div>
                    <label style={s.field}>
                      <span style={s.lbl}>Notes</span>
                      <textarea style={{ ...s.input, minHeight: 56, resize: 'vertical' }} value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
                    </label>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 6 }}>
                      <button style={s.btnSave} onClick={() => saveEdit(item.id)}>Save</button>
                      <button style={s.btnCancel} onClick={() => setEditingId(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={s.itemMain}>
                      <div style={s.itemName}>
                        {item.is_form && <span style={s.formTag}>FORM</span>}
                        {item.form_reference && <span style={s.formRef}>{item.form_reference}</span>}
                        {item.name}
                      </div>
                      {item.notes && <div style={s.itemNotes}>{item.notes}</div>}
                    </div>
                    <div style={s.itemMeta}>
                      <span style={s.assignee}>
                        {item.assignee ? `${item.assignee.name} (${item.assignee.role})` : item.suggested_assignee_role ? `Role: ${item.suggested_assignee_role}` : '—'}
                      </span>
                      <span style={{ ...s.statusBadge, background: STATUS_COLORS[item.status]?.bg, color: STATUS_COLORS[item.status]?.color }}>
                        {item.status}
                      </span>
                      {canEdit && !isConfirmed && (
                        <div style={s.itemActions}>
                          <button style={s.btnEdit} onClick={() => startEdit(item)}>Edit</button>
                          <button style={s.btnDel} onClick={() => handleDelete(item.id)}>✕</button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}

const s = {
  wrap: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 24, marginBottom: 16 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 },
  title: { color: 'var(--bsi-blue)', fontSize: 16, fontWeight: 700 },
  actions: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  btnScan:    { padding: '7px 14px', background: '#f0f9ff', border: '1.5px solid var(--bsi-accent)', color: 'var(--bsi-accent)', borderRadius: 6, fontSize: 13, fontWeight: 600 },
  btnAdd:     { padding: '7px 14px', background: '#fff', border: '1.5px solid var(--border)', color: 'var(--text-main)', borderRadius: 6, fontSize: 13, fontWeight: 600 },
  btnConfirm: { padding: '7px 14px', background: 'var(--green)', border: 'none', color: '#fff', borderRadius: 6, fontSize: 13, fontWeight: 700 },
  btnSave:    { padding: '5px 14px', background: 'var(--bsi-blue)', border: 'none', color: '#fff', borderRadius: 5, fontSize: 12, fontWeight: 600 },
  btnCancel:  { padding: '5px 14px', background: '#fff', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: 5, fontSize: 12 },
  btnEdit:    { padding: '3px 10px', background: '#f3f4f6', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: 4, fontSize: 11, fontWeight: 600 },
  btnDel:     { padding: '3px 8px', background: '#fee2e2', border: 'none', color: 'var(--red)', borderRadius: 4, fontSize: 11, fontWeight: 700 },
  confirmedBanner: { background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 7, padding: '10px 16px', fontSize: 13, fontWeight: 600, color: 'var(--green)', marginBottom: 16 },
  error: { color: 'var(--red)', fontSize: 13, marginBottom: 8 },
  muted: { color: 'var(--text-muted)', fontSize: 13 },
  empty: { textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 13 },
  addForm: { background: '#f9fafb', border: '1px solid var(--border)', borderRadius: 8, padding: 16, marginBottom: 16 },
  group: { marginBottom: 12 },
  groupHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '2px solid var(--bsi-blue)', marginBottom: 4 },
  groupTitle: { fontSize: 12, fontWeight: 700, color: 'var(--bsi-blue)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  groupCount: { fontSize: 11, color: 'var(--text-muted)' },
  itemRow: { padding: '10px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' },
  itemMain: { flex: 1, minWidth: 200 },
  itemName: { fontSize: 13, color: 'var(--text-main)', fontWeight: 500, display: 'flex', gap: 6, alignItems: 'baseline', flexWrap: 'wrap' },
  itemNotes: { fontSize: 11, color: 'var(--text-muted)', marginTop: 3 },
  formTag: { background: '#e0e7ff', color: '#3730a3', padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, flexShrink: 0 },
  formRef: { background: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, flexShrink: 0 },
  itemMeta: { display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap' },
  assignee: { fontSize: 11, color: 'var(--text-muted)' },
  statusBadge: { padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700 },
  itemActions: { display: 'flex', gap: 4 },
  editBlock: { width: '100%', background: '#f9fafb', border: '1px solid var(--border)', borderRadius: 7, padding: 12 },
  row: { display: 'flex', gap: 12, marginBottom: 10, flexWrap: 'wrap' },
  field: { display: 'flex', flexDirection: 'column', flex: 1, minWidth: 160 },
  lbl: { fontSize: 11, fontWeight: 600, color: 'var(--text-main)', marginBottom: 3 },
  input: { padding: '7px 9px', border: '1px solid var(--border)', borderRadius: 5, fontSize: 13, color: 'var(--text-main)', background: '#fff' },
};

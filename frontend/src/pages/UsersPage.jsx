import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const ROLES = ['CEO', 'GM', 'FL', 'FIN', 'TECH', 'INFO', 'IT', 'HOT', 'ADMIN'];

const ROLE_LABELS = {
  CEO: 'Chief Executive Officer',
  GM: 'General Manager',
  FL: 'Finance Lead',
  FIN: 'Finance',
  TECH: 'Technician',
  INFO: 'Info / Office Admin',
  IT: 'IT',
  HOT: 'Head of Technical',
  ADMIN: 'System Administrator',
};

const EMPTY_FORM = { name: '', email: '', password: '', role: 'INFO', whatsapp_number: '' };

export default function UsersPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const authHeader = { Authorization: `Bearer ${token}` };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users', { headers: authHeader });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (u) => {
    setForm({ name: u.name, email: u.email, password: '', role: u.role, whatsapp_number: u.whatsapp_number || '' });
    setEditId(u.id);
    setFormError('');
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const body = { name: form.name, email: form.email, role: form.role, whatsapp_number: form.whatsapp_number };
      if (form.password) body.password = form.password;
      if (!editId) body.password = form.password;

      const res = await fetch(editId ? `/api/users/${editId}` : '/api/users', {
        method: editId ? 'PATCH' : 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await fetchUsers();
      setShowForm(false);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (u) => {
    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: 'PATCH',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !u.is_active }),
      });
      if (!res.ok) throw new Error('Failed to update');
      await fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h2 style={styles.heading}>User Management</h2>
        <button style={styles.btnPrimary} onClick={openCreate}>+ New User</button>
      </div>

      {error && <p style={styles.error}>{error}</p>}

      {showForm && (
        <div style={styles.formCard}>
          <h3 style={styles.formTitle}>{editId ? 'Edit User' : 'Create User'}</h3>
          <form onSubmit={handleSave} style={styles.form}>
            <div style={styles.row}>
              <div style={styles.field}>
                <label style={styles.label}>Full Name</label>
                <input style={styles.input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Email</label>
                <input style={styles.input} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
            </div>
            <div style={styles.row}>
              <div style={styles.field}>
                <label style={styles.label}>{editId ? 'New Password (leave blank to keep)' : 'Password'}</label>
                <input style={styles.input} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editId} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>WhatsApp Number</label>
                <input style={styles.input} value={form.whatsapp_number} onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })} placeholder="+254700000000" />
              </div>
            </div>
            <div style={{ ...styles.field, maxWidth: 240 }}>
              <label style={styles.label}>Role</label>
              <select style={styles.input} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {ROLES.map((r) => <option key={r} value={r}>{r} — {ROLE_LABELS[r]}</option>)}
              </select>
            </div>
            {formError && <p style={styles.error}>{formError}</p>}
            <div style={styles.formActions}>
              <button style={styles.btnSecondary} type="button" onClick={() => setShowForm(false)}>Cancel</button>
              <button style={styles.btnPrimary} type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p>Loading users...</p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr style={styles.thead}>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Role</th>
              <th style={styles.th}>WhatsApp</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ ...styles.tr, opacity: u.is_active ? 1 : 0.5 }}>
                <td style={styles.td}>{u.name}</td>
                <td style={styles.td}>{u.email}</td>
                <td style={styles.td}>
                  <span style={{ ...styles.badge, background: ROLE_COLORS[u.role] || '#6b7280' }}>{u.role}</span>
                </td>
                <td style={styles.td}>{u.whatsapp_number || '—'}</td>
                <td style={styles.td}>
                  <span style={{ ...styles.badge, background: u.is_active ? '#16a34a' : '#dc2626' }}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={styles.td}>
                  <button style={styles.btnLink} onClick={() => openEdit(u)}>Edit</button>
                  <button style={{ ...styles.btnLink, color: u.is_active ? '#dc2626' : '#16a34a' }} onClick={() => toggleActive(u)}>
                    {u.is_active ? 'Deactivate' : 'Reactivate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const ROLE_COLORS = {
  ADMIN: '#153E90', CEO: '#1e40af', GM: '#2563eb', FL: '#0e7490',
  FIN: '#0891b2', INFO: '#7c3aed', IT: '#6d28d9', TECH: '#d97706', HOT: '#b45309',
};

const styles = {
  page: { padding: 24 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  heading: { margin: 0, color: '#153E90', fontSize: 20, fontWeight: 700 },
  btnPrimary: { padding: '8px 18px', background: '#153E90', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnSecondary: { padding: '8px 18px', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnLink: { background: 'none', border: 'none', color: '#2DA2E5', fontSize: 13, cursor: 'pointer', marginRight: 8, fontWeight: 600 },
  error: { color: '#dc2626', fontSize: 13 },
  formCard: { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '20px 24px', marginBottom: 24 },
  formTitle: { margin: '0 0 16px', color: '#153E90', fontSize: 16, fontWeight: 700 },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  row: { display: 'flex', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', flex: 1 },
  label: { fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 },
  input: { padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 5, fontSize: 14, color: '#111827' },
  formActions: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  thead: { background: '#f3f4f6' },
  th: { padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb' },
  tr: { borderBottom: '1px solid #f3f4f6' },
  td: { padding: '10px 14px', color: '#374151', verticalAlign: 'middle' },
  badge: { display: 'inline-block', padding: '2px 10px', borderRadius: 99, color: '#fff', fontSize: 12, fontWeight: 600 },
};

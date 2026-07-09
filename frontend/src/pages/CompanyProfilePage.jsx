import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

const FIELD_GROUPS = [
  { title: 'Basic Information', fields: [
    { key: 'company_name', label: 'Company Name' },
    { key: 'trading_name', label: 'Trading Name' },
    { key: 'registration_number', label: 'Registration Number' },
    { key: 'year_of_incorporation', label: 'Year of Incorporation', type: 'number' },
  ]},
  { title: 'Contact Details', fields: [
    { key: 'legal_address', label: 'Legal Address' },
    { key: 'postal_address', label: 'Postal Address' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'website', label: 'Website' },
  ]},
  { title: 'Authorized Representative', fields: [
    { key: 'authorized_representative_name', label: 'Name' },
    { key: 'authorized_representative_title', label: 'Title' },
    { key: 'authorized_representative_email', label: 'Email' },
    { key: 'authorized_representative_phone', label: 'Phone' },
  ]},
  { title: 'Business Information', fields: [
    { key: 'nature_of_business', label: 'Nature of Business' },
    { key: 'max_contract_value', label: 'Max Contract Value', type: 'number' },
    { key: 'trade_license_number', label: 'Trade License Number' },
    { key: 'trade_license_expiry', label: 'Trade License Expiry', type: 'date' },
  ]},
  { title: 'Company Identity', fields: [
    { key: 'mission', label: 'Mission' },
    { key: 'vision', label: 'Vision' },
    { key: 'core_values', label: 'Core Values' },
  ]},
];

export default function CompanyProfilePage() {
  const { token, user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [profile, setProfile] = useState(null);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [message, setMessage] = useState('');
  const fileInputRef = useRef(null);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/company-profile', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProfile(data.profile);
      setVersions(data.versions || []);
      setForm(data.profile);
    } catch (e) {
      setMessage(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [token]);

  const handleChange = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/company-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProfile(data);
      setForm(data);
      setEditing(false);
      setMessage('Profile saved successfully.');
    } catch (e) {
      setMessage(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const body = new FormData();
    body.append('document', file);
    try {
      const res = await fetch('/api/company-profile/source-document', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProfile(data.profile);
      setVersions((v) => [data.version, ...v]);
      setMessage('Source document uploaded.');
    } catch (err) {
      setMessage(err.message);
    }
  };

  const fileUrl = (path) => `${window.location.origin}/${path}`;

  return (
    <Layout title="Company Profile">
      <div style={s.header}>
        <h2 style={s.title}>Company Profile</h2>
        {isAdmin && !editing && (
          <button style={s.btnPrimary} onClick={() => setEditing(true)}>Edit Profile</button>
        )}
        {isAdmin && editing && (
          <div style={s.actions}>
            <button style={s.btnSecondary} onClick={() => { setForm(profile); setEditing(false); }}>Cancel</button>
            <button style={s.btnPrimary} onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
          </div>
        )}
      </div>

      {message && <p style={s.message}>{message}</p>}

      {loading ? (
        <p style={s.muted}>Loading profile…</p>
      ) : profile ? (
        <>
          <div style={s.card}>
            {FIELD_GROUPS.map(group => (
              <div key={group.title} style={s.group}>
                <h4 style={s.groupTitle}>{group.title}</h4>
                <div style={s.grid}>
                  {group.fields.map(field => (
                    <div key={field.key} style={s.field}>
                      <label style={s.label}>{field.label}</label>
                      {editing ? (
                        <input
                          type={field.type || 'text'}
                          value={form[field.key] ?? ''}
                          onChange={(e) => handleChange(field.key, e.target.value)}
                          style={s.input}
                        />
                      ) : (
                        <div style={s.value}>{formatValue(field.key, profile[field.key]) || '—'}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div style={s.group}>
              <h4 style={s.groupTitle}>Directors</h4>
              {editing ? (
                <DirectorEditor value={form.directors || []} onChange={(v) => handleChange('directors', v)} />
              ) : (
                (profile.directors || []).length === 0 ? (
                  <p style={s.muted}>No directors added yet.</p>
                ) : (
                  <ul style={s.list}>
                    {(profile.directors || []).map((d, i) => (
                      <li key={i} style={s.listItem}>
                        <strong>{d.name}</strong>
                        {d.nationality && <span> · {d.nationality}</span>}
                        {d.citizenship && <span> · {d.citizenship}</span>}
                        {d.sharePercentage && <span> · {d.sharePercentage}%</span>}
                      </li>
                    ))}
                  </ul>
                )
              )}
            </div>
          </div>

          <div style={s.docCard}>
            <div style={s.docHeader}>
              <h3 style={s.docTitle}>Source-of-Truth Document</h3>
              {isAdmin && (
                <button style={s.btnPrimary} onClick={() => fileInputRef.current?.click()}>Upload / Replace</button>
              )}
              <input ref={fileInputRef} type="file" style={{ display: 'none' }} accept=".pdf,.doc,.docx" onChange={handleFileUpload} />
            </div>
            {profile.source_document_path ? (
              <div style={s.docRow}>
                <a href={fileUrl(profile.source_document_path)} target="_blank" rel="noreferrer" style={s.docLink}>📎 {profile.source_document_name}</a>
                <span style={s.meta}>Version {versions.length}</span>
              </div>
            ) : (
              <p style={s.muted}>No source document uploaded yet.</p>
            )}

            {versions.length > 0 && (
              <div style={s.versions}>
                <h4 style={s.versionsTitle}>Version History</h4>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>File</th>
                      <th style={s.th}>Uploaded by</th>
                      <th style={s.th}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {versions.map(v => (
                      <tr key={v.id}>
                        <td style={s.td}><a href={fileUrl(v.file_path)} target="_blank" rel="noreferrer" style={s.docLink}>{v.file_name}</a></td>
                        <td style={s.td}>{v.uploader?.name} <span style={s.meta}>({v.uploader?.role})</span></td>
                        <td style={s.td}>{new Date(v.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <p style={s.muted}>No profile found.</p>
      )}
    </Layout>
  );
}

function DirectorEditor({ value, onChange }) {
  const update = (idx, key, val) => {
    const next = [...value];
    next[idx] = { ...next[idx], [key]: val };
    onChange(next);
  };
  const add = () => onChange([...value, { name: '', nationality: '', citizenship: '', sharePercentage: '' }]);
  const remove = (idx) => {
    const next = [...value];
    next.splice(idx, 1);
    onChange(next);
  };

  return (
    <div>
      {value.map((d, i) => (
        <div key={i} style={s.directorRow}>
          <input style={s.input} placeholder="Name" value={d.name} onChange={(e) => update(i, 'name', e.target.value)} />
          <input style={s.input} placeholder="Nationality" value={d.nationality} onChange={(e) => update(i, 'nationality', e.target.value)} />
          <input style={s.input} placeholder="Citizenship" value={d.citizenship} onChange={(e) => update(i, 'citizenship', e.target.value)} />
          <input style={s.input} placeholder="Share %" value={d.sharePercentage} onChange={(e) => update(i, 'sharePercentage', e.target.value)} />
          <button style={s.btnDanger} onClick={() => remove(i)}>Remove</button>
        </div>
      ))}
      <button style={s.btnSecondary} onClick={add}>+ Add Director</button>
    </div>
  );
}

function formatValue(key, value) {
  if (value === null || value === undefined || value === '') return '';
  if (key === 'max_contract_value') return value ? Number(value).toLocaleString() : '';
  if (key === 'trade_license_expiry') return new Date(value).toLocaleDateString();
  return value;
}

const s = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { color: 'var(--bsi-blue)', fontSize: 20, fontWeight: 700, margin: 0 },
  actions: { display: 'flex', gap: 10 },
  message: { color: 'var(--green)', fontSize: 13, marginBottom: 16 },
  muted: { color: 'var(--text-muted)', fontSize: 13 },
  card: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 24, marginBottom: 20 },
  group: { marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid var(--border)' },
  groupTitle: { color: 'var(--bsi-blue)', fontSize: 14, fontWeight: 700, margin: '0 0 14px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: { color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' },
  value: { color: 'var(--text-main)', fontSize: 13, fontWeight: 500, lineHeight: 1.4 },
  input: { padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, background: 'var(--bg-card)' },
  list: { margin: 0, paddingLeft: 18, color: 'var(--text-main)', fontSize: 13 },
  listItem: { marginBottom: 6 },
  docCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 24 },
  docHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  docTitle: { color: 'var(--bsi-blue)', fontSize: 16, fontWeight: 700, margin: 0 },
  docRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  docLink: { color: 'var(--bsi-accent)', textDecoration: 'none', fontWeight: 600, wordBreak: 'break-all' },
  meta: { color: 'var(--text-muted)', fontSize: 11 },
  versions: { marginTop: 20 },
  versionsTitle: { color: 'var(--bsi-blue)', fontSize: 13, fontWeight: 700, margin: '0 0 10px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th: { textAlign: 'left', padding: '8px 10px', background: '#f8fafc', color: 'var(--bsi-blue)', fontWeight: 700, borderBottom: '1px solid var(--border)' },
  td: { padding: '8px 10px', borderBottom: '1px solid var(--border)' },
  directorRow: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'center' },
  btnPrimary: { padding: '8px 14px', background: 'var(--bsi-accent)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  btnSecondary: { padding: '8px 14px', background: '#f1f5f9', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  btnDanger: { padding: '6px 10px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' },
};

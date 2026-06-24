import Layout from '../components/Layout';
import { Link } from 'react-router-dom';

export default function SettingsPage() {
  return (
    <Layout title="Settings">
      <div style={styles.grid}>
        <Link to="/users" style={styles.card}>
          <div style={styles.icon}>👥</div>
          <div style={styles.label}>User Management</div>
          <div style={styles.note}>Create, edit, and deactivate user accounts</div>
        </Link>
        <div style={{ ...styles.card, opacity: 0.5, cursor: 'default' }}>
          <div style={styles.icon}>🔔</div>
          <div style={styles.label}>Notifications</div>
          <div style={styles.note}>WhatsApp alert settings — Phase 12</div>
        </div>
        <div style={{ ...styles.card, opacity: 0.5, cursor: 'default' }}>
          <div style={styles.icon}>🔒</div>
          <div style={styles.label}>Security</div>
          <div style={styles.note}>Password policies — Phase 14</div>
        </div>
      </div>
    </Layout>
  );
}

const styles = {
  grid: { display: 'flex', gap: 16, flexWrap: 'wrap' },
  card: {
    background: 'var(--bg-card)',
    borderRadius: 10,
    padding: 24,
    border: '1px solid var(--border)',
    width: 200,
    textAlign: 'center',
    display: 'block',
    transition: 'box-shadow 0.15s',
  },
  icon: { fontSize: 28, marginBottom: 10 },
  label: { color: 'var(--bsi-blue)', fontWeight: 700, fontSize: 14, marginBottom: 6 },
  note: { color: 'var(--text-light)', fontSize: 12 },
};

import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();
  return (
    <Layout title="Dashboard">
      <div style={styles.card}>
        <h2 style={styles.welcome}>Welcome back, {user?.name}</h2>
        <p style={styles.sub}>Role: <strong>{user?.role}</strong></p>
        <p style={styles.note}>Dashboard widgets coming in a later phase.</p>
      </div>
    </Layout>
  );
}

const styles = {
  card: { background: 'var(--bg-card)', borderRadius: 10, padding: 28, border: '1px solid var(--border)', maxWidth: 480 },
  welcome: { color: 'var(--bsi-blue)', fontSize: 18, fontWeight: 700, marginBottom: 8 },
  sub: { color: 'var(--text-muted)', marginBottom: 12 },
  note: { color: 'var(--text-light)', fontSize: 13 },
};

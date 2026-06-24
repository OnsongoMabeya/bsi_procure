import Layout from '../components/Layout';

export default function TendersPage() {
  return (
    <Layout title="Tenders">
      <Placeholder label="Tenders" note="Tender intake, upload, and feasibility approval — Phase 3." />
    </Layout>
  );
}

function Placeholder({ label, note }) {
  return (
    <div style={styles.card}>
      <div style={styles.icon}>📄</div>
      <h3 style={styles.label}>{label}</h3>
      <p style={styles.note}>{note}</p>
    </div>
  );
}

const styles = {
  card: { background: 'var(--bg-card)', borderRadius: 10, padding: 40, border: '1px solid var(--border)', maxWidth: 400, textAlign: 'center' },
  icon: { fontSize: 32, marginBottom: 12 },
  label: { color: 'var(--bsi-blue)', fontSize: 16, fontWeight: 700, marginBottom: 8 },
  note: { color: 'var(--text-light)', fontSize: 13 },
};

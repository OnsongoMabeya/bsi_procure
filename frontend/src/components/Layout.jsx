import Sidebar from './Sidebar';

export default function Layout({ children, title }) {
  return (
    <div style={styles.shell}>
      <Sidebar />
      <div style={styles.main}>
        <header style={styles.topbar}>
          <h1 style={styles.pageTitle}>{title}</h1>
        </header>
        <main style={styles.content}>
          {children}
        </main>
      </div>
    </div>
  );
}

const styles = {
  shell: {
    display: 'flex',
    minHeight: '100vh',
  },
  main: {
    marginLeft: 'var(--sidebar-w)',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
  },
  topbar: {
    height: 'var(--topbar-h)',
    background: 'var(--bg-card)',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 24px',
    position: 'sticky',
    top: 0,
    zIndex: 50,
  },
  pageTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: 'var(--bsi-blue)',
  },
  content: {
    padding: 24,
    flex: 1,
  },
};

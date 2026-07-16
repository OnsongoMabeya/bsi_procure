import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = [
  {
    label: 'Dashboard',
    path: '/',
    icon: '▦',
    roles: ['CEO', 'GM', 'FL', 'FIN', 'TECH', 'INFO', 'IT', 'HOT', 'ADMIN'],
  },
  {
    label: 'My Tasks',
    path: '/tasks',
    icon: '✔',
    roles: ['GM', 'FL', 'FIN', 'TECH', 'INFO', 'IT', 'HOT', 'ADMIN'],
  },
  {
    label: 'Tenders',
    path: '/tenders',
    icon: '📄',
    roles: ['CEO', 'GM', 'FL', 'FIN', 'TECH', 'INFO', 'IT', 'HOT', 'ADMIN'],
  },
  {
    label: 'My Documents',
    path: '/documents',
    icon: '🗂️',
    roles: ['GM', 'FL', 'TECH', 'INFO', 'IT', 'HOT', 'ADMIN'],
  },
  {
    label: 'Company Profile',
    path: '/company-profile',
    icon: '🏢',
    roles: ['ADMIN', 'FL', 'INFO'],
  },
  {
    label: 'Company Documents',
    path: '/company-documents',
    icon: '📁',
    roles: ['ADMIN', 'FL', 'INFO'],
  },
  {
    label: 'Past Tenders',
    path: '/past-tenders',
    icon: '🕒',
    roles: ['CEO', 'GM', 'FL', 'FIN', 'TECH', 'INFO', 'IT', 'HOT', 'ADMIN'],
  },
  {
    label: 'Settings',
    path: '/settings',
    icon: '⚙',
    roles: ['ADMIN'],
  },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const visible = NAV.filter((item) => item.roles.includes(user?.role));

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside style={styles.sidebar}>
      <div style={styles.logoBlock}>
        <div style={styles.logoCircle}>BSI</div>
        <div>
          <div style={styles.logoName}>Procurement</div>
          <div style={styles.logoSub}>Management System</div>
        </div>
      </div>

      <nav style={styles.nav}>
        {visible.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            style={({ isActive }) => ({
              ...styles.navItem,
              ...(isActive ? styles.navItemActive : {}),
            })}
          >
            <span style={styles.navIcon}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div style={styles.bottomBlock}>
        <div style={styles.userInfo}>
          <div style={styles.userAvatar}>{user?.name?.[0]?.toUpperCase()}</div>
          <div>
            <div style={styles.userName}>{user?.name}</div>
            <div style={styles.userRole}>{user?.role}</div>
          </div>
        </div>
        <button style={styles.logoutBtn} onClick={handleLogout}>
          Sign out
        </button>
      </div>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: 'var(--sidebar-w)',
    minHeight: '100vh',
    background: 'var(--bsi-blue)',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 100,
  },
  logoBlock: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '20px 16px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    marginBottom: 8,
  },
  logoCircle: {
    width: 38,
    height: 38,
    borderRadius: '50%',
    background: 'var(--bsi-accent)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    fontSize: 13,
    flexShrink: 0,
  },
  logoName: {
    color: '#fff',
    fontWeight: 700,
    fontSize: 13,
    lineHeight: 1.2,
  },
  logoSub: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 10,
    lineHeight: 1.2,
  },
  nav: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '4px 8px',
    gap: 2,
    overflowY: 'auto',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '9px 12px',
    borderRadius: 7,
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    fontWeight: 500,
    transition: 'background 0.15s',
  },
  navItemActive: {
    background: 'rgba(255,255,255,0.15)',
    color: '#fff',
    fontWeight: 600,
  },
  navIcon: {
    fontSize: 15,
    width: 20,
    textAlign: 'center',
    flexShrink: 0,
  },
  bottomBlock: {
    borderTop: '1px solid rgba(255,255,255,0.1)',
    padding: '12px 12px 16px',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: 'var(--bsi-accent)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 13,
    flexShrink: 0,
  },
  userName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 600,
    lineHeight: 1.3,
  },
  userRole: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
  },
  logoutBtn: {
    width: '100%',
    padding: '7px 0',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 6,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: 600,
  },
};

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MyTasksPage from './pages/MyTasksPage';
import TendersPage from './pages/TendersPage';
import DocumentLibraryPage from './pages/DocumentLibraryPage';
import CompanyProfilePage from './pages/CompanyProfilePage';
import CompanyDocumentsPage from './pages/CompanyDocumentsPage';
import PastTendersPage from './pages/PastTendersPage';
import SettingsPage from './pages/SettingsPage';
import UsersPage from './pages/UsersPage';

const ALL_ROLES = ['CEO', 'GM', 'FL', 'FIN', 'TECH', 'INFO', 'IT', 'HOT', 'ADMIN'];

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route path="/" element={
            <ProtectedRoute roles={ALL_ROLES}><DashboardPage /></ProtectedRoute>
          } />
          <Route path="/tasks" element={
            <ProtectedRoute roles={['GM','FL','FIN','TECH','INFO','IT','HOT','ADMIN']}><MyTasksPage /></ProtectedRoute>
          } />
          <Route path="/tenders" element={
            <ProtectedRoute roles={ALL_ROLES}><TendersPage /></ProtectedRoute>
          } />
          <Route path="/documents" element={
            <ProtectedRoute roles={['GM','FL','TECH','INFO','IT','HOT','ADMIN']}><DocumentLibraryPage /></ProtectedRoute>
          } />
          <Route path="/company-profile" element={
            <ProtectedRoute roles={['ADMIN','FL','INFO']}><CompanyProfilePage /></ProtectedRoute>
          } />
          <Route path="/company-documents" element={
            <ProtectedRoute roles={['ADMIN','FL','INFO']}><CompanyDocumentsPage /></ProtectedRoute>
          } />
          <Route path="/past-tenders" element={
            <ProtectedRoute roles={ALL_ROLES}><PastTendersPage /></ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute roles={['ADMIN']}><SettingsPage /></ProtectedRoute>
          } />
          <Route path="/users" element={
            <ProtectedRoute roles={['ADMIN']}><UsersPage /></ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

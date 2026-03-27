import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inbox from './pages/Inbox';
import Leads from './pages/Leads';
import Agenda from './pages/Agenda';
import Support from './pages/Support';
import Collections from './pages/Collections';
import Automation from './pages/Automation';
import Settings from './pages/Settings';
import Templates from './pages/Templates';
import ImportContacts from './pages/Contacts/Import';
import Typifications from './pages/Typifications';

// Constant credentials (for hardcoded auth as requested)
const isAuthenticated = () => localStorage.getItem('emdecob_auth') === 'true';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  if (!isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="inbox" element={<Inbox />} />
          <Route path="leads" element={<Leads />} />
          <Route path="contacts/import" element={<ImportContacts />} />
          <Route path="agenda" element={<Agenda />} />
          <Route path="templates" element={<Templates />} />
          <Route path="typifications" element={<Typifications />} />
          <Route path="support" element={<Support />} />
          <Route path="collections" element={<Collections />} />
          <Route path="automation" element={<Automation />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

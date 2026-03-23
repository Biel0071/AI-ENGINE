import { Navigate, Route, Routes } from 'react-router-dom';
import MainTemplate from './templates/MainTemplate';
import AIConfigPage from './pages/AIConfigPage';
import CampaignsPage from './pages/CampaignsPage';
import ContactsPage from './pages/ContactsPage';
import DashboardPage from './pages/DashboardPage';
import FlowBuilderPage from './pages/FlowBuilderPage';
import InboxPage from './pages/InboxPage';
import QuickRepliesPage from './pages/QuickRepliesPage';
import SessionsPage from './pages/SessionsPage';
import DebugAll from './pages/DebugAll';
import { safeRender } from './utils/safeRender';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/debug" element={<DebugAll />} />

      <Route element={<MainTemplate />}>
        <Route path="/dashboard" element={safeRender(DashboardPage)} />
        <Route path="/inbox" element={safeRender(InboxPage)} />
        <Route path="/chat" element={safeRender(InboxPage)} />
        <Route path="/connections" element={safeRender(SessionsPage)} />
        <Route path="/campaigns" element={safeRender(CampaignsPage)} />
        <Route path="/contacts" element={safeRender(ContactsPage)} />
        <Route path="/flows" element={safeRender(FlowBuilderPage)} />
        <Route path="/quick-replies" element={safeRender(QuickRepliesPage)} />
        <Route path="/ai-config" element={safeRender(AIConfigPage)} />
        <Route path="/sessions" element={safeRender(SessionsPage)} />
      </Route>
    </Routes>
  );
}

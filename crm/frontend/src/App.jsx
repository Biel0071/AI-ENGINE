import { Link, Navigate, Route, Routes } from 'react-router-dom';
import InboxPage from './pages/Inbox';
import ChatPage from './pages/Chat';
import ConnectionsPage from './modules/connections/ConnectionsPage';

function AppLayout({ children }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <h1>Zapai CRM</h1>
        <nav>
          <Link to="/inbox">Inbox</Link>
          <Link to="/chat">Chat</Link>
          <Link to="/connections">Connections</Link>
        </nav>
      </header>
      <main className="content">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/inbox" replace />} />
        <Route path="/inbox" element={<InboxPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/connections" element={<ConnectionsPage />} />
      </Routes>
    </AppLayout>
  );
}

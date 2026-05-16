import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import NormalChat from './components/NormalChat';
import ProposalGenerator from './components/ProposalGenerator';
import CompetitorSearch from './components/CompetitorSearch';
import DailyProcessResults from './components/DailyProcessResults';

const navItems = [
  { to: '/', label: 'ダッシュボード', icon: 'dashboard' },
  { to: '/chat', label: 'ノーマルチャット', icon: 'chat' },
  { to: '/proposal', label: '企画書AI生成', icon: 'proposal' },
  { to: '/competitor', label: '競合検索', icon: 'search' },
  { to: '/daily', label: '日次処理結果', icon: 'daily' },
];

function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <aside className="sidebar">
          <div className="sidebar-header">
            <div className="sidebar-logo-icon">AI</div>
            <h1 className="sidebar-title">AIチャットハブ</h1>
          </div>
          <nav className="sidebar-nav">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `nav-link${isActive ? ' active' : ''}`
                }
              >
                <span className={`nav-icon nav-icon-${item.icon}`}></span>
                <span className="nav-label">{item.label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="sidebar-footer">
            <div className="user-info">
              <div className="user-avatar">U</div>
              <span className="user-name">社員太郎</span>
            </div>
          </div>
        </aside>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/chat" element={<NormalChat />} />
            <Route path="/proposal" element={<ProposalGenerator />} />
            <Route path="/competitor" element={<CompetitorSearch />} />
            <Route path="/daily" element={<DailyProcessResults />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;

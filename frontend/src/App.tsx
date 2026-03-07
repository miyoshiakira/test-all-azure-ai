import { useState } from 'react';
import { DocumentUpload } from './components/DocumentUpload';
import { Chat } from './components/Chat';
import { Admin } from './components/Admin';
import { EmployeeList } from './components/EmployeeList';

type SubPageType = 'upload' | 'admin' | 'employee' | null;

function App() {
  const [subPage, setSubPage] = useState<SubPageType>(null);

  const handleBack = () => {
    setSubPage(null);
  };

  // サブページ表示時
  if (subPage) {
    return (
      <div className="app">
        <header className="header header-compact">
          <button className="back-button" onClick={handleBack}>
            ← 戻る
          </button>
          <h1>社員検索AI</h1>
          <div className="header-spacer"></div>
        </header>

        <div className="panel">
          {subPage === 'upload' && <DocumentUpload />}
          {subPage === 'admin' && <Admin />}
          {subPage === 'employee' && <EmployeeList />}
        </div>
      </div>
    );
  }

  // メイン画面（チャット）
  return (
    <div className="app">
      <header className="header">
        <div className="ai-icon"></div>
        <h1>社員検索AI</h1>
        <p>社員情報をAIで検索・登録</p>
      </header>

      <div className="sub-nav">
        <button
          className="sub-nav-btn"
          onClick={() => setSubPage('upload')}
        >
          ドキュメント管理
        </button>
        <button
          className="sub-nav-btn"
          onClick={() => setSubPage('employee')}
        >
          社員一覧
        </button>
        <button
          className="sub-nav-btn"
          onClick={() => setSubPage('admin')}
        >
          設定
        </button>
      </div>

      <div className="panel main-panel">
        <Chat />
      </div>
    </div>
  );
}

export default App;

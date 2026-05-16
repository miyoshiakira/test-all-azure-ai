import { useState } from 'react';
import ChatPanel, { ChatMessage } from './ChatPanel';
import { useSessionHistory } from '../hooks/useSessionHistory';

const mockExcelData = [
  ['競合企業名', '製品名', '価格', '市場シェア', '特徴', 'URL'],
  ['株式会社A', 'Product A1', '¥50,000', '25%', '高性能・高信頼', 'https://company-a.com'],
  ['株式会社B', 'Product B1', '¥35,000', '18%', 'コストパフォーマンス', 'https://company-b.com'],
  ['株式会社C', 'Product C1', '¥42,000', '15%', 'クラウド対応', 'https://company-c.com'],
  ['株式会社D', 'Product D1', '¥60,000', '12%', 'エンタープライズ向け', 'https://company-d.com'],
  ['株式会社E', 'Product E1', '¥28,000', '10%', 'スモールビジネス向け', 'https://company-e.com'],
];

export default function CompetitorSearch() {
  const {
    sessions,
    activeSession,
    activeSessionId,
    createSession,
    selectSession,
    updateSessionMessages,
    deleteSession,
  } = useSessionHistory('competitor');

  const [input, setInput] = useState('');
  const [searchResult, setSearchResult] = useState<string[][] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const messages = activeSession?.messages ?? [];

  const handleSend = (text: string) => {
    let currentMessages = messages;
    if (!activeSession) {
      createSession();
      currentMessages = [];
    }
    const userMsg: ChatMessage = { id: Date.now(), role: 'user', content: text };
    const botMsg: ChatMessage = {
      id: Date.now() + 1,
      role: 'assistant',
      content: `「${text}」について競合検索の準備ができました。実行ボタンを押して検索を開始してください。`,
    };
    const newMessages = [...currentMessages, userMsg, botMsg];
    const sessionId = activeSession ? activeSession.id : sessions[0]?.id;
    if (sessionId) {
      updateSessionMessages(sessionId, newMessages);
    }
  };

  const handleCreate = () => {
    createSession('競合検索コーナーへようこそ。仕様や背景を伝えてください。実行ボタンでWeb検索を開始します。');
  };

  const handleSearch = () => {
    setIsSearching(true);
    setTimeout(() => {
      setSearchResult(mockExcelData);
      setIsSearching(false);
    }, 2500);
  };

  return (
    <div className="page split-page">
      <div className="page-header">
        <h2>競合検索コーナー</h2>
        <span className="page-badge">Web検索付きAI</span>
      </div>
      <div className="split-layout">
        <div className="split-left">
          <ChatPanel
            messages={messages}
            input={input}
            setInput={setInput}
            onSend={handleSend}
            compact
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={selectSession}
            onCreateSession={handleCreate}
            onDeleteSession={deleteSession}
          />
          <button
            className="generate-button search"
            onClick={handleSearch}
            disabled={isSearching || messages.length <= 1}
          >
            {isSearching ? '検索中...' : '競合検索を実行'}
          </button>
        </div>
        <div className="split-right">
          <div className="file-panel">
            <div className="file-panel-header">
              <h3>競合データ検索結果</h3>
              {searchResult && <button className="download-btn">Excel出力</button>}
            </div>
            <div className="file-preview">
              {isSearching ? (
                <div className="generating-indicator">
                  <div className="spinner" />
                  <p>Web検索中...</p>
                </div>
              ) : searchResult ? (
                <div className="excel-preview">
                  <table className="excel-table">
                    <thead>
                      <tr>
                        {searchResult[0].map((header, i) => (
                          <th key={i}>{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {searchResult.slice(1).map((row, ri) => (
                        <tr key={ri}>
                          {row.map((cell, ci) => (
                            <td key={ci}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-panel">
                  <p>左のチャットで仕様を伝え、<br />実行ボタンで競合検索を開始</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import ChatPanel, { ChatMessage } from './ChatPanel';
import { useSessionHistory } from '../hooks/useSessionHistory';
import { apiClient, CompetitorSearchResult } from '../api/client';

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
  const [searchResult, setSearchResult] = useState<CompetitorSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const messages = activeSession?.messages ?? [];

  // Chat uses semantic search (same as NormalChat)
  const handleSend = async (text: string, model: string) => {
    let currentMessages = messages;
    if (!activeSession) {
      createSession();
      currentMessages = [];
    }

    const userMsg: ChatMessage = { id: Date.now(), role: 'user', content: text };
    const tempMessages = [...currentMessages, userMsg];
    const sessionId = activeSession ? activeSession.id : sessions[0]?.id;
    if (sessionId) {
      updateSessionMessages(sessionId, tempMessages);
    }

    setIsChatLoading(true);
    try {
      const apiMessages = tempMessages.map((m) => ({ role: m.role, content: m.content }));
      const result = await apiClient.semanticChat(apiMessages, model, true);

      const botMsg: ChatMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: result.response,
      };
      const newMessages = [...tempMessages, botMsg];
      if (sessionId) {
        updateSessionMessages(sessionId, newMessages);
      }
    } catch (e: unknown) {
      const errorMsg: ChatMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `エラーが発生しました: ${e instanceof Error ? e.message : 'Unknown error'}`,
      };
      const newMessages = [...tempMessages, errorMsg];
      if (sessionId) {
        updateSessionMessages(sessionId, newMessages);
      }
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleCreate = () => {
    createSession('競合検索コーナーへようこそ。仕様や背景を伝えてください。実行ボタンでWeb検索を開始します。');
  };

  // Execute competitor web search based on chat context
  const handleSearch = async () => {
    if (!activeSession || messages.length <= 1) return;

    setIsSearching(true);
    setSearchError(null);
    try {
      const apiMessages = messages.map((m) => ({ role: m.role, content: m.content }));
      const result = await apiClient.competitorSearch(apiMessages);
      setSearchResult(result);

      // Add a system message about the search result
      if (result.table.length > 0) {
        const resultMsg: ChatMessage = {
          id: Date.now(),
          role: 'assistant',
          content: `競合検索が完了しました。検索クエリ: 「${result.search_query}」\n${result.table.length - 1}件の競合データを右パネルに表示しています。`,
        };
        updateSessionMessages(activeSession.id, [...messages, resultMsg]);
      } else if (result.message) {
        const resultMsg: ChatMessage = {
          id: Date.now(),
          role: 'assistant',
          content: result.message,
        };
        updateSessionMessages(activeSession.id, [...messages, resultMsg]);
      }
    } catch (e: unknown) {
      setSearchError(e instanceof Error ? e.message : 'Search failed');
      const errorMsg: ChatMessage = {
        id: Date.now(),
        role: 'assistant',
        content: `競合検索でエラーが発生しました: ${e instanceof Error ? e.message : 'Unknown error'}`,
      };
      updateSessionMessages(activeSession.id, [...messages, errorMsg]);
    } finally {
      setIsSearching(false);
    }
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
          {isChatLoading && (
            <div className="chat-loading-bar">
              <div className="chat-loading-spinner" />
              <span>AI回答中...</span>
            </div>
          )}
          <button
            className="generate-button search"
            onClick={handleSearch}
            disabled={isSearching || messages.length <= 1}
          >
            {isSearching ? 'Web検索・表生成中...' : '競合検索を実行'}
          </button>
        </div>
        <div className="split-right">
          <div className="file-panel">
            <div className="file-panel-header">
              <h3>競合データ検索結果</h3>
              {searchResult && searchResult.table.length > 0 && (
                <button className="download-btn">Excel出力</button>
              )}
            </div>
            <div className="file-preview">
              {isSearching ? (
                <div className="generating-indicator">
                  <div className="spinner" />
                  <p>Web検索・表生成中...</p>
                </div>
              ) : searchError ? (
                <div className="empty-panel">
                  <p className="error-text">{searchError}</p>
                </div>
              ) : searchResult && searchResult.table.length > 0 ? (
                <div className="excel-preview">
                  {searchResult.search_query && (
                    <div className="search-query-info">
                      検索クエリ: 「{searchResult.search_query}」
                    </div>
                  )}
                  <table className="excel-table">
                    <thead>
                      <tr>
                        {searchResult.table[0].map((header, i) => (
                          <th key={i}>{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {searchResult.table.slice(1).map((row, ri) => (
                        <tr key={ri}>
                          {row.map((cell, ci) => (
                            <td key={ci}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {searchResult.web_results.length > 0 && (
                    <div className="web-sources">
                      <h4>Web検索ソース</h4>
                      {searchResult.web_results.map((r, i) => (
                        <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="web-source-link">
                          {r.title}
                        </a>
                      ))}
                    </div>
                  )}
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

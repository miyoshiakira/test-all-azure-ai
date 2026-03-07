import { useState, useRef, useEffect } from 'react';
import { apiClient, ChatMessage, ToolCall } from '../api/client';

interface ToolNotification {
  id: number;
  toolCall: ToolCall;
  visible: boolean;
}

export function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [useSearch, setUseSearch] = useState(true);
  const [useSemantic, setUseSemantic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<ToolNotification[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const notificationIdRef = useRef(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const showToolNotification = (toolCall: ToolCall) => {
    const id = ++notificationIdRef.current;
    setNotifications(prev => [...prev, { id, toolCall, visible: true }]);

    // 5秒後に通知を非表示にする
    setTimeout(() => {
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, visible: false } : n)
      );
      // さらに0.5秒後に削除
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, 500);
    }, 5000);
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.chat(newMessages, useSearch, useSemantic);
      const assistantMessage: ChatMessage = { role: 'assistant', content: response.response };
      setMessages([...newMessages, assistantMessage]);

      // Tool callsがあれば通知を表示
      if (response.tool_calls && response.tool_calls.length > 0) {
        response.tool_calls.forEach(tc => {
          showToolNotification(tc);
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '応答の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  const dismissNotification = (id: number) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, visible: false } : n)
    );
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 500);
  };

  return (
    <div className="chat-container fade-in">
      {/* ツール実行通知 */}
      <div className="tool-notifications">
        {notifications.map(({ id, toolCall, visible }) => (
          <div
            key={id}
            className={`tool-notification ${visible ? 'show' : 'hide'} ${toolCall.result.success ? 'success' : 'error'}`}
            onClick={() => dismissNotification(id)}
          >
            <div className="tool-notification-header">
              {toolCall.result.success ? '✅' : '❌'}
              <strong>
                {toolCall.tool_name === 'register_employee' ? '新規社員登録' :
                 toolCall.tool_name === 'delete_employee' ? '社員削除' :
                 toolCall.tool_name === 'get_employees' ? '社員一覧取得' : toolCall.tool_name}
              </strong>
            </div>
            <div className="tool-notification-body">
              {toolCall.result.success ? (
                <>
                  <div className="employee-info">
                    <span className="employee-name">{toolCall.result.user_name}</span>
                    <span className="employee-grade">グレード: {toolCall.result.grade}</span>
                  </div>
                  {toolCall.result.others && (
                    <div className="employee-others">{toolCall.result.others}</div>
                  )}
                  {toolCall.result.message && (
                    <div className="employee-others">{toolCall.result.message}</div>
                  )}
                </>
              ) : (
                <div className="tool-error">{toolCall.result.error || toolCall.result.message}</div>
              )}
            </div>
            <div className="tool-notification-footer">
              クリックで閉じる
            </div>
          </div>
        ))}
      </div>

      {error && <div className="error">{error}</div>}

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <div className="chat-empty-icon">🤖</div>
            <h3 style={{ marginBottom: '10px', color: 'var(--primary)' }}>AIアシスタント</h3>
            <p>アップロードしたドキュメントについて</p>
            <p>なんでも質問してください</p>
            <div style={{ marginTop: '20px', fontSize: '13px' }}>
              <p style={{ marginBottom: '8px' }}>💡 質問例:</p>
              <p>「この資料の要点を教えて」</p>
              <p>「〇〇について詳しく説明して」</p>
              <p style={{ marginTop: '12px', color: 'var(--secondary)' }}>
                👤 社員登録: 「山田太郎をグレード5000で登録して」
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <div key={idx} className={`message ${msg.role}`}>
                {msg.role === 'assistant' && (
                  <div style={{ fontSize: '12px', marginBottom: '8px', opacity: 0.7, color: 'var(--primary)' }}>
                    🤖 AI
                  </div>
                )}
                {msg.content}
              </div>
            ))}
            {loading && (
              <div className="message thinking">
                <div style={{ fontSize: '12px', marginBottom: '8px', opacity: 0.7, color: 'var(--secondary)' }}>
                  🤖 AI が思考中...
                </div>
                <div className="thinking-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="chat-input-area">
        <div className="chat-options">
          <label className="toggle-label">
            <span className="toggle">
              <input
                type="checkbox"
                checked={useSearch}
                onChange={(e) => setUseSearch(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </span>
            <span>📚 ドキュメント検索（RAG）</span>
          </label>

          <label className="toggle-label" style={{ opacity: useSearch ? 1 : 0.5 }}>
            <span className="toggle">
              <input
                type="checkbox"
                checked={useSemantic}
                onChange={(e) => setUseSemantic(e.target.checked)}
                disabled={!useSearch}
              />
              <span className="toggle-slider"></span>
            </span>
            <span>🧠 セマンティック検索</span>
          </label>

          <button
            className="btn btn-secondary btn-sm"
            onClick={clearChat}
            style={{ opacity: messages.length > 0 ? 1 : 0.5 }}
          >
            🗑️ チャットをクリア
          </button>
        </div>

        <div className="chat-input">
          <input
            type="text"
            placeholder="メッセージを入力... (Enterで送信)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
          />
          <button
            className="btn btn-primary"
            onClick={handleSend}
            disabled={loading || !input.trim()}
          >
            {loading ? '⏳' : '🚀'} 送信
          </button>
        </div>
      </div>
    </div>
  );
}

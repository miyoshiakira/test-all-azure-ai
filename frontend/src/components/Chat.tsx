import { useState, useRef, useEffect } from 'react';
import { apiClient, ChatMessage } from '../api/client';

export function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [useSearch, setUseSearch] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.chat(newMessages, useSearch);
      const assistantMessage: ChatMessage = { role: 'assistant', content: response.response };
      setMessages([...newMessages, assistantMessage]);
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

  return (
    <div className="chat-container fade-in">
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
            <span>📚 ドキュメント検索を使用（RAG）</span>
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

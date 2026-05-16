import { useState, useRef, useEffect } from 'react';
import ModelSelector from './ModelSelector';
import SessionList from './SessionList';
import { Session } from '../hooks/useSessionHistory';

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  input: string;
  setInput: (v: string) => void;
  onSend: (input: string, model: string) => void;
  compact?: boolean;
  showModelSelector?: boolean;
  sessions?: Session[];
  activeSessionId?: string | null;
  onSelectSession?: (id: string) => void;
  onCreateSession?: () => void;
  onDeleteSession?: (id: string) => void;
}

export default function ChatPanel({
  messages,
  input,
  setInput,
  onSend,
  compact = false,
  showModelSelector = true,
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
}: ChatPanelProps) {
  const [model, setModel] = useState('gpt-4o');
  const [showSessions, setShowSessions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input, model);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasSessions = sessions && onSelectSession && onCreateSession && onDeleteSession;

  return (
    <div className={`chat-container${compact ? ' compact' : ''}`}>
      <div className="chat-body">
        {hasSessions && showSessions && (
          <SessionList
            sessions={sessions!}
            activeSessionId={activeSessionId ?? null}
            onSelect={onSelectSession!}
            onCreate={onCreateSession!}
            onDelete={onDeleteSession!}
          />
        )}
        <div className="chat-main">
          {showModelSelector && (
            <div className="chat-toolbar">
              {hasSessions && (
                <button
                  className={`session-toggle-btn${showSessions ? ' active' : ''}`}
                  onClick={() => setShowSessions(!showSessions)}
                  title="セッション履歴"
                >
                  {showSessions ? '<' : '>'}
                </button>
              )}
              <ModelSelector value={model} onChange={setModel} />
            </div>
          )}
          <div className="chat-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`chat-message ${msg.role}`}>
                <div className={`message-avatar ${msg.role}`}>
                  {msg.role === 'user' ? 'U' : 'AI'}
                </div>
                <div className="message-content">
                  <div className="message-text">{msg.content}</div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="chat-input-area">
            <textarea
              className="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="メッセージを入力..."
              rows={1}
            />
            <button className="send-button" onClick={handleSend} disabled={!input.trim()}>
              送信
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

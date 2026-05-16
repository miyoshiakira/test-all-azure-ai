import { useState } from 'react';
import ChatPanel, { ChatMessage } from './ChatPanel';
import { useSessionHistory } from '../hooks/useSessionHistory';

function getMockResponse(input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes('こんにちは') || lower.includes('hello'))
    return 'こんにちは！AIアシスタントです。何かお手伝いできることはありますか？';
  if (lower.includes('help') || lower.includes('助け'))
    return '私は以下のようなお手伝いができます：\n\n- 一般的な質問への回答\n- アイデアのブレインストーミング\n- 文章の作成・校正\n- データの分析・整理\n\nお気軽にどうぞ！';
  return `ご質問ありがとうございます。「${input}」についてお答えします。\n\nこれはモック回答です。実際のAI機能では、より詳細な回答を生成します。`;
}

export default function NormalChat() {
  const {
    sessions,
    activeSession,
    activeSessionId,
    createSession,
    selectSession,
    updateSessionMessages,
    deleteSession,
  } = useSessionHistory('normal_chat');

  const [input, setInput] = useState('');

  const messages = activeSession?.messages ?? [];

  const handleSend = (text: string) => {
    let currentMessages = messages;
    if (!activeSession) {
      createSession();
      // After createSession, activeSession will be set on next render
      // Use a temporary message list for this render
      currentMessages = [];
    }
    const userMsg: ChatMessage = { id: Date.now(), role: 'user', content: text };
    const botMsg: ChatMessage = { id: Date.now() + 1, role: 'assistant', content: getMockResponse(text) };
    const newMessages = [...currentMessages, userMsg, botMsg];
    const sessionId = activeSession ? activeSession.id : sessions[0]?.id;
    if (sessionId) {
      updateSessionMessages(sessionId, newMessages);
    }
  };

  const handleCreate = () => {
    createSession('ノーマルチャットへようこそ。学習データなしの汎用AIです。何でもお気軽にどうぞ。');
  };

  return (
    <div className="page chat-page">
      <div className="page-header">
        <h2>ノーマルチャット</h2>
        <span className="page-badge">汎用AI</span>
      </div>
      <ChatPanel
        messages={messages}
        input={input}
        setInput={setInput}
        onSend={handleSend}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={selectSession}
        onCreateSession={handleCreate}
        onDeleteSession={deleteSession}
      />
    </div>
  );
}

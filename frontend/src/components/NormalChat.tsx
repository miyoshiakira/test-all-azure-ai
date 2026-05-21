import { useState } from 'react';
import ChatPanel, { ChatMessage } from './ChatPanel';
import { useSessionHistory } from '../hooks/useSessionHistory';
import { apiClient } from '../api/client';

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
  const [isLoading, setIsLoading] = useState(false);

  const messages = activeSession?.messages ?? [];

  const handleSend = async (text: string, model: string) => {
    let currentMessages = messages;
    if (!activeSession) {
      createSession();
      currentMessages = [];
    }

    const userMsg: ChatMessage = { id: Date.now(), role: 'user', content: text };
    const tempMessages = [...currentMessages, userMsg];

    // Optimistically add user message
    const sessionId = activeSession ? activeSession.id : sessions[0]?.id;
    if (sessionId) {
      updateSessionMessages(sessionId, tempMessages);
    }

    // Call semantic search API
    setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    createSession('ノーマルチャットへようこそ。アップロードされた文書に対してセマンティック検索を行い回答します。何でもお気軽にどうぞ。');
  };

  return (
    <div className="page chat-page">
      <div className="page-header">
        <h2>ノーマルチャット</h2>
        <span className="page-badge">セマンティック検索AI</span>
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
      {isLoading && (
        <div className="chat-loading-bar">
          <div className="chat-loading-spinner" />
          <span>AIが検索・回答中...</span>
        </div>
      )}
    </div>
  );
}

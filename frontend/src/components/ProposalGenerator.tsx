import { useState } from 'react';
import ChatPanel, { ChatMessage } from './ChatPanel';
import { useSessionHistory } from '../hooks/useSessionHistory';
import { apiClient } from '../api/client';

export default function ProposalGenerator() {
  const {
    sessions,
    activeSession,
    activeSessionId,
    createSession,
    selectSession,
    updateSessionMessages,
    deleteSession,
  } = useSessionHistory('proposal');

  const [input, setInput] = useState('');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const messages = activeSession?.messages ?? [];

  // Chat uses semantic search
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
    createSession('企画書AI生成コーナーへようこそ。仕様や背景を伝えてください。実行ボタンで企画書を生成します。');
  };

  // Generate proposal PDF from chat context
  const handleGenerate = async () => {
    if (!activeSession || messages.length <= 1) return;

    setIsGenerating(true);
    try {
      const apiMessages = messages.map((m) => ({ role: m.role, content: m.content }));
      const blob = await apiClient.generateProposal(apiMessages);

      // Revoke previous URL to avoid memory leak
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);

      // Create object URL for PDF blob
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);

      // Add a message about the generation
      const resultMsg: ChatMessage = {
        id: Date.now(),
        role: 'assistant',
        content: '企画書を生成しました。右パネルでPDFを閲覧できます。',
      };
      updateSessionMessages(activeSession.id, [...messages, resultMsg]);
    } catch (e: unknown) {
      const errorMsg: ChatMessage = {
        id: Date.now(),
        role: 'assistant',
        content: `企画書生成でエラーが発生しました: ${e instanceof Error ? e.message : 'Unknown error'}`,
      };
      updateSessionMessages(activeSession.id, [...messages, errorMsg]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!pdfUrl) return;
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = 'proposal.pdf';
    a.click();
  };

  return (
    <div className="page split-page">
      <div className="page-header">
        <h2>企画書AI生成コーナー</h2>
        <span className="page-badge">学習済みAI</span>
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
            className="generate-button"
            onClick={handleGenerate}
            disabled={isGenerating || messages.length <= 1}
          >
            {isGenerating ? '企画書生成中...' : '企画書を生成'}
          </button>
        </div>
        <div className="split-right">
          <div className="file-panel">
            <div className="file-panel-header">
              <h3>生成された企画書</h3>
              {pdfUrl && <button className="download-btn" onClick={handleDownload}>ダウンロード</button>}
            </div>
            <div className="file-preview">
              {isGenerating ? (
                <div className="generating-indicator">
                  <div className="spinner" />
                  <p>企画書を生成中...</p>
                </div>
              ) : pdfUrl ? (
                <iframe
                  src={pdfUrl}
                  className="pdf-viewer"
                  title="企画書PDF"
                />
              ) : (
                <div className="empty-panel">
                  <p>左のチャットで仕様を伝え、<br />実行ボタンで企画書を生成</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

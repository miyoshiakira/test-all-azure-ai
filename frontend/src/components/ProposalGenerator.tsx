import { useState } from 'react';
import ChatPanel, { ChatMessage } from './ChatPanel';
import { useSessionHistory } from '../hooks/useSessionHistory';

const mockProposal = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        企 画 書
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【件名】新規プロジェクト提案

【目的】
社内業務効率化のためのAI導入プロジェクト

【背景】
現在、社内のドキュメント処理に多大な労力を要しており、
AI技術の活用により大幅な時間短縮が見込まれる。

【実施内容】
1. AIチャットシステムの導入
2. ドキュメント自動解析機能の実装
3. セマンティック検索の導入

【スケジュール】
- 第1四半期: 要件定義・設計
- 第2四半期: 開発・テスト
- 第3四半期: 試験運用
- 第4四半期: 本格運用開始

【予算】
総額: 5,000千円

【期待効果】
- 労働時間: 30%削減
- 処理精度: 95%以上
- コスト削減: 年間2,000千円

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

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
  const [generatedFile, setGeneratedFile] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

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
      content: `「${text}」についての企画書を作成する準備ができました。実行ボタンを押して生成を開始してください。`,
    };
    const newMessages = [...currentMessages, userMsg, botMsg];
    const sessionId = activeSession ? activeSession.id : sessions[0]?.id;
    if (sessionId) {
      updateSessionMessages(sessionId, newMessages);
    }
  };

  const handleCreate = () => {
    createSession('企画書AI生成コーナーへようこそ。仕様や背景を伝えてください。実行ボタンで企画書を生成します。');
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setGeneratedFile(mockProposal);
      setIsGenerating(false);
    }, 2000);
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
          <button
            className="generate-button"
            onClick={handleGenerate}
            disabled={isGenerating || messages.length <= 1}
          >
            {isGenerating ? '生成中...' : '企画書を生成'}
          </button>
        </div>
        <div className="split-right">
          <div className="file-panel">
            <div className="file-panel-header">
              <h3>生成された企画書</h3>
              {generatedFile && <button className="download-btn">ダウンロード</button>}
            </div>
            <div className="file-preview">
              {isGenerating ? (
                <div className="generating-indicator">
                  <div className="spinner" />
                  <p>企画書を生成中...</p>
                </div>
              ) : generatedFile ? (
                <pre className="file-content">{generatedFile}</pre>
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

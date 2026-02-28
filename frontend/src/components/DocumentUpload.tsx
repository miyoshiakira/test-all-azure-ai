import { useState, useRef, useCallback } from 'react';
import { apiClient, Document } from '../api/client';

export function DocumentUpload() {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const result = await apiClient.listDocuments();
      setDocuments(result.documents);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ドキュメントの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (file: File) => {
    setUploading(true);
    setError(null);
    setSuccess(null);
    setUploadProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 10, 90));
    }, 200);

    try {
      await apiClient.uploadDocument(file);
      setUploadProgress(100);
      setSuccess(`「${file.name}」のアップロードが完了しました！AIによるインデックス登録も完了。`);
      loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'アップロードに失敗しました');
    } finally {
      clearInterval(progressInterval);
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragging(false);
  }, []);

  const handleDelete = async (fileName: string) => {
    if (!confirm(`「${fileName}」を削除しますか？`)) return;

    try {
      await apiClient.deleteDocument(fileName);
      setSuccess(`「${fileName}」を削除しました`);
      loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除に失敗しました');
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '不明';
    const date = new Date(dateStr);
    return date.toLocaleString('ja-JP');
  };

  const handleReindex = async () => {
    if (!confirm('全ファイルを再インデックスします。\nインデックスが未作成の場合は自動作成されます。\n\n実行しますか？')) return;

    setReindexing(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await apiClient.reindexAll();
      setSuccess(`再インデックス完了！ ${result.indexed}/${result.total} ファイルを処理しました`);
      loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : '再インデックスに失敗しました');
    } finally {
      setReindexing(false);
    }
  };

  return (
    <div className="fade-in">
      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div
        className={`upload-area ${dragging ? 'dragging' : ''}`}
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleInputChange}
          disabled={uploading}
        />
        {uploading ? (
          <div>
            <div className="loading-spinner"></div>
            <h3>AIが処理中...</h3>
            <p>ファイルをアップロード＆インデックス登録しています</p>
            {uploadProgress > 0 && (
              <div className="progress-bar" style={{ marginTop: '20px' }}>
                <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }}></div>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="upload-icon">🚀</div>
            <h3>ファイルをドロップまたはクリック</h3>
            <p>あらゆる形式のファイルをAIが自動分析します</p>
            <p style={{ marginTop: '10px', fontSize: '12px', opacity: 0.7 }}>
              PDF / Word / Excel / テキスト / 画像 など
            </p>
          </>
        )}
      </div>

      <div className="documents-section">
        <div className="section-header">
          <h3>📂 アップロード済みファイル</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-primary btn-sm" onClick={handleReindex} disabled={reindexing}>
              {reindexing ? '⏳ 処理中...' : '⚡ 再インデックス'}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={loadDocuments} disabled={loading}>
              {loading ? '読込中...' : '📋 一覧更新'}
            </button>
          </div>
        </div>

        <div className="documents-list">
          {documents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
              <div style={{ fontSize: '48px', marginBottom: '15px', opacity: 0.5 }}>📭</div>
              <p>まだファイルがありません</p>
              <p style={{ fontSize: '13px', marginTop: '8px' }}>上のエリアからファイルをアップロードしてください</p>
            </div>
          ) : (
            documents.map((doc, index) => (
              <div
                key={doc.name}
                className="document-item"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div>
                  <div className="name">📄 {doc.name}</div>
                  <div className="meta">
                    {formatSize(doc.size)} • {formatDate(doc.last_modified)}
                  </div>
                </div>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(doc.name)}>
                  🗑️ 削除
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

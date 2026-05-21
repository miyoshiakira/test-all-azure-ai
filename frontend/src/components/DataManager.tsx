import { useState, useEffect, useRef } from 'react';
import { apiClient, Document, UploadResult } from '../api/client';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function DataManager() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await apiClient.listDocuments();
      setDocuments(res.documents);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadResult(null);
    setError(null);
    try {
      const result = await apiClient.uploadDocument(file);
      setUploadResult(result);
      await fetchDocuments();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (fileName: string) => {
    if (!confirm(`「${fileName}」を削除しますか？\nインデックスからも削除されます。`)) return;
    try {
      await apiClient.deleteDocument(fileName);
      await fetchDocuments();
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  return (
    <div className="page data-manager">
      <div className="page-header">
        <h2>データ管理</h2>
        <span className="page-badge">ファイル &amp; インデックス</span>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Upload area */}
      <div className="upload-section">
        <div className="upload-area">
          <input
            ref={fileInputRef}
            type="file"
            className="upload-input"
            accept=".pdf,.pptx,.ppt,.docx,.doc,.xlsx,.xls,.txt,.md,.csv,.json"
          />
          <button
            className="upload-btn"
            onClick={handleUpload}
            disabled={uploading}
          >
            {uploading ? 'アップロード & インデックス中...' : 'アップロード'}
          </button>
        </div>
        <p className="upload-hint">
          対応形式: PDF, PowerPoint, Word, Excel, TXT, Markdown, CSV, JSON
          &nbsp;/&nbsp; アップロード時に自動でインデックス（埋め込み）されます
        </p>
      </div>

      {/* Upload result */}
      {uploadResult && (
        <div className="upload-result">
          <div className="upload-result-header">
            <span className="upload-result-title">
              {uploadResult.file_name} ({uploadResult.file_type})
            </span>
            <span className={`upload-result-status${uploadResult.indexed_chunks === uploadResult.total_chunks ? ' success' : ''}`}>
              {uploadResult.indexed_chunks}/{uploadResult.total_chunks} チャンクインデックス済み
            </span>
          </div>
          <div className="upload-chunks">
            {uploadResult.chunks.map((chunk, i) => (
              <div key={i} className={`chunk-item${chunk.status === 'error' ? ' error' : ''}`}>
                <span className="chunk-id">{chunk.chunk_id}</span>
                <span className="chunk-title">{chunk.title || '-'}</span>
                <span className="chunk-category">{chunk.category || '-'}</span>
                <span className="chunk-status">{chunk.status === 'indexed' ? `${chunk.chars}文字` : chunk.error}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Document list */}
      <div className="doc-list-section">
        <div className="doc-list-header">
          <h3>ファイル一覧</h3>
          <button className="refresh-btn" onClick={fetchDocuments} disabled={loading}>
            更新
          </button>
        </div>

        {loading ? (
          <div className="loading-indicator">読み込み中...</div>
        ) : documents.length === 0 ? (
          <div className="empty-docs">ファイルがありません。アップロードしてください。</div>
        ) : (
          <div className="doc-table-wrapper">
            <table className="doc-table">
              <thead>
                <tr>
                  <th>ファイル名</th>
                  <th>サイズ</th>
                  <th>更新日時</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.name}>
                    <td className="doc-name">{doc.name}</td>
                    <td>{formatSize(doc.size)}</td>
                    <td>{formatDate(doc.last_modified)}</td>
                    <td>
                      <button
                        className="delete-btn"
                        onClick={() => handleDelete(doc.name)}
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

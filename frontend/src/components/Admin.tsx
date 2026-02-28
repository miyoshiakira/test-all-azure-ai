import { useState } from 'react';
import { apiClient } from '../api/client';

export function Admin() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleAuth = async () => {
    if (!password.trim()) {
      setError('パスワードを入力してください');
      return;
    }

    setLoading('auth');
    setError(null);

    try {
      await apiClient.adminAuth(password);
      setIsAuthenticated(true);
      setSuccess('認証成功');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('パスワードが正しくありません');
      setIsAuthenticated(false);
    } finally {
      setLoading(null);
    }
  };

  const handleClearSearch = async () => {
    if (!confirm('ベクトルDB（Azure AI Search）の全データを削除しますか？\nこの操作は取り消せません。')) {
      return;
    }

    setLoading('search');
    setError(null);
    setSuccess(null);

    try {
      const result = await apiClient.clearSearch(password);
      setSuccess(`ベクトルDBをクリアしました（インデックス: ${result.index_name}）`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'クリアに失敗しました');
    } finally {
      setLoading(null);
    }
  };

  const handleClearStorage = async () => {
    if (!confirm('Blob Storage（S3相当）の全ファイルを削除しますか？\nこの操作は取り消せません。')) {
      return;
    }

    setLoading('storage');
    setError(null);
    setSuccess(null);

    try {
      const result = await apiClient.clearStorage(password);
      setSuccess(`ストレージをクリアしました（削除ファイル数: ${result.deleted_count}）`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'クリアに失敗しました');
    } finally {
      setLoading(null);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('ベクトルDBとストレージの両方を削除しますか？\nこの操作は取り消せません。')) {
      return;
    }

    setLoading('all');
    setError(null);
    setSuccess(null);

    try {
      await apiClient.clearSearch(password);
      const storageResult = await apiClient.clearStorage(password);
      setSuccess(`全データをクリアしました（削除ファイル数: ${storageResult.deleted_count}）`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'クリアに失敗しました');
    } finally {
      setLoading(null);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPassword('');
    setError(null);
    setSuccess(null);
  };

  if (!isAuthenticated) {
    return (
      <div className="admin-container">
        <div className="admin-login">
          <div className="admin-icon">
            <span>🔐</span>
          </div>
          <h3>管理者認証</h3>
          <p>管理機能にアクセスするにはパスワードを入力してください</p>

          {error && <div className="error">{error}</div>}

          <div className="admin-form">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワード"
              onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
              disabled={loading === 'auth'}
            />
            <button
              className="btn btn-primary"
              onClick={handleAuth}
              disabled={loading === 'auth'}
            >
              {loading === 'auth' ? '認証中...' : 'ログイン'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h3>管理者パネル</h3>
        <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
          ログアウト
        </button>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div className="admin-section">
        <h4>データクリア</h4>
        <p className="admin-warning">
          以下の操作は取り消すことができません。実行前に十分ご確認ください。
        </p>

        <div className="admin-actions">
          <div className="admin-action-card">
            <div className="action-icon">🔍</div>
            <div className="action-info">
              <h5>ベクトルDB クリア</h5>
              <p>Azure AI Searchのインデックスを削除し、再作成します</p>
            </div>
            <button
              className="btn btn-danger"
              onClick={handleClearSearch}
              disabled={loading !== null}
            >
              {loading === 'search' ? '処理中...' : 'クリア'}
            </button>
          </div>

          <div className="admin-action-card">
            <div className="action-icon">📦</div>
            <div className="action-info">
              <h5>ストレージ クリア</h5>
              <p>Azure Blob Storage内の全ファイルを削除します</p>
            </div>
            <button
              className="btn btn-danger"
              onClick={handleClearStorage}
              disabled={loading !== null}
            >
              {loading === 'storage' ? '処理中...' : 'クリア'}
            </button>
          </div>

          <div className="admin-action-card all-clear">
            <div className="action-icon">⚠️</div>
            <div className="action-info">
              <h5>全データ クリア</h5>
              <p>ベクトルDBとストレージの両方を削除します</p>
            </div>
            <button
              className="btn btn-danger"
              onClick={handleClearAll}
              disabled={loading !== null}
            >
              {loading === 'all' ? '処理中...' : '全削除'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

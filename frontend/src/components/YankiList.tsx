import { useState, useEffect } from 'react';
import { apiClient, Yanki } from '../api/client';

export function YankiList() {
  const [yankis, setYankis] = useState<Yanki[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const fetchYankis = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.listYankis();
      setYankis(response.yankis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ヤンキー情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchYankis();
  }, []);

  const handleDelete = async (userId: number, userName: string) => {
    if (!confirm(`${userName} を削除しますか？`)) return;

    setDeleting(userId);
    try {
      await apiClient.deleteYanki(userId);
      setYankis(prev => prev.filter(y => y.user_id !== userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除に失敗しました');
    } finally {
      setDeleting(null);
    }
  };

  const getPowerLevel = (power: number): { label: string; color: string } => {
    if (power >= 10000) return { label: '超戦闘力', color: '#ff0000' };
    if (power >= 8000) return { label: '高戦闘力', color: '#ff6600' };
    if (power >= 5000) return { label: '中戦闘力', color: '#ffaa00' };
    if (power >= 2000) return { label: '低戦闘力', color: '#00aa00' };
    return { label: '見習い', color: '#666666' };
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="yanki-list-container fade-in">
        <div className="loading-state">
          <div className="thinking-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <p>ヤンキー情報を読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="yanki-list-container fade-in">
      <div className="yanki-header">
        <h2>🔥 ヤンキー確認</h2>
        <button className="btn btn-secondary btn-sm" onClick={fetchYankis}>
          🔄 更新
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {yankis.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👤</div>
          <h3>登録されたヤンキーはいません</h3>
          <p>チャットで「〇〇を戦闘力XXXXで登録して」と言ってください</p>
        </div>
      ) : (
        <>
          <div className="yanki-stats">
            <div className="stat-item">
              <span className="stat-label">総員</span>
              <span className="stat-value">{yankis.length}人</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">最強戦闘力</span>
              <span className="stat-value">{Math.max(...yankis.map(y => y.attack_power)).toLocaleString()}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">平均戦闘力</span>
              <span className="stat-value">
                {Math.round(yankis.reduce((sum, y) => sum + y.attack_power, 0) / yankis.length).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="yanki-table-wrapper">
            <table className="yanki-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>名前</th>
                  <th>戦闘力</th>
                  <th>レベル</th>
                  <th>備考</th>
                  <th>登録日時</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {yankis.map((yanki) => {
                  const powerLevel = getPowerLevel(yanki.attack_power);
                  return (
                    <tr key={yanki.user_id}>
                      <td className="id-cell">{yanki.user_id}</td>
                      <td className="name-cell">{yanki.user_name}</td>
                      <td className="power-cell">
                        <span className="power-value">{yanki.attack_power.toLocaleString()}</span>
                      </td>
                      <td>
                        <span
                          className="power-badge"
                          style={{ backgroundColor: powerLevel.color }}
                        >
                          {powerLevel.label}
                        </span>
                      </td>
                      <td className="others-cell">{yanki.others || '-'}</td>
                      <td className="date-cell">{formatDate(yanki.created_at)}</td>
                      <td>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(yanki.user_id, yanki.user_name)}
                          disabled={deleting === yanki.user_id}
                        >
                          {deleting === yanki.user_id ? '...' : '🗑️'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

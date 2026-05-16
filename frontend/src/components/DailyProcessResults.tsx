import { useState } from 'react';

interface ProcessResult {
  id: number;
  type: '伝票' | '請求書' | '領収書' | '注文書';
  fileName: string;
  status: 'success' | 'warning' | 'error';
  processedAt: string;
  details: string;
}

const mockResults: ProcessResult[] = [
  { id: 1, type: '伝票', fileName: '伝票_20260615_001.pdf', status: 'success', processedAt: '2026-06-15 09:15:32', details: '金額: ¥125,000 / 取引先: 株式会社A / 正常処理' },
  { id: 2, type: '請求書', fileName: '請求書_20260615_002.pdf', status: 'success', processedAt: '2026-06-15 09:16:45', details: '金額: ¥350,000 / 取引先: 株式会社B / 正常処理' },
  { id: 3, type: '領収書', fileName: '領収書_20260615_003.pdf', status: 'warning', processedAt: '2026-06-15 09:18:12', details: '金額: ¥48,000 / 金額不一致の可能性あり / 要確認' },
  { id: 4, type: '注文書', fileName: '注文書_20260615_004.pdf', status: 'success', processedAt: '2026-06-15 09:20:05', details: '金額: ¥220,000 / 取引先: 株式会社C / 正常処理' },
  { id: 5, type: '伝票', fileName: '伝票_20260615_005.pdf', status: 'error', processedAt: '2026-06-15 09:22:33', details: '読み取りエラー / ファイル破損の可能性 / 再処理必要' },
  { id: 6, type: '請求書', fileName: '請求書_20260615_006.pdf', status: 'success', processedAt: '2026-06-15 09:25:10', details: '金額: ¥180,000 / 取引先: 株式会社D / 正常処理' },
  { id: 7, type: '領収書', fileName: '領収書_20260615_007.pdf', status: 'success', processedAt: '2026-06-15 09:27:44', details: '金額: ¥95,000 / 取引先: 株式会社E / 正常処理' },
  { id: 8, type: '注文書', fileName: '注文書_20260615_008.pdf', status: 'warning', processedAt: '2026-06-15 09:30:18', details: '金額: ¥410,000 / 承認印なし / 要確認' },
];

const statusLabels: Record<string, string> = {
  success: '正常',
  warning: '要確認',
  error: 'エラー',
};

export default function DailyProcessResults() {
  const [filter, setFilter] = useState<string>('all');

  const filtered = filter === 'all' ? mockResults : mockResults.filter((r) => r.status === filter);
  const successCount = mockResults.filter((r) => r.status === 'success').length;
  const warningCount = mockResults.filter((r) => r.status === 'warning').length;
  const errorCount = mockResults.filter((r) => r.status === 'error').length;

  return (
    <div className="page daily-page">
      <div className="page-header">
        <h2>日次処理結果確認</h2>
        <span className="page-date">2026年6月15日</span>
      </div>

      <div className="result-summary">
        <div className="summary-item success">
          <span className="summary-count">{successCount}</span>
          <span className="summary-label">正常処理</span>
        </div>
        <div className="summary-item warning">
          <span className="summary-count">{warningCount}</span>
          <span className="summary-label">要確認</span>
        </div>
        <div className="summary-item error">
          <span className="summary-count">{errorCount}</span>
          <span className="summary-label">エラー</span>
        </div>
        <div className="summary-item total">
          <span className="summary-count">{mockResults.length}</span>
          <span className="summary-label">合計</span>
        </div>
      </div>

      <div className="filter-bar">
        {['all', 'success', 'warning', 'error'].map((f) => (
          <button
            key={f}
            className={`filter-btn${filter === f ? ' active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'すべて' : statusLabels[f]}
          </button>
        ))}
      </div>

      <div className="results-table-wrapper">
        <table className="results-table">
          <thead>
            <tr>
              <th>種別</th>
              <th>ファイル名</th>
              <th>ステータス</th>
              <th>処理日時</th>
              <th>詳細</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className={`status-${r.status}`}>
                <td><span className="type-badge">{r.type}</span></td>
                <td>{r.fileName}</td>
                <td>{statusLabels[r.status]}</td>
                <td className="mono">{r.processedAt}</td>
                <td>{r.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { apiClient, Employee } from '../api/client';

export function EmployeeList() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const fetchEmployees = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.listEmployees();
      setEmployees(response.employees);
    } catch (err) {
      setError(err instanceof Error ? err.message : '社員情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleDelete = async (userId: number, userName: string) => {
    if (!confirm(`${userName} を削除しますか？`)) return;

    setDeleting(userId);
    try {
      await apiClient.deleteEmployee(userId);
      setEmployees(prev => prev.filter(e => e.user_id !== userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除に失敗しました');
    } finally {
      setDeleting(null);
    }
  };

  const getGradeLevel = (grade: number): { label: string; color: string } => {
    if (grade >= 10000) return { label: '役員クラス', color: '#1e40af' };
    if (grade >= 8000) return { label: '部長クラス', color: '#3b82f6' };
    if (grade >= 5000) return { label: '課長クラス', color: '#06b6d4' };
    if (grade >= 2000) return { label: '主任クラス', color: '#10b981' };
    return { label: '一般', color: '#64748b' };
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
      <div className="employee-list-container fade-in">
        <div className="loading-state">
          <div className="thinking-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <p>社員情報を読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="employee-list-container fade-in">
      <div className="employee-header">
        <h2>社員一覧</h2>
        <button className="btn btn-secondary btn-sm" onClick={fetchEmployees}>
          更新
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {employees.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👤</div>
          <h3>登録された社員はいません</h3>
          <p>チャットで「〇〇をグレードXXXXで登録して」と入力してください</p>
        </div>
      ) : (
        <>
          <div className="employee-stats">
            <div className="stat-item">
              <span className="stat-label">総員</span>
              <span className="stat-value">{employees.length}人</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">最高グレード</span>
              <span className="stat-value">{Math.max(...employees.map(e => e.grade)).toLocaleString()}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">平均グレード</span>
              <span className="stat-value">
                {Math.round(employees.reduce((sum, e) => sum + e.grade, 0) / employees.length).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="employee-table-wrapper">
            <table className="employee-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>氏名</th>
                  <th>グレード</th>
                  <th>役職</th>
                  <th>備考</th>
                  <th>登録日時</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => {
                  const gradeLevel = getGradeLevel(employee.grade);
                  return (
                    <tr key={employee.user_id}>
                      <td className="id-cell">{employee.user_id}</td>
                      <td className="name-cell">{employee.user_name}</td>
                      <td className="grade-cell">
                        <span className="grade-value">{employee.grade.toLocaleString()}</span>
                      </td>
                      <td>
                        <span
                          className="grade-badge"
                          style={{ backgroundColor: gradeLevel.color }}
                        >
                          {gradeLevel.label}
                        </span>
                      </td>
                      <td className="others-cell">{employee.others || '-'}</td>
                      <td className="date-cell">{formatDate(employee.created_at)}</td>
                      <td>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(employee.user_id, employee.user_name)}
                          disabled={deleting === employee.user_id}
                        >
                          {deleting === employee.user_id ? '...' : '削除'}
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

import os
import pyodbc
from typing import List, Optional, Dict, Any


class EmployeeService:
    """社員情報のCRUD操作を行うサービス

    注: DBテーブル名は 'employees'、カラム名は 'grade' のまま使用
    （UI上は「社員」「グレード」として表示）
    """

    def __init__(self):
        self.server = os.getenv("AZURE_SQL_SERVER")
        self.database = os.getenv("AZURE_SQL_DATABASE", "test-all-ai")
        self.username = os.getenv("AZURE_SQL_USERNAME")
        self.password = os.getenv("AZURE_SQL_PASSWORD")
        self._connection_string = None

    @property
    def connection_string(self) -> str:
        if self._connection_string is None:
            if not all([self.server, self.username, self.password]):
                raise Exception("Azure SQL Database is not configured")
            self._connection_string = (
                f"DRIVER={{ODBC Driver 18 for SQL Server}};"
                f"SERVER={self.server};"
                f"DATABASE={self.database};"
                f"UID={self.username};"
                f"PWD={self.password};"
                f"Encrypt=yes;"
                f"TrustServerCertificate=no;"
            )
        return self._connection_string

    def _get_connection(self):
        """データベース接続を取得"""
        return pyodbc.connect(self.connection_string)

    def register_employee(
        self,
        user_name: str,
        grade: int,
        others: Optional[str] = None
    ) -> Dict[str, Any]:
        """新規社員を登録"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    """
                    INSERT INTO employees (user_name, grade, others)
                    OUTPUT INSERTED.user_id, INSERTED.user_name, INSERTED.grade, INSERTED.others, INSERTED.created_at
                    VALUES (?, ?, ?)
                    """,
                    (user_name, grade, others)
                )
                row = cursor.fetchone()
                conn.commit()

                return {
                    "success": True,
                    "user_id": row[0],
                    "user_name": row[1],
                    "grade": row[2],
                    "others": row[3],
                    "created_at": str(row[4]) if row[4] else None,
                    "message": f"社員「{user_name}」を登録しました。グレード: {grade}"
                }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "message": f"登録に失敗しました: {str(e)}"
            }

    def get_all_employees(self) -> List[Dict[str, Any]]:
        """全社員情報を取得"""
        try:
            print("[DEBUG] get_all_employees called")
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    """
                    SELECT user_id, user_name, grade, others, created_at, updated_at
                    FROM employees
                    ORDER BY grade DESC
                    """
                )
                rows = cursor.fetchall()
                print(f"[DEBUG] Found {len(rows)} employees")

                result = [
                    {
                        "user_id": row[0],
                        "user_name": row[1],
                        "grade": row[2],
                        "others": row[3],
                        "created_at": str(row[4]) if row[4] else None,
                        "updated_at": str(row[5]) if row[5] else None
                    }
                    for row in rows
                ]
                print(f"[DEBUG] Returning: {result}")
                return result
        except Exception as e:
            print(f"[ERROR] Failed to get employees: {e}")
            import traceback
            traceback.print_exc()
            return []

    def get_employee_by_id(self, user_id: int) -> Optional[Dict[str, Any]]:
        """IDで社員情報を取得"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    """
                    SELECT user_id, user_name, grade, others, created_at, updated_at
                    FROM employees
                    WHERE user_id = ?
                    """,
                    (user_id,)
                )
                row = cursor.fetchone()

                if row:
                    return {
                        "user_id": row[0],
                        "user_name": row[1],
                        "grade": row[2],
                        "others": row[3],
                        "created_at": str(row[4]) if row[4] else None,
                        "updated_at": str(row[5]) if row[5] else None
                    }
                return None
        except Exception as e:
            print(f"[ERROR] Failed to get employee: {e}")
            return None

    def delete_employee(self, user_id: int) -> bool:
        """社員を削除"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM employees WHERE user_id = ?", (user_id,))
                deleted = cursor.rowcount > 0
                conn.commit()
                return deleted
        except Exception as e:
            print(f"[ERROR] Failed to delete employee: {e}")
            return False

    def delete_employee_for_tool(
        self,
        user_id: Optional[int] = None,
        user_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """ツール用: 社員を削除（IDまたは名前で指定）"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()

                # IDが指定されている場合
                if user_id is not None:
                    # まず対象の社員情報を取得
                    cursor.execute(
                        "SELECT user_id, user_name, grade FROM employees WHERE user_id = ?",
                        (user_id,)
                    )
                    row = cursor.fetchone()
                    if not row:
                        return {
                            "success": False,
                            "message": f"ID: {user_id} の社員は見つかりませんでした"
                        }

                    # 削除実行
                    cursor.execute("DELETE FROM employees WHERE user_id = ?", (user_id,))
                    conn.commit()

                    return {
                        "success": True,
                        "deleted_user_id": row[0],
                        "deleted_user_name": row[1],
                        "deleted_grade": row[2],
                        "message": f"社員「{row[1]}」（ID: {row[0]}、グレード: {row[2]}）を削除しました"
                    }

                # 名前が指定されている場合
                elif user_name is not None:
                    # 名前で検索
                    cursor.execute(
                        "SELECT user_id, user_name, grade FROM employees WHERE user_name LIKE ?",
                        (f"%{user_name}%",)
                    )
                    rows = cursor.fetchall()

                    if not rows:
                        return {
                            "success": False,
                            "message": f"「{user_name}」に該当する社員は見つかりませんでした"
                        }

                    if len(rows) > 1:
                        # 複数の候補がある場合は確認を促す
                        candidates = [
                            {"user_id": r[0], "user_name": r[1], "grade": r[2]}
                            for r in rows
                        ]
                        return {
                            "success": False,
                            "message": f"「{user_name}」に該当する社員が{len(rows)}人います。IDを指定して削除してください。",
                            "candidates": candidates
                        }

                    # 1件のみの場合は削除
                    row = rows[0]
                    cursor.execute("DELETE FROM employees WHERE user_id = ?", (row[0],))
                    conn.commit()

                    return {
                        "success": True,
                        "deleted_user_id": row[0],
                        "deleted_user_name": row[1],
                        "deleted_grade": row[2],
                        "message": f"社員「{row[1]}」（ID: {row[0]}、グレード: {row[2]}）を削除しました"
                    }

                else:
                    return {
                        "success": False,
                        "message": "削除する社員のIDまたは名前を指定してください"
                    }

        except Exception as e:
            print(f"[ERROR] Failed to delete employee: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": f"削除に失敗しました: {str(e)}"
            }

    def get_employees_for_tool(
        self,
        limit: int = 10,
        sort_order: str = "desc"
    ) -> Dict[str, Any]:
        """ツール用: 社員一覧を取得（ソート・人数指定可能）"""
        try:
            # ソート順を決定
            order = "DESC" if sort_order.lower() == "desc" else "ASC"

            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    f"""
                    SELECT TOP (?) user_id, user_name, grade, others
                    FROM employees
                    ORDER BY grade {order}
                    """,
                    (limit,)
                )
                rows = cursor.fetchall()

                # 総件数を取得
                cursor.execute("SELECT COUNT(*) FROM employees")
                total_count = cursor.fetchone()[0]

                employees = [
                    {
                        "user_id": row[0],
                        "user_name": row[1],
                        "grade": row[2],
                        "others": row[3]
                    }
                    for row in rows
                ]

                return {
                    "success": True,
                    "total_count": total_count,
                    "returned_count": len(employees),
                    "sort_order": sort_order,
                    "employees": employees,
                    "message": f"社員一覧を取得しました（{len(employees)}件 / 全{total_count}件、グレード{order}順）"
                }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "message": f"取得に失敗しました: {str(e)}",
                "employees": []
            }

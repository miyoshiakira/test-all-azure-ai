import os
import pyodbc
from typing import List, Optional, Dict, Any


class YankiService:
    """ヤンキー情報のCRUD操作を行うサービス"""

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

    def register_yanki(
        self,
        user_name: str,
        attack_power: int,
        others: Optional[str] = None
    ) -> Dict[str, Any]:
        """新規ヤンキーを登録"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    """
                    INSERT INTO yankis (user_name, attack_power, others)
                    OUTPUT INSERTED.user_id, INSERTED.user_name, INSERTED.attack_power, INSERTED.others, INSERTED.created_at
                    VALUES (?, ?, ?)
                    """,
                    (user_name, attack_power, others)
                )
                row = cursor.fetchone()
                conn.commit()

                return {
                    "success": True,
                    "user_id": row[0],
                    "user_name": row[1],
                    "attack_power": row[2],
                    "others": row[3],
                    "created_at": str(row[4]) if row[4] else None,
                    "message": f"ヤンキー「{user_name}」を登録しました！戦闘力: {attack_power}"
                }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "message": f"登録に失敗しました: {str(e)}"
            }

    def get_all_yankis(self) -> List[Dict[str, Any]]:
        """全ヤンキー情報を取得"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    """
                    SELECT user_id, user_name, attack_power, others, created_at, updated_at
                    FROM yankis
                    ORDER BY attack_power DESC
                    """
                )
                rows = cursor.fetchall()

                return [
                    {
                        "user_id": row[0],
                        "user_name": row[1],
                        "attack_power": row[2],
                        "others": row[3],
                        "created_at": str(row[4]) if row[4] else None,
                        "updated_at": str(row[5]) if row[5] else None
                    }
                    for row in rows
                ]
        except Exception as e:
            print(f"[ERROR] Failed to get yankis: {e}")
            return []

    def get_yanki_by_id(self, user_id: int) -> Optional[Dict[str, Any]]:
        """IDでヤンキー情報を取得"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    """
                    SELECT user_id, user_name, attack_power, others, created_at, updated_at
                    FROM yankis
                    WHERE user_id = ?
                    """,
                    (user_id,)
                )
                row = cursor.fetchone()

                if row:
                    return {
                        "user_id": row[0],
                        "user_name": row[1],
                        "attack_power": row[2],
                        "others": row[3],
                        "created_at": str(row[4]) if row[4] else None,
                        "updated_at": str(row[5]) if row[5] else None
                    }
                return None
        except Exception as e:
            print(f"[ERROR] Failed to get yanki: {e}")
            return None

    def delete_yanki(self, user_id: int) -> bool:
        """ヤンキーを削除"""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM yankis WHERE user_id = ?", (user_id,))
                deleted = cursor.rowcount > 0
                conn.commit()
                return deleted
        except Exception as e:
            print(f"[ERROR] Failed to delete yanki: {e}")
            return False

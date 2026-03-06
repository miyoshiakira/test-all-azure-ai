-- Azure SQL Database: test-all-ai
-- テーブル作成スクリプト

-- ヤンキー情報テーブル
CREATE TABLE yankis (
    user_id INT IDENTITY(1,1) PRIMARY KEY,
    user_name NVARCHAR(100) NOT NULL,
    attack_power INT NOT NULL DEFAULT 0,
    others NVARCHAR(500) NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

-- インデックス作成
CREATE INDEX IX_yankis_user_name ON yankis(user_name);
CREATE INDEX IX_yankis_attack_power ON yankis(attack_power DESC);

-- サンプルデータ（テスト用）
-- INSERT INTO yankis (user_name, attack_power, others) VALUES
--     (N'暴走太郎', 9500, N'地元最強のヤンキー'),
--     (N'喧嘩花子', 8800, N'レディース総長'),
--     (N'特攻隊長', 12000, N'伝説の番長');

#!/bin/bash

# --- 設定項目 ---
APP_NAME="test-all-ai-func"
BACKEND_DIR="backend"

# ログファイルの設定
LOG_FILE="logs/deploy_log_$(date +%Y%m%d_%H%M%S).log"

echo "🚀 デプロイを開始します: $APP_NAME" | tee -a $LOG_FILE
echo "📝 ログは $LOG_FILE に記録されます"

# 1. フォルダ移動の確認
if [ -d "$BACKEND_DIR" ]; then
    cd $BACKEND_DIR
else
    echo "❌ エラー: $BACKEND_DIR フォルダが見つかりません。" | tee -a ../$LOG_FILE
    exit 1
fi

# 2. Azureログイン状態の強制チェック
echo "🔑 Azureの認証状態を確認中..."
az account show > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "⚠️ ログインが必要です。ブラウザが開きます..."
    az login
fi

# 3. デプロイ実行（詳細ログを有効化し、タイムアウトを延長）
# --verbose をつけることで、どこで止まったか可視化します
echo "📦 リモートビルドを実行中（これには数分かかります）..."
# --no-build を指定して、ツール側の余計なチェックをスキップする
# バージョンチェックを無視する環境変数をセット（最重要）
export FUNC_PYTHON_SKIP_VERSION_CHECK=1

# 余計な --python フラグを消し、リモートビルドだけを命じる
func azure functionapp publish $APP_NAME --build remote --verbose 2>&1 | tee -a ../$LOG_FILE

# 4. 終了ステータスの判定
if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo "✅ デプロイが正常に終了しました！" | tee -a ../$LOG_FILE
else
    echo "❌ デプロイが途中で失敗しました。上記のログまたは $LOG_FILE を確認してください。" | tee -a ../$LOG_FILE
    
    # 失敗した時のヒントを表示
    echo "💡 ヒント: 'Running pip install' で止まる場合は、requirements.txt のライブラリ競合の可能性があります。"
fi
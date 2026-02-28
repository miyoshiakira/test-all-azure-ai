# クイックスタートガイド

このガイドでは、Azure RAGシステムを最速でセットアップして起動する手順を説明します。

## 📋 前提条件

- Python 3.9以上
- Node.js 18以上
- Azureアカウント
- Azure OpenAI Serviceへのアクセス権限

## 🚀 5分でセットアップ

### ステップ1: Azureリソースの作成（Azure Portal使用）

#### 1.1 Azure OpenAI Service

1. Azure Portalにログイン: https://portal.azure.com
2. 「リソースの作成」→「Azure OpenAI」で検索
3. 以下の設定で作成:
   - リソース名: 任意（例: `my-openai-service`）
   - リージョン: `East US` または `Japan East`
   - 価格レベル: `Standard S0`
4. 作成後、「キーとエンドポイント」からキーとエンドポイントをコピー

5. モデルをデプロイ:
   - 左メニュー「モデルデプロイ」→「Azure OpenAI Studio」
   - 「デプロイ」→「新しいデプロイ」
   - **GPT-4** をデプロイ（デプロイ名: `gpt-4`）
   - **text-embedding-ada-002** をデプロイ（デプロイ名: `text-embedding-ada-002`）

#### 1.2 Azure AI Search

1. Azure Portalで「リソースの作成」→「Azure AI Search」
2. 以下の設定で作成:
   - サービス名: 任意（例: `my-search-service`）
   - リージョン: OpenAIと同じ
   - 価格レベル: `Basic`（検証用）または `Standard`（本番用）
3. 作成後、「キー」から管理キーをコピー

#### 1.3 Azure Blob Storage（オプション）

現在のミニマム実装では不要ですが、将来的に大規模ファイル管理に使用できます。

### ステップ2: バックエンドのセットアップ

```bash
# プロジェクトディレクトリに移動
cd azure-rag-sample/backend

# 仮想環境作成（推奨）
python -m venv venv

# 仮想環境をアクティベート
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# 依存関係インストール
pip install -r requirements.txt

# 環境変数ファイル作成
cp .env.example .env

# .envファイルを編集（以下の値を設定）
# - AZURE_OPENAI_ENDPOINT
# - AZURE_OPENAI_API_KEY
# - AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4
# - AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-ada-002
# - AZURE_SEARCH_ENDPOINT
# - AZURE_SEARCH_API_KEY
# - AZURE_SEARCH_INDEX_NAME=documents-index
```

**重要な環境変数の例:**
```env
AZURE_OPENAI_ENDPOINT=https://my-openai-service.openai.azure.com/
AZURE_OPENAI_API_KEY=1234567890abcdef...
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-ada-002
AZURE_OPENAI_API_VERSION=2024-02-15-preview

AZURE_SEARCH_ENDPOINT=https://my-search-service.search.windows.net
AZURE_SEARCH_API_KEY=ABCDEF123456...
AZURE_SEARCH_INDEX_NAME=documents-index

# Storage は現在の実装では不要（後で追加可能）
AZURE_STORAGE_CONNECTION_STRING=optional
AZURE_STORAGE_CONTAINER_NAME=documents
```

### ステップ3: バックエンドの起動

```bash
# バックエンドディレクトリで実行
uvicorn app.main:app --reload

# 起動メッセージ:
# INFO:     Uvicorn running on http://127.0.0.1:8000
# ✅ Azure AI Searchインデックスを確認/作成しました
```

ブラウザで http://localhost:8000/docs にアクセスして、API ドキュメントを確認できます。

### ステップ4: フロントエンドのセットアップ

**新しいターミナルウィンドウを開いて:**

```bash
cd azure-rag-sample/frontend

# 依存関係インストール
npm install

# 環境変数ファイル作成
cp .env.example .env

# .envファイルを編集（通常はデフォルトでOK）
# VITE_API_BASE_URL=http://localhost:8000

# 開発サーバー起動
npm run dev
```

### ステップ5: アプリケーションを開く

ブラウザで http://localhost:3000 にアクセス

## 🎉 動作確認

1. **ヘルスチェック**: ヘッダーのステータスが「正常」になっていることを確認
2. **ドキュメントアップロード**: サンプルのPDFやTXTファイルをアップロード
3. **チャット**: 「アップロードしたドキュメントについて教えて」と質問

## 🔧 トラブルシューティング

### バックエンドが起動しない

**症状**: モジュールが見つからないエラー
```bash
# 仮想環境がアクティブか確認
which python  # Mac/Linux
where python  # Windows

# 再インストール
pip install -r requirements.txt --upgrade
```

**症状**: Azure接続エラー
- `.env`ファイルの内容を確認
- エンドポイントURLの末尾に `/` があるか確認
- APIキーが正しいか確認（Azure Portalで再確認）

### フロントエンドが起動しない

```bash
# node_modulesを削除して再インストール
rm -rf node_modules package-lock.json
npm install
```

### インデックス作成エラー

Azure AI Searchのリージョンとプランを確認:
- Basicプラン以上が必要
- ベクトル検索をサポートするリージョンを使用

## 📊 初期テスト用サンプルドキュメント

テスト用に以下のようなサンプルファイルを作成してアップロードしてみてください:

**sample.txt:**
```
社内プロジェクト報告書

プロジェクト名: 新製品開発
期間: 2024年1月〜3月
担当者: 山田太郎

概要:
本プロジェクトでは、AI技術を活用した新製品の開発を行いました。
主な成果として、以下の3点が挙げられます。

1. 顧客満足度を20%向上
2. 処理速度を50%改善
3. コストを30%削減

今後の展望:
次フェーズでは、さらなる機能拡張とグローバル展開を検討しています。
```

このドキュメントをアップロード後、以下の質問を試してください:
- 「プロジェクトの成果を教えて」
- 「担当者は誰ですか？」
- 「今後の展望について詳しく」

## 💰 コスト管理

**開発・検証フェーズの推奨設定:**
- Azure OpenAI: 従量課金（使った分だけ）
- Azure AI Search: Basic（月額約12,000円）

**コスト削減のヒント:**
- 使わない時はAzure AI SearchをBasicからFreeにダウングレード（検証時のみ）
- Azure OpenAIはTPM（トークン/分）制限を設定
- 開発完了後は不要なリソースを削除

## 📚 次のステップ

システムが動作したら、以下の拡張を検討できます:

1. **複数AIエージェント機能の追加**
2. **Slack連携**
3. **Azure AD認証**
4. **Docker化**
5. **本番環境デプロイ（Azure Container Apps）**

詳しくはメインのREADME.mdを参照してください。

## 🆘 サポート

問題が解決しない場合は、以下を確認してください:
- Azure Portal でリソースのステータス
- バックエンドのログ（ターミナル出力）
- ブラウザのコンソール（F12で開く）

# 社内検索AI

Azure AIを活用した社内ドキュメント検索・質問応答システム

## 機能

- **AIチャット**: 社内ドキュメントを参照した質問応答（RAG）
- **ドキュメント管理**: Azure Blob Storageへのファイルアップロード・管理
- **セマンティック検索**: Azure AI Searchによるベクトル検索 + フルテキスト検索

## アーキテクチャ

```
Frontend (React + Vite)
    │
    ▼
Backend (FastAPI + uvicorn)
    │
    ├── Azure Blob Storage (ドキュメント保存)
    ├── Azure OpenAI (GPT-4o / text-embedding-ada-002)
    └── Azure AI Search (ベクトルインデックス)
```

## クイックスタート（推奨）

### ワンクリック起動

プロジェクトルートの `dev.bat` をダブルクリックするだけで、フロントエンドとバックエンドが同時に起動します。

```
dev.bat          # 初回起動（依存関係インストール込み）
dev-quick.bat    # クイック起動（インストール済みの場合）
dev-stop.bat     # サーバー停止
```

起動後、自動的にブラウザが開きます:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:7071

---

## 手動セットアップ

### 必要条件

- Python 3.9+
- Node.js 18+

### バックエンド

1. 依存関係のインストール

```bash
cd backend
pip install -r requirements.txt
```

2. 環境変数の設定

`.env` ファイルを編集して、Azure の接続情報を設定:

```env
# Azure OpenAI
AZURE_OPENAI_API_KEY=your-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_MODEL=gpt-4o
AZURE_OPENAI_EMBEDDING_MODEL=text-embedding-ada-002

# Azure Search
AZURE_SEARCH_ENDPOINT=https://your-search.search.windows.net
AZURE_SEARCH_API_KEY=your-key
AZURE_SEARCH_INDEX_NAME=documents-index

# Azure Blob Storage
AZURE_STORAGE_CONNECTION_STRING=your-connection-string
AZURE_STORAGE_CONTAINER_NAME=documents
```

3. サーバー起動

```bash
# Windows
start.bat

# または直接実行
python main.py
```

バックエンドは http://localhost:7071 で起動します。

### フロントエンド

1. 依存関係のインストール

```bash
cd frontend
npm install
```

2. 開発サーバーの起動

```bash
npm run dev
```

フロントエンドは http://localhost:3000 で起動します。

## API エンドポイント

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/health | ヘルスチェック |
| POST | /api/documents/upload | ドキュメントアップロード |
| GET | /api/documents | ドキュメント一覧取得 |
| DELETE | /api/documents/{name} | ドキュメント削除 |
| POST | /api/search | ドキュメント検索 |
| POST | /api/ai/chat | チャット |
| POST | /api/admin/create-index | 検索インデックス作成 |

## 初回セットアップ

Azure Search のインデックスを作成:

```bash
curl -X POST http://localhost:7071/api/admin/create-index
```

---

## デプロイ

### 必要条件

- Azure CLI (`az`)
- Azure Functions Core Tools (`func`)
- Azure サブスクリプション

### Azure リソース

デプロイ前に以下のAzureリソースが必要です:

| リソース | 用途 |
|---------|------|
| Resource Group | リソースグループ |
| Azure Functions | バックエンドAPI |
| Storage Account | フロントエンド静的ホスティング + ドキュメント保存 |
| Azure OpenAI | GPT-4o / text-embedding-ada-002 |
| Azure AI Search | ベクトル検索インデックス |

### デプロイ手順

```
deploy.bat           # フロントエンド + バックエンド 一括デプロイ
deploy-backend.bat   # バックエンドのみデプロイ
deploy-frontend.bat  # フロントエンドのみデプロイ
```

### 設定変更

デプロイ先を変更する場合は、各バッチファイル内の以下の変数を編集:

```batch
set "RESOURCE_GROUP=test-all-ai-rg"
set "FUNCTION_APP_NAME=test-all-ai-func"
set "STORAGE_ACCOUNT=testallai"
```

また、`frontend/.env.production` のAPIエンドポイントも更新:

```
VITE_API_BASE=https://your-function-app.azurewebsites.net/api
```

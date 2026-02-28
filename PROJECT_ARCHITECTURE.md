# test-all-azure-ai プロダクト構成資料

## 概要

**test-all-azure-ai** は、Azure AI サービスを活用したドキュメント分析・検索・チャットシステムです。
アップロードされたドキュメントをAIで解析し、セマンティック検索とRAG（Retrieval-Augmented Generation）を用いた対話型AIを提供します。

---

## 1. ディレクトリ構成

```
test-all-azure-ai/
├── backend/                    # バックエンドAPI
│   ├── services/               # サービス層
│   │   ├── __init__.py
│   │   ├── blob_service.py     # Azure Blob Storage操作
│   │   ├── openai_service.py   # Azure OpenAI連携
│   │   ├── search_service.py   # Azure AI Search連携
│   │   └── extractor_service.py # ドキュメントテキスト抽出
│   ├── main.py                 # FastAPIエントリポイント
│   ├── function_app.py         # Azure Functions用ラッパー
│   ├── requirements.txt        # Python依存関係
│   ├── .env                    # 環境変数（認証情報）
│   ├── local.settings.json     # Azure Functions設定
│   ├── host.json               # Azure Functionsホスト設定
│   ├── start.bat               # Windows起動スクリプト
│   └── start.sh                # Unix起動スクリプト
├── frontend/                   # フロントエンドUI
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts       # API通信クライアント
│   │   ├── components/
│   │   │   ├── Chat.tsx        # チャットコンポーネント
│   │   │   └── DocumentUpload.tsx # ファイルアップロード
│   │   ├── App.tsx             # メインアプリケーション
│   │   ├── main.tsx            # エントリポイント
│   │   └── index.css           # スタイルシート
│   ├── package.json            # Node.js依存関係
│   ├── vite.config.ts          # Vite設定
│   └── tsconfig.json           # TypeScript設定
├── testdata/                   # テストデータ
│   ├── testdata.pdf
│   └── testdata.pptx
├── .env.example                # 環境変数テンプレート
├── README.md
├── QUICKSTART.md
└── 構成プロンプト.txt
```

---

## 2. 使用技術スタック

### バックエンド

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | FastAPI |
| サーバー | uvicorn (ASGI) |
| 言語 | Python 3.9+ |
| デプロイ | Azure Functions |

### フロントエンド

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | React 18.2.0 |
| ビルドツール | Vite 5.0.0 |
| 言語 | TypeScript 5.3.0 |
| UI | カスタムCSS（ネオンテーマ） |

---

## 3. Azure AIサービス構成

### 3.1 Azure OpenAI Service

| 項目 | 値 |
|------|-----|
| エンドポイント | https://test-all-ai.openai.azure.com/ |
| APIバージョン | 2024-02-15-preview |
| チャットモデル | gpt-4o |
| 埋め込みモデル | text-embedding-ada-002 |

**用途:**
- チャット応答生成
- ドキュメント要約
- 質問応答
- ベクトル埋め込み生成（1536次元）

### 3.2 Azure AI Search

| 項目 | 値 |
|------|-----|
| エンドポイント | https://test-all-ai.search.windows.net |
| インデックス名 | documents-index |
| ベクトル次元 | 1536 |
| アルゴリズム | HNSW (Hierarchical Navigable Small World) |

**検索機能:**
- フルテキスト検索
- ベクトル類似度検索
- ハイブリッド検索（両方の組み合わせ）

**インデックススキーマ:**
```
id              : String (キー)
title           : String (検索可能)
content         : String (検索可能)
file_name       : String (フィルタ可能)
upload_date     : DateTimeOffset (フィルタ・ソート可能)
content_vector  : Vector (1536次元)
```

### 3.3 Azure Blob Storage

| 項目 | 値 |
|------|-----|
| ストレージアカウント | testallai |
| コンテナ名 | documents |
| 認証方式 | 接続文字列 |

**用途:**
- アップロードファイルの永続化
- 元ファイルの保存・取得

---

## 4. バックエンドサービス詳細

### 4.1 TextExtractor Service (`extractor_service.py`)

複数ファイル形式からテキストを抽出し、チャンク分割する。

**対応フォーマット:**
- PDF（ページ単位でチャンク）
- PowerPoint（スライド単位でチャンク）
- Word（セクション単位でチャンク）
- Excel（シート単位でチャンク）
- テキストファイル（文字数単位でチャンク）

**チャンク設定:**
- 最大2000文字/チャンク
- チャンクID・タイプ情報を付与

### 4.2 OpenAI Service (`openai_service.py`)

Azure OpenAI APIとの連携を担当。

**提供メソッド:**
- `generate_embeddings()` - テキスト埋め込み生成
- `summarize()` - テキスト要約
- `answer_question()` - コンテキスト付き質問応答
- `chat()` - 一般チャット

### 4.3 Search Service (`search_service.py`)

Azure AI Searchの管理・検索操作。

**機能:**
- インデックス作成・管理
- ドキュメントのインデックス登録
- フルテキスト検索
- ベクトル検索
- ハイブリッド検索

### 4.4 Blob Service (`blob_service.py`)

Azure Blob Storageのファイル操作。

**機能:**
- ファイルアップロード
- ファイル一覧取得
- ファイル取得
- ファイル削除

---

## 5. API エンドポイント一覧

| メソッド | エンドポイント | 説明 |
|---------|---------------|------|
| GET | `/api/health` | ヘルスチェック |
| POST | `/api/documents/upload` | ドキュメントアップロード・インデックス登録 |
| GET | `/api/documents` | ドキュメント一覧取得 |
| DELETE | `/api/documents/{name}` | ドキュメント削除 |
| POST | `/api/search` | フルテキスト/ベクトル検索 |
| POST | `/api/ai/chat` | チャット（RAG対応） |
| POST | `/api/ai/question` | コンテキスト付き質問応答 |
| POST | `/api/ai/summarize` | テキスト要約 |
| POST | `/api/admin/create-index` | 検索インデックス作成 |
| POST | `/api/admin/reindex-all` | 全ドキュメント再インデックス |

### リクエスト/レスポンスモデル

```typescript
// 検索リクエスト
SearchRequest {
  query: string
  use_vector: boolean
  top: number
}

// チャットリクエスト
ChatRequest {
  messages: ChatMessage[]
  use_search: boolean
}

// チャットメッセージ
ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// 質問リクエスト
QuestionRequest {
  question: string
  context?: string
}

// 要約リクエスト
SummarizeRequest {
  text: string
  max_length: number
}
```

---

## 6. フロントエンドコンポーネント

### 6.1 App Component (`App.tsx`)

メインアプリケーションコンテナ。タブナビゲーション（Upload / Chat）を提供。

### 6.2 DocumentUpload Component (`DocumentUpload.tsx`)

- ドラッグ&ドロップ対応ファイルアップロード
- ドキュメント一覧表示
- ファイル削除機能
- 再インデックス機能
- アップロード進捗表示

### 6.3 Chat Component (`Chat.tsx`)

- 対話型AIインターフェース
- RAG（ドキュメント検索）トグル
- メッセージ履歴表示
- 自動スクロール

### 6.4 API Client (`api/client.ts`)

- 集約型API通信レイヤー
- TypeScript型定義
- エラーハンドリング

---

## 7. アーキテクチャフロー

```
┌─────────────────────┐
│   ユーザーブラウザ    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  React Frontend     │  ← Port 3000
│  (Vite Dev Server)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  FastAPI Backend    │  ← Port 7071
│  (uvicorn)          │
└──────────┬──────────┘
           │
     ┌─────┴─────┬─────────────┬──────────────┐
     │           │             │              │
     ▼           ▼             ▼              ▼
┌─────────┐ ┌─────────┐ ┌───────────┐ ┌─────────────┐
│Extractor│ │ OpenAI  │ │   Blob    │ │   Search    │
│ Service │ │ Service │ │  Service  │ │   Service   │
└─────────┘ └────┬────┘ └─────┬─────┘ └──────┬──────┘
                 │            │              │
                 ▼            ▼              ▼
           ┌──────────────────────────────────────┐
           │         Azure Cloud Services         │
           ├──────────────────────────────────────┤
           │  Azure OpenAI  │  Blob Storage      │
           │  (GPT-4o)      │  (documents)       │
           │  (ada-002)     │                    │
           ├──────────────────────────────────────┤
           │         Azure AI Search              │
           │         (documents-index)            │
           └──────────────────────────────────────┘
```

---

## 8. 環境変数設定

### 必須環境変数

```env
# Azure OpenAI
AZURE_OPENAI_API_KEY=<APIキー>
AZURE_OPENAI_ENDPOINT=https://<リソース名>.openai.azure.com/
AZURE_OPENAI_MODEL=gpt-4o
AZURE_OPENAI_EMBEDDING_MODEL=text-embedding-ada-002

# Azure AI Search
AZURE_SEARCH_ENDPOINT=https://<サービス名>.search.windows.net
AZURE_SEARCH_API_KEY=<APIキー>
AZURE_SEARCH_INDEX_NAME=documents-index

# Azure Blob Storage
AZURE_STORAGE_CONNECTION_STRING=<接続文字列>
AZURE_STORAGE_CONTAINER_NAME=documents
```

### フロントエンド環境変数

```env
VITE_API_BASE=/api
```

---

## 9. 起動方法

### 開発環境

**バックエンド:**
```bash
cd backend
pip install -r requirements.txt
python main.py
# または
uvicorn main:app --reload --port 7071
```

**フロントエンド:**
```bash
cd frontend
npm install
npm run dev
```

### 本番環境

- バックエンド: Azure Functionsへデプロイ（`function_app.py`使用）
- フロントエンド: `npm run build` → `dist/`をホスティング

---

## 10. 主要機能

1. **マルチフォーマット対応**: PDF, PowerPoint, Word, Excel, テキストファイル
2. **インテリジェントチャンキング**: ドキュメント構造を保持した分割
3. **RAG（検索拡張生成）**: ハイブリッド検索 + コンテキスト注入
4. **モダンUI**: ダークテーマ、アニメーション、ドラッグ&ドロップ

---

## 11. 依存関係

### バックエンド (requirements.txt)

```
fastapi
uvicorn[standard]
azure-storage-blob
azure-search-documents
openai
python-dotenv
python-multipart
pymupdf
python-pptx
python-docx
openpyxl
azure-functions
```

### フロントエンド (package.json)

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }
}
```

---

*作成日: 2026-02-28*

import azure.functions as func
from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Any
from dotenv import load_dotenv
import uuid
import os

load_dotenv()

from services import BlobService, OpenAIService, SearchService, TextExtractor, TextSplitter, ProposalService

fastapi_app = FastAPI(
    title="AI Chat Hub API",
    description="Semantic search chat + file management with auto-indexing",
    version="2.0.0",
)

fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

blob_service = BlobService()
openai_service = OpenAIService()
search_service = SearchService()
proposal_service = ProposalService()


# --- Pydantic models ---

class ChatMessage(BaseModel):
    role: str
    content: str

class SemanticChatRequest(BaseModel):
    messages: List[ChatMessage]
    model: Optional[str] = None
    use_semantic: bool = True

class CompetitorSearchRequest(BaseModel):
    messages: List[ChatMessage]
    model: Optional[str] = None

class ProposalGenerateRequest(BaseModel):
    messages: List[ChatMessage]
    model: Optional[str] = None


# --- Health ---

@fastapi_app.get("/api/health")
async def health_check():
    return {"status": "healthy"}


# --- Semantic Chat (Normal Chat) ---

@fastapi_app.post("/api/chat/semantic")
async def semantic_chat(request: SemanticChatRequest):
    """Chat with AI using semantic search over indexed documents."""
    try:
        if not request.messages:
            raise HTTPException(status_code=400, detail="messages is required")

        last_message = request.messages[-1].content
        context = None

        # Semantic search for relevant context
        results = []
        if not search_service.search_client:
            print("[WARN] Azure AI Search is not configured. Skipping semantic search.")
        else:
            try:
                embedding = openai_service.generate_embedding(last_message)
                results = search_service.hybrid_search(
                    query=last_message,
                    query_vector=embedding,
                    top=5,
                    use_semantic=request.use_semantic,
                )
                if results:
                    context = "\n\n---\n\n".join([r["content"] for r in results])
                    print(f"[OK] Semantic search found {len(results)} results")
            except Exception as e:
                print(f"[WARN] Semantic search failed: {e}")

        messages = [{"role": m.role, "content": m.content} for m in request.messages]
        response_text = openai_service.chat(messages=messages, context=context, model=request.model)

        return {"response": response_text, "sources": results if context else []}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- Competitor Search (Web Search + AI Table) ---

@fastapi_app.post("/api/chat/competitor-search")
async def competitor_search(request: CompetitorSearchRequest):
    """Execute competitor web search based on chat context, return AI-formatted table."""
    try:
        if not request.messages:
            raise HTTPException(status_code=400, detail="messages is required")

        # 1. Build search query from chat context
        chat_context = "\n".join([f"{m.role}: {m.content}" for m in request.messages])

        # 2. Generate a focused search query from the AI
        search_query_prompt = f"""以下のチャットの文脈から、競合検索に最適な検索クエリを1つ生成してください。
クエリのみを出力してください（説明文は不要）。

【チャットの文脈】
{chat_context}"""

        search_query = openai_service.chat(
            messages=[{"role": "user", "content": search_query_prompt}],
            model=request.model,
        ).strip()

        # 3. Execute Bing Web Search
        try:
            web_results = openai_service.web_search(search_query, count=10)
        except Exception as e:
            print(f"[WARN] Web search failed: {e}")
            web_results = []

        if not web_results:
            return {
                "table": [],
                "search_query": search_query,
                "web_results": [],
                "message": "Web検索で結果が得られませんでした。検索条件を変えてみてください。",
            }

        # 4. AI generates competitor table from web results
        table = openai_service.competitor_search_table(
            chat_context=chat_context,
            web_results=web_results,
            model=request.model,
        )

        return {
            "table": table,
            "search_query": search_query,
            "web_results": web_results,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- Proposal Generation (AI content + PDF) ---

@fastapi_app.post("/api/generate/proposal")
async def generate_proposal(request: ProposalGenerateRequest):
    """Generate a proposal PDF based on chat context."""
    try:
        if not request.messages:
            raise HTTPException(status_code=400, detail="messages is required")

        # 1. Build chat context
        chat_context = "\n".join([f"{m.role}: {m.content}" for m in request.messages])

        # 2. AI generates structured proposal text
        proposal_prompt = f"""以下のチャットの文脈をもとに、正式な企画書を作成してください。

【チャットの文脈】
{chat_context}

出力形式の指示:
- 以下のセクションを含めてください:
  ## 件名
  ## 目的
  ## 背景
  ## 実施内容
  ## スケジュール
  ## 予算
  ## 期待効果
  ## 備考（必要に応じて）
- 各セクションは ## で始めてください
- 箇条書きは - で始めてください
- 番号付きリストは 1. 2. 3. で始めてください
- 具体的で実務的な内容にしてください
- 日本語で出力してください"""

        proposal_text = openai_service.chat(
            messages=[{"role": "user", "content": proposal_prompt}],
            model=request.model,
        )

        # 3. Generate PDF from proposal text
        pdf_bytes = proposal_service.generate_pdf(proposal_text, title="企画書")

        # 4. Return PDF as binary response
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": "inline; filename=proposal.pdf",
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- File Management (upload / list / delete with auto-indexing) ---

@fastapi_app.post("/api/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    """Upload a file, store in Blob, and auto-index (embed) its content."""
    try:
        content = await file.read()
        file_name = file.filename

        # 1. Upload to Blob Storage
        blob_result = blob_service.upload_document(
            file_name=file_name,
            file_content=content,
            content_type=file.content_type or "application/octet-stream",
        )

        # 2. Extract chunks (TextSplitter for supported formats)
        if TextSplitter.is_supported(file_name):
            chunks, file_type = TextSplitter.split(content, file_name)
            print(f"[{file_type}] {file_name}: {len(chunks)} chunks (semantic split)")
        else:
            chunks, file_type = TextExtractor.extract_chunks(
                content, file_name, file.content_type or ""
            )
            print(f"[{file_type}] {file_name}: {len(chunks)} chunks (basic split)")

        # 3. Index each chunk (embedding)
        indexed_count = 0
        chunk_results = []
        for chunk in chunks:
            doc_id = str(uuid.uuid4())
            try:
                try:
                    ai_title = openai_service.generate_chunk_title(chunk.text)
                except Exception:
                    ai_title = f"{file_name} - {chunk.chunk_id}"

                try:
                    ai_category = openai_service.categorize_chunk(chunk.text)
                except Exception:
                    ai_category = "その他"

                embedding = openai_service.generate_embedding(chunk.text)
                search_service.index_document(
                    doc_id=doc_id,
                    title=ai_title,
                    content=chunk.text,
                    file_name=file_name,
                    embedding=embedding,
                    category=ai_category,
                )
                indexed_count += 1
                chunk_results.append({
                    "chunk_id": chunk.chunk_id,
                    "status": "indexed",
                    "chars": len(chunk.text),
                    "title": ai_title,
                    "category": ai_category,
                })
            except Exception as e:
                chunk_results.append({
                    "chunk_id": chunk.chunk_id,
                    "status": "error",
                    "error": str(e),
                })

        return {
            "success": True,
            "file_name": file_name,
            "file_type": file_type,
            "total_chunks": len(chunks),
            "indexed_chunks": indexed_count,
            "chunks": chunk_results,
            "blob_url": blob_result["url"],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@fastapi_app.get("/api/documents")
async def list_documents():
    """List all stored documents."""
    try:
        documents = blob_service.list_documents()
        return {"documents": documents}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@fastapi_app.delete("/api/documents/{file_name:path}")
async def delete_document(file_name: str):
    """Delete a file from Blob Storage and remove its chunks from the search index."""
    try:
        # 1. Delete from Blob
        blob_deleted = blob_service.delete_document(file_name)

        # 2. Remove indexed chunks for this file
        try:
            # Search for all chunks belonging to this file
            results = search_service.search(query=file_name, top=50)
            for r in results:
                if r.get("file_name") == file_name:
                    search_service.delete_document(r["id"])
            print(f"[OK] Removed index entries for {file_name}")
        except Exception as e:
            print(f"[WARN] Index cleanup failed for {file_name}: {e}")

        return {"success": blob_deleted}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@fastapi_app.post("/api/reindex")
async def reindex_blob_files():
    """Re-index all files from Blob Storage into Azure AI Search."""
    try:
        result = _mcp_tool_call("reindex_blob_files", {})
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- MCP (Model Context Protocol) Endpoint ---
# Streamable HTTP transport for Claude custom MCP integration

MCP_TOOLS = [
    {
        "name": "chat",
        "description": "社内ドキュメントに対してセマンティック検索を行い、AIが回答するチャット機能。社内文書に関する質問に最適。",
        "inputSchema": {
            "type": "object",
            "properties": {
                "message": {
                    "type": "string",
                    "description": "ユーザーの質問やメッセージ",
                },
                "model": {
                    "type": "string",
                    "description": "使用するAIモデル名（省略可）",
                },
            },
            "required": ["message"],
        },
    },
    {
        "name": "competitor_search",
        "description": "チャット文脈をもとにWeb検索し、競合他社の一覧表を生成する機能。競合分析に最適。",
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "競合検索のクエリまたは質問",
                },
                "model": {
                    "type": "string",
                    "description": "使用するAIモデル名（省略可）",
                },
            },
            "required": ["query"],
        },
    },
    {
        "name": "generate_proposal",
        "description": "入力内容をもとにAIが企画書テキストを生成する機能。企画書の構造化テキストを返す。",
        "inputSchema": {
            "type": "object",
            "properties": {
                "topic": {
                    "type": "string",
                    "description": "企画書の主題や要件",
                },
                "model": {
                    "type": "string",
                    "description": "使用するAIモデル名（省略可）",
                },
            },
            "required": ["topic"],
        },
    },
    {
        "name": "reindex_blob_files",
        "description": "Azure Blob Storage内の全ファイルを読み込み、テキスト抽出→埋め込み生成→ベクトルDB（Azure AI Search）にインデックスする機能。既存インデックスはクリア後に再構築される。",
        "inputSchema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
]


def _mcp_tool_call(name: str, args: dict) -> Any:
    """Execute an MCP tool by name and return the result."""
    if name == "chat":
        message = args.get("message", "")
        model = args.get("model")

        # Semantic search for context
        context = None
        results = []
        try:
            embedding = openai_service.generate_embedding(message)
            results = search_service.hybrid_search(
                query=message,
                query_vector=embedding,
                top=5,
                use_semantic=True,
            )
            if results:
                context = "\n\n---\n\n".join([r["content"] for r in results])
        except Exception as e:
            print(f"[MCP WARN] Semantic search failed: {e}")

        response_text = openai_service.chat(
            messages=[{"role": "user", "content": message}],
            context=context,
            model=model,
        )
        return {"response": response_text, "sources_count": len(results)}

    elif name == "competitor_search":
        query = args.get("query", "")
        model = args.get("model")

        # Generate search query
        search_query = openai_service.chat(
            messages=[{"role": "user", "content": f"以下から競合検索クエリを1つ生成（クエリのみ出力）:\n{query}"}],
            model=model,
        ).strip()

        # Web search
        try:
            web_results = openai_service.web_search(search_query, count=10)
        except Exception as e:
            print(f"[MCP WARN] Web search failed: {e}")
            web_results = []

        if not web_results:
            return {"table": [], "search_query": search_query, "message": "Web検索で結果が得られませんでした。"}

        # Generate table
        table = openai_service.competitor_search_table(
            chat_context=query,
            web_results=web_results,
            model=model,
        )
        return {"table": table, "search_query": search_query}

    elif name == "generate_proposal":
        topic = args.get("topic", "")
        model = args.get("model")

        proposal_prompt = f"""以下の内容をもとに、正式な企画書を作成してください。

【内容】
{topic}

出力形式の指示:
- 以下のセクションを含める: ## 件名, ## 目的, ## 背景, ## 実施内容, ## スケジュール, ## 予算, ## 期待効果, ## 備考
- 各セクションは ## で始める
- 箇条書きは - で始める
- 番号付きリストは 1. 2. 3. で始める
- 具体的で実務的な内容にする
- 日本語で出力する"""

        proposal_text = openai_service.chat(
            messages=[{"role": "user", "content": proposal_prompt}],
            model=model,
        )
        return {"proposal": proposal_text}

    elif name == "reindex_blob_files":
        # 1. List all blobs
        if not blob_service.container_client:
            raise Exception("Azure Storage is not configured")

        blobs = blob_service.list_documents()
        if not blobs:
            return {"status": "no_files", "message": "Blob Storageにファイルがありません。"}

        # 2. Ensure search index exists
        try:
            search_service.create_index()
            print("[MCP] Search index created/updated")
        except Exception as e:
            print(f"[MCP WARN] Index creation: {e}")

        # 3. Process each blob
        results = []
        total_indexed = 0
        for blob_info in blobs:
            file_name = blob_info["name"]
            try:
                # Download blob content
                content = blob_service.get_document(file_name)
                if not content:
                    results.append({"file": file_name, "status": "skip", "reason": "download failed"})
                    continue

                # Extract chunks (TextSplitter for supported formats)
                if TextSplitter.is_supported(file_name):
                    chunks, file_type = TextSplitter.split(content, file_name)
                    print(f"[MCP] [{file_type}] {file_name}: {len(chunks)} chunks (semantic split)")
                else:
                    chunks, file_type = TextExtractor.extract_chunks(content, file_name, "")
                    print(f"[MCP] [{file_type}] {file_name}: {len(chunks)} chunks (basic split)")

                # Index each chunk
                indexed = 0
                for chunk in chunks:
                    doc_id = str(uuid.uuid4())
                    try:
                        embedding = openai_service.generate_embedding(chunk.text)
                        search_service.index_document(
                            doc_id=doc_id,
                            title=f"{file_name} - {chunk.chunk_id}",
                            content=chunk.text,
                            file_name=file_name,
                            embedding=embedding,
                            category="",
                        )
                        indexed += 1
                    except Exception as e:
                        print(f"[MCP WARN] Chunk index failed: {e}")

                total_indexed += indexed
                results.append({"file": file_name, "type": file_type, "chunks": len(chunks), "indexed": indexed})
            except Exception as e:
                results.append({"file": file_name, "status": "error", "error": str(e)})

        return {
            "status": "completed",
            "total_files": len(blobs),
            "total_indexed_chunks": total_indexed,
            "details": results,
        }

    else:
        raise ValueError(f"Unknown tool: {name}")


@fastapi_app.post("/mcp")
async def mcp_endpoint(request: Request):
    """MCP Streamable HTTP endpoint for Claude custom MCP integration."""
    try:
        body = await request.json()
    except Exception:
        return JSONResponse(
            status_code=400,
            content={"jsonrpc": "2.0", "error": {"code": -32700, "message": "Parse error"}, "id": None},
        )

    jsonrpc = body.get("jsonrpc", "2.0")
    method = body.get("method", "")
    msg_id = body.get("id")
    params = body.get("params", {})

    # --- initialize ---
    if method == "initialize":
        return JSONResponse(content={
            "jsonrpc": jsonrpc,
            "id": msg_id,
            "result": {
                "protocolVersion": "2025-03-26",
                "capabilities": {
                    "tools": {"listChanged": False},
                },
                "serverInfo": {
                    "name": "ai-chat-hub-mcp",
                    "version": "1.0.0",
                },
            },
        })

    # --- tools/list ---
    if method == "tools/list":
        return JSONResponse(content={
            "jsonrpc": jsonrpc,
            "id": msg_id,
            "result": {"tools": MCP_TOOLS},
        })

    # --- tools/call ---
    if method == "tools/call":
        tool_name = params.get("name", "")
        tool_args = params.get("arguments", {})

        try:
            result = _mcp_tool_call(tool_name, tool_args)
            return JSONResponse(content={
                "jsonrpc": jsonrpc,
                "id": msg_id,
                "result": {
                    "content": [{"type": "text", "text": str(result)}],
                },
            })
        except Exception as e:
            return JSONResponse(content={
                "jsonrpc": jsonrpc,
                "id": msg_id,
                "result": {
                    "content": [{"type": "text", "text": f"Error: {str(e)}"}],
                    "isError": True,
                },
            })

    # --- notifications (initialized, etc.) ---
    if method == "notifications/initialized" or method == "initialized":
        return JSONResponse(status_code=204, content=None)

    # --- ping ---
    if method == "ping":
        return JSONResponse(content={"jsonrpc": jsonrpc, "id": msg_id, "result": {}})

    # --- unknown method ---
    return JSONResponse(content={
        "jsonrpc": jsonrpc,
        "id": msg_id,
        "error": {"code": -32601, "message": f"Method not found: {method}"},
    })


# --- Azure Functions entry point ---

app = func.AsgiFunctionApp(
    app=fastapi_app,
    http_auth_level=func.AuthLevel.ANONYMOUS,
)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(fastapi_app, host="0.0.0.0", port=7071)

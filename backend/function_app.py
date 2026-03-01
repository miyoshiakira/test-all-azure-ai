import azure.functions as func
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv
import uuid
import os

# Load environment variables
load_dotenv()

from services import BlobService, OpenAIService, SearchService, TextExtractor

# Initialize FastAPI app
fastapi_app = FastAPI(
    title="Document Analysis API",
    description="API for document upload, search, and AI-powered analysis",
    version="1.0.0"
)

# CORS configuration
fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
blob_service = BlobService()
openai_service = OpenAIService()
search_service = SearchService()


# Pydantic models
class QuestionRequest(BaseModel):
    question: str
    context: Optional[str] = None


class SearchRequest(BaseModel):
    query: str
    use_vector: bool = False
    top: int = 5


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    use_search: bool = False
    use_semantic: bool = False


class SummarizeRequest(BaseModel):
    text: str
    max_length: int = 500


class AdminAuthRequest(BaseModel):
    password: str


# Simple admin password (in production, use environment variable)
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")


# Health check endpoint
@fastapi_app.get("/api/health")
async def health_check():
    return {"status": "healthy"}


# Document endpoints
@fastapi_app.post("/api/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    """Upload a document to Azure Blob Storage and index it (chunk by chunk)"""
    try:
        content = await file.read()
        file_name = file.filename

        # Upload to Blob Storage
        blob_result = blob_service.upload_document(
            file_name=file_name,
            file_content=content,
            content_type=file.content_type or "application/octet-stream"
        )

        # Extract text content as chunks
        chunks, file_type = TextExtractor.extract_chunks(
            content,
            file_name,
            file.content_type or ""
        )
        print(f"[{file_type}] {file_name}: {len(chunks)} chunks extracted")

        # Index each chunk separately with AI-generated title and category
        indexed_count = 0
        chunk_results = []

        for chunk in chunks:
            doc_id = str(uuid.uuid4())
            try:
                # AIでタイトルとカテゴリを生成
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
                    category=ai_category
                )
                indexed_count += 1
                chunk_results.append({
                    "chunk_id": chunk.chunk_id,
                    "status": "indexed",
                    "chars": len(chunk.text),
                    "title": ai_title,
                    "category": ai_category
                })
                print(f"  [OK] {chunk.chunk_id}: {len(chunk.text)} chars | {ai_title} | {ai_category}")
            except Exception as e:
                chunk_results.append({
                    "chunk_id": chunk.chunk_id,
                    "status": "error",
                    "error": str(e)
                })
                print(f"  [WARN] {chunk.chunk_id}: {e}")

        return {
            "success": True,
            "file_name": file_name,
            "file_type": file_type,
            "total_chunks": len(chunks),
            "indexed_chunks": indexed_count,
            "chunks": chunk_results,
            "blob_url": blob_result["url"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@fastapi_app.get("/api/documents")
async def list_documents():
    """List all documents in storage"""
    try:
        documents = blob_service.list_documents()
        return {"documents": documents}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@fastapi_app.delete("/api/documents/{file_name:path}")
async def delete_document(file_name: str):
    """Delete a document from storage"""
    try:
        result = blob_service.delete_document(file_name)
        return {"success": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Search endpoints
@fastapi_app.post("/api/search")
async def search_documents(request: SearchRequest):
    """Search documents"""
    try:
        if request.use_vector:
            embedding = openai_service.generate_embedding(request.query)
            results = search_service.hybrid_search(
                query=request.query,
                query_vector=embedding,
                top=request.top
            )
        else:
            results = search_service.search(
                query=request.query,
                top=request.top
            )
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# AI endpoints
@fastapi_app.post("/api/ai/summarize")
async def summarize_text(request: SummarizeRequest):
    """Summarize text using Azure OpenAI"""
    try:
        summary = openai_service.summarize(
            text=request.text,
            max_length=request.max_length
        )
        return {"summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@fastapi_app.post("/api/ai/question")
async def answer_question(request: QuestionRequest):
    """Answer a question based on context"""
    try:
        # If no context provided, search for relevant documents
        context = request.context
        if not context:
            try:
                embedding = openai_service.generate_embedding(request.question)
                results = search_service.hybrid_search(
                    query=request.question,
                    query_vector=embedding,
                    top=3
                )
                context = "\n\n".join([r["content"] for r in results])
            except Exception:
                context = ""

        answer = openai_service.answer_question(
            question=request.question,
            context=context
        )
        return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@fastapi_app.post("/api/ai/chat")
async def chat(request: ChatRequest):
    """Chat with AI, optionally using document context"""
    try:
        context = None
        if request.use_search and request.messages:
            last_message = request.messages[-1].content
            try:
                embedding = openai_service.generate_embedding(last_message)
                results = search_service.hybrid_search(
                    query=last_message,
                    query_vector=embedding,
                    top=5,
                    use_semantic=request.use_semantic
                )
                context = "\n\n---\n\n".join([r["content"] for r in results])
            except Exception:
                pass

        messages = [{"role": m.role, "content": m.content} for m in request.messages]
        response = openai_service.chat(messages=messages, context=context)
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Admin endpoints
@fastapi_app.post("/api/admin/create-index")
async def create_search_index():
    """Create or update the search index"""
    try:
        search_service.create_index()
        return {"success": True, "message": "Index created successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@fastapi_app.post("/api/admin/auth")
async def admin_auth(request: AdminAuthRequest):
    """Verify admin password"""
    print(f"[DEBUG] Auth attempt - received: '{request.password}', expected: '{ADMIN_PASSWORD}'")
    print(f"[DEBUG] Match: {request.password == ADMIN_PASSWORD}")
    if request.password == ADMIN_PASSWORD:
        return {"success": True, "message": "Authentication successful"}
    raise HTTPException(status_code=401, detail="Invalid password")


@fastapi_app.post("/api/admin/clear-search")
async def clear_search_index(request: AdminAuthRequest):
    """Clear all documents from Azure AI Search index"""
    if request.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid password")

    try:
        result = search_service.clear_all()
        return {"success": True, "message": "Search index cleared", **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@fastapi_app.post("/api/admin/clear-storage")
async def clear_blob_storage(request: AdminAuthRequest):
    """Clear all documents from Azure Blob Storage"""
    if request.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid password")

    try:
        result = blob_service.clear_all()
        return {"success": True, "message": "Blob storage cleared", **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@fastapi_app.post("/api/admin/reindex-all")
async def reindex_all_documents():
    """Re-index all documents from Blob Storage (chunk by chunk)"""
    try:
        # First, create index if it doesn't exist
        try:
            search_service.create_index()
            print("[OK] Index created/verified")
        except Exception as e:
            print(f"[WARN] Index creation: {e}")

        # Get all documents from Blob Storage
        documents = blob_service.list_documents()
        results = []
        total_chunks = 0
        indexed_chunks = 0

        for doc in documents:
            file_name = doc["name"]
            print(f"\n[Processing] {file_name}...")

            try:
                # Download file content
                content = blob_service.get_document(file_name)
                if not content:
                    results.append({"file": file_name, "status": "not_found", "chunks": 0})
                    continue

                # Extract chunks
                chunks, file_type = TextExtractor.extract_chunks(content, file_name, "")
                print(f"  [{file_type}] {len(chunks)} chunks")

                # Index each chunk with AI-generated title and category
                file_indexed = 0
                for chunk in chunks:
                    doc_id = str(uuid.uuid4())
                    try:
                        # AIでタイトルとカテゴリを生成
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
                            category=ai_category
                        )
                        file_indexed += 1
                        indexed_chunks += 1
                        print(f"    [OK] {chunk.chunk_id}: {len(chunk.text)} chars | {ai_title} | {ai_category}")
                    except Exception as e:
                        print(f"    [WARN] {chunk.chunk_id}: {e}")

                total_chunks += len(chunks)
                results.append({
                    "file": file_name,
                    "status": "indexed",
                    "file_type": file_type,
                    "chunks": len(chunks),
                    "indexed": file_indexed
                })

            except Exception as e:
                print(f"  [ERROR] {e}")
                results.append({"file": file_name, "status": "error", "error": str(e)})

        return {
            "success": True,
            "total_files": len(documents),
            "total_chunks": total_chunks,
            "indexed_chunks": indexed_chunks,
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7071)

# 変数名は必ず 'app'
app = func.AsgiFunctionApp(
    app=fastapi_app, 
    http_auth_level=func.AuthLevel.ANONYMOUS
)
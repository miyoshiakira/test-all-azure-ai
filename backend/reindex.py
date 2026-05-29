"""Blob StorageのファイルをベクトルDBに再インデックスするスクリプト"""
import os
import sys
import uuid

# .envを読み込み
from dotenv import load_dotenv
load_dotenv()

from services import BlobService, OpenAIService, SearchService, TextExtractor, TextSplitter


def main():
    print("=" * 50)
    print("  Reindex Blob Files → Vector DB")
    print("=" * 50)
    print()

    blob_service = BlobService()
    openai_service = OpenAIService()
    search_service = SearchService()

    # 1. List blobs
    if not blob_service.container_client:
        print("ERROR: Azure Storage is not configured. Check .env")
        sys.exit(1)

    blobs = blob_service.list_documents()
    if not blobs:
        print("No files found in Blob Storage.")
        sys.exit(0)

    print(f"Found {len(blobs)} files in Blob Storage:")
    for b in blobs:
        print(f"  - {b['name']} ({b['size']} bytes)")
    print()

    # 2. Create index
    try:
        search_service.create_index()
        print("Search index created/updated.")
    except Exception as e:
        print(f"WARN: Index creation: {e}")
    print()

    # 3. Process each blob
    total_indexed = 0
    results = []

    for i, blob_info in enumerate(blobs, 1):
        file_name = blob_info["name"]
        print(f"[{i}/{len(blobs)}] Processing: {file_name}")

        try:
            content = blob_service.get_document(file_name)
            if not content:
                print(f"  SKIP: download failed")
                results.append({"file": file_name, "status": "skip"})
                continue

            # TextSplitter（意味分割）を優先使用、未対応形式はTextExtractorにフォールバック
            if TextSplitter.is_supported(file_name):
                chunks, file_type = TextSplitter.split(content, file_name)
                print(f"  [{file_type}] {len(chunks)} chunks (semantic split)")
            else:
                chunks, file_type = TextExtractor.extract_chunks(content, file_name, "")
                print(f"  [{file_type}] {len(chunks)} chunks (basic split)")

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
                    print(f"  WARN: Chunk index failed: {e}")

            total_indexed += indexed
            print(f"  Indexed {indexed}/{len(chunks)} chunks")
            results.append({"file": file_name, "type": file_type, "chunks": len(chunks), "indexed": indexed})

        except Exception as e:
            print(f"  ERROR: {e}")
            results.append({"file": file_name, "status": "error", "error": str(e)})

    # Summary
    print()
    print("=" * 50)
    print(f"  Completed!")
    print(f"  Files: {len(blobs)}")
    print(f"  Total indexed chunks: {total_indexed}")
    print("=" * 50)


if __name__ == "__main__":
    main()

import os
from azure.core.credentials import AzureKeyCredential
from azure.search.documents import SearchClient
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents.indexes.models import (
    SearchIndex,
    SimpleField,
    SearchableField,
    SearchFieldDataType,
    VectorSearch,
    HnswAlgorithmConfiguration,
    VectorSearchProfile,
    SearchField,
)
from typing import List, Optional


class SearchService:
    def __init__(self):
        endpoint = os.getenv("AZURE_SEARCH_ENDPOINT")
        api_key = os.getenv("AZURE_SEARCH_API_KEY")
        self.index_name = os.getenv("AZURE_SEARCH_INDEX_NAME", "documents-index")

        if endpoint and api_key:
            credential = AzureKeyCredential(api_key)
            self.search_client = SearchClient(
                endpoint=endpoint,
                index_name=self.index_name,
                credential=credential
            )
            self.index_client = SearchIndexClient(
                endpoint=endpoint,
                credential=credential
            )
        else:
            self.search_client = None
            self.index_client = None

    def create_index(self) -> bool:
        """Create or update the search index"""
        if not self.index_client:
            raise Exception("Azure Search is not configured")

        fields = [
            SimpleField(name="id", type=SearchFieldDataType.String, key=True),
            SearchableField(name="title", type=SearchFieldDataType.String),
            SearchableField(name="content", type=SearchFieldDataType.String),
            SimpleField(name="file_name", type=SearchFieldDataType.String, filterable=True),
            SimpleField(name="upload_date", type=SearchFieldDataType.DateTimeOffset, filterable=True, sortable=True),
            SearchField(
                name="content_vector",
                type=SearchFieldDataType.Collection(SearchFieldDataType.Single),
                searchable=True,
                vector_search_dimensions=1536,
                vector_search_profile_name="my-vector-config"
            )
        ]

        vector_search = VectorSearch(
            algorithms=[
                HnswAlgorithmConfiguration(name="my-hnsw")
            ],
            profiles=[
                VectorSearchProfile(
                    name="my-vector-config",
                    algorithm_configuration_name="my-hnsw"
                )
            ]
        )

        index = SearchIndex(
            name=self.index_name,
            fields=fields,
            vector_search=vector_search
        )

        self.index_client.create_or_update_index(index)
        return True

    def index_document(self, doc_id: str, title: str, content: str, file_name: str, embedding: List[float]) -> dict:
        """Index a document in Azure Search"""
        if not self.search_client:
            raise Exception("Azure Search is not configured")

        from datetime import datetime, timezone

        document = {
            "id": doc_id,
            "title": title,
            "content": content,
            "file_name": file_name,
            "upload_date": datetime.now(timezone.utc).isoformat(),
            "content_vector": embedding
        }

        result = self.search_client.upload_documents([document])
        return {"indexed": True, "id": doc_id}

    def search(self, query: str, top: int = 5) -> List[dict]:
        """Full-text search"""
        if not self.search_client:
            raise Exception("Azure Search is not configured")

        results = self.search_client.search(
            search_text=query,
            select=["id", "title", "content", "file_name", "upload_date"],
            top=top
        )

        return [
            {
                "id": doc["id"],
                "title": doc["title"],
                "content": doc["content"][:500] + "..." if len(doc["content"]) > 500 else doc["content"],
                "file_name": doc["file_name"],
                "upload_date": doc.get("upload_date"),
                "score": doc.get("@search.score", 0)
            }
            for doc in results
        ]

    def vector_search(self, query_vector: List[float], top: int = 5) -> List[dict]:
        """Vector similarity search"""
        if not self.search_client:
            raise Exception("Azure Search is not configured")

        from azure.search.documents.models import VectorizedQuery

        vector_query = VectorizedQuery(
            vector=query_vector,
            k_nearest_neighbors=top,
            fields="content_vector"
        )

        results = self.search_client.search(
            search_text=None,
            vector_queries=[vector_query],
            select=["id", "title", "content", "file_name", "upload_date"],
            top=top
        )

        return [
            {
                "id": doc["id"],
                "title": doc["title"],
                "content": doc["content"][:500] + "..." if len(doc["content"]) > 500 else doc["content"],
                "file_name": doc["file_name"],
                "upload_date": doc.get("upload_date"),
                "score": doc.get("@search.score", 0)
            }
            for doc in results
        ]

    def hybrid_search(self, query: str, query_vector: List[float], top: int = 5) -> List[dict]:
        """Hybrid search combining full-text and vector search"""
        if not self.search_client:
            raise Exception("Azure Search is not configured")

        from azure.search.documents.models import VectorizedQuery

        vector_query = VectorizedQuery(
            vector=query_vector,
            k_nearest_neighbors=top,
            fields="content_vector"
        )

        results = self.search_client.search(
            search_text=query,
            vector_queries=[vector_query],
            select=["id", "title", "content", "file_name", "upload_date"],
            top=top
        )

        return [
            {
                "id": doc["id"],
                "title": doc["title"],
                "content": doc["content"][:500] + "..." if len(doc["content"]) > 500 else doc["content"],
                "file_name": doc["file_name"],
                "upload_date": doc.get("upload_date"),
                "score": doc.get("@search.score", 0)
            }
            for doc in results
        ]

    def delete_document(self, doc_id: str) -> bool:
        """Delete a document from the index"""
        if not self.search_client:
            raise Exception("Azure Search is not configured")

        self.search_client.delete_documents([{"id": doc_id}])
        return True

    def clear_all(self) -> dict:
        """Clear all documents by deleting and recreating the index"""
        if not self.index_client:
            raise Exception("Azure Search is not configured")

        try:
            # Delete the index
            self.index_client.delete_index(self.index_name)
        except Exception:
            pass  # Index might not exist

        # Recreate the index
        self.create_index()
        return {"cleared": True, "index_name": self.index_name}

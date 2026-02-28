import os
from azure.storage.blob import BlobServiceClient, ContentSettings
from typing import Optional


class BlobService:
    def __init__(self):
        connection_string = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
        self.container_name = os.getenv("AZURE_STORAGE_CONTAINER_NAME", "documents")

        if connection_string:
            self.blob_service_client = BlobServiceClient.from_connection_string(connection_string)
            self.container_client = self.blob_service_client.get_container_client(self.container_name)
        else:
            self.blob_service_client = None
            self.container_client = None

    def upload_document(self, file_name: str, file_content: bytes, content_type: str = "application/octet-stream") -> dict:
        """Upload a document to Azure Blob Storage"""
        if not self.container_client:
            raise Exception("Azure Storage is not configured")

        blob_client = self.container_client.get_blob_client(file_name)
        content_settings = ContentSettings(content_type=content_type)

        blob_client.upload_blob(
            file_content,
            overwrite=True,
            content_settings=content_settings
        )

        return {
            "file_name": file_name,
            "url": blob_client.url,
            "container": self.container_name
        }

    def get_document(self, file_name: str) -> Optional[bytes]:
        """Get a document from Azure Blob Storage"""
        if not self.container_client:
            raise Exception("Azure Storage is not configured")

        blob_client = self.container_client.get_blob_client(file_name)
        try:
            download_stream = blob_client.download_blob()
            return download_stream.readall()
        except Exception:
            return None

    def list_documents(self) -> list:
        """List all documents in the container"""
        if not self.container_client:
            raise Exception("Azure Storage is not configured")

        blobs = self.container_client.list_blobs()
        return [
            {
                "name": blob.name,
                "size": blob.size,
                "last_modified": blob.last_modified.isoformat() if blob.last_modified else None
            }
            for blob in blobs
        ]

    def delete_document(self, file_name: str) -> bool:
        """Delete a document from Azure Blob Storage"""
        if not self.container_client:
            raise Exception("Azure Storage is not configured")

        blob_client = self.container_client.get_blob_client(file_name)
        try:
            blob_client.delete_blob()
            return True
        except Exception:
            return False

    def clear_all(self) -> dict:
        """Delete all documents from Azure Blob Storage"""
        if not self.container_client:
            raise Exception("Azure Storage is not configured")

        deleted_count = 0
        errors = []

        blobs = self.container_client.list_blobs()
        for blob in blobs:
            try:
                blob_client = self.container_client.get_blob_client(blob.name)
                blob_client.delete_blob()
                deleted_count += 1
            except Exception as e:
                errors.append({"name": blob.name, "error": str(e)})

        return {
            "cleared": True,
            "deleted_count": deleted_count,
            "errors": errors
        }

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export interface Document {
  name: string;
  size: number;
  last_modified: string | null;
}

export interface SearchResult {
  id: string;
  title: string;
  content: string;
  file_name: string;
  upload_date: string | null;
  category: string;
  score: number;
  reranker_score?: number | null;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface SemanticChatResponse {
  response: string;
  sources: SearchResult[];
}

export interface UploadResult {
  success: boolean;
  file_name: string;
  file_type: string;
  total_chunks: number;
  indexed_chunks: number;
  chunks: Array<{
    chunk_id: string;
    status: string;
    chars?: number;
    title?: string;
    category?: string;
    error?: string;
  }>;
  blob_url: string;
}

export interface CompetitorSearchResult {
  table: string[][];
  search_query: string;
  web_results: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
  message?: string;
}

class ApiClient {
  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || 'Request failed');
    }

    return response.json();
  }

  // Health
  async healthCheck(): Promise<{ status: string }> {
    return this.request('/health');
  }

  // Semantic Chat
  async semanticChat(messages: ChatMessage[], model?: string, useSemantic: boolean = true): Promise<SemanticChatResponse> {
    return this.request('/chat/semantic', {
      method: 'POST',
      body: JSON.stringify({ messages, model, use_semantic: useSemantic }),
    });
  }

  // Competitor Search
  async competitorSearch(messages: ChatMessage[], model?: string): Promise<CompetitorSearchResult> {
    return this.request('/chat/competitor-search', {
      method: 'POST',
      body: JSON.stringify({ messages, model }),
    });
  }

  // Proposal Generation (returns PDF blob)
  async generateProposal(messages: ChatMessage[], model?: string): Promise<Blob> {
    const response = await fetch(`${API_BASE}/generate/proposal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, model }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Proposal generation failed' }));
      throw new Error(error.detail || 'Proposal generation failed');
    }

    return response.blob();
  }

  // File Management
  async uploadDocument(file: File): Promise<UploadResult> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(error.detail || 'Upload failed');
    }

    return response.json();
  }

  async listDocuments(): Promise<{ documents: Document[] }> {
    return this.request('/documents');
  }

  async deleteDocument(fileName: string): Promise<{ success: boolean }> {
    return this.request(`/documents/${encodeURIComponent(fileName)}`, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient();

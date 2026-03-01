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
  score: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
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

  // Document endpoints
  async uploadDocument(file: File): Promise<{ success: boolean; file_name: string; blob_url: string; doc_id: string }> {
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

  // Search endpoint
  async search(query: string, useVector: boolean = false, top: number = 5): Promise<{ results: SearchResult[] }> {
    return this.request('/search', {
      method: 'POST',
      body: JSON.stringify({ query, use_vector: useVector, top }),
    });
  }

  // AI endpoints
  async summarize(text: string, maxLength: number = 500): Promise<{ summary: string }> {
    return this.request('/ai/summarize', {
      method: 'POST',
      body: JSON.stringify({ text, max_length: maxLength }),
    });
  }

  async askQuestion(question: string, context?: string): Promise<{ answer: string }> {
    return this.request('/ai/question', {
      method: 'POST',
      body: JSON.stringify({ question, context }),
    });
  }

  async chat(messages: ChatMessage[], useSearch: boolean = false, useSemantic: boolean = false): Promise<{ response: string }> {
    return this.request('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ messages, use_search: useSearch, use_semantic: useSemantic }),
    });
  }

  // Admin endpoints
  async createIndex(): Promise<{ success: boolean; message: string }> {
    return this.request('/admin/create-index', {
      method: 'POST',
    });
  }

  async reindexAll(): Promise<{
    success: boolean;
    total: number;
    indexed: number;
    results: Array<{ file: string; status: string; file_type?: string; text_length?: number; error?: string }>;
  }> {
    return this.request('/admin/reindex-all', {
      method: 'POST',
    });
  }

  // Admin auth and clear endpoints
  async adminAuth(password: string): Promise<{ success: boolean; message: string }> {
    return this.request('/admin/auth', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  }

  async clearSearch(password: string): Promise<{ success: boolean; message: string; cleared: boolean; index_name: string }> {
    return this.request('/admin/clear-search', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  }

  async clearStorage(password: string): Promise<{ success: boolean; message: string; cleared: boolean; deleted_count: number }> {
    return this.request('/admin/clear-storage', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  }
}

export const apiClient = new ApiClient();

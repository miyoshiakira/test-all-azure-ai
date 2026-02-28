import os
from openai import AzureOpenAI
from typing import List, Optional


class OpenAIService:
    def __init__(self):
        api_key = os.getenv("AZURE_OPENAI_API_KEY")
        endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")

        if api_key and endpoint:
            self.client = AzureOpenAI(
                api_key=api_key,
                api_version="2024-02-15-preview",
                azure_endpoint=endpoint
            )
        else:
            self.client = None

        self.model = os.getenv("AZURE_OPENAI_MODEL", "gpt-4o")
        self.embedding_model = os.getenv("AZURE_OPENAI_EMBEDDING_MODEL", "text-embedding-ada-002")

    def summarize(self, text: str, max_length: int = 500) -> str:
        """Summarize the given text"""
        if not self.client:
            raise Exception("Azure OpenAI is not configured")

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "system",
                    "content": f"You are a helpful assistant that summarizes documents. Provide a concise summary in Japanese, limited to approximately {max_length} characters."
                },
                {
                    "role": "user",
                    "content": f"Please summarize the following text:\n\n{text}"
                }
            ],
            max_tokens=1000,
            temperature=0.3
        )

        return response.choices[0].message.content

    def answer_question(self, question: str, context: str) -> str:
        """Answer a question based on the given context"""
        if not self.client:
            raise Exception("Azure OpenAI is not configured")

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful assistant that answers questions based on the provided context. Answer in Japanese. If the answer cannot be found in the context, say so clearly."
                },
                {
                    "role": "user",
                    "content": f"Context:\n{context}\n\nQuestion: {question}"
                }
            ],
            max_tokens=1000,
            temperature=0.5
        )

        return response.choices[0].message.content

    def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for the given text"""
        if not self.client:
            raise Exception("Azure OpenAI is not configured")

        response = self.client.embeddings.create(
            model=self.embedding_model,
            input=text
        )

        return response.data[0].embedding

    def chat(self, messages: List[dict], context: Optional[str] = None) -> str:
        """General chat with optional context"""
        if not self.client:
            raise Exception("Azure OpenAI is not configured")

        system_message = "You are a helpful assistant. Answer in Japanese."
        if context:
            system_message += f"\n\nUse the following context to help answer questions:\n{context}"

        all_messages = [{"role": "system", "content": system_message}] + messages

        response = self.client.chat.completions.create(
            model=self.model,
            messages=all_messages,
            max_tokens=2000,
            temperature=0.7
        )

        return response.choices[0].message.content

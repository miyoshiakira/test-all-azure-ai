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

    def generate_chunk_title(self, text: str) -> str:
        """チャンクの内容から短いタイトルを生成（セマンティック検索最適化）"""
        if not self.client:
            raise Exception("Azure OpenAI is not configured")

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "system",
                    "content": "あなたはテキストの内容を要約するアシスタントです。与えられたテキストの内容を「〇〇に関する情報」という形式で、15文字以内の短いタイトルにしてください。タイトルのみを出力してください。"
                },
                {
                    "role": "user",
                    "content": text[:500]  # 最初の500文字のみ使用
                }
            ],
            max_tokens=50,
            temperature=0.3
        )

        return response.choices[0].message.content.strip()

    def categorize_chunk(self, text: str) -> str:
        """チャンクの内容からカテゴリを推定（セマンティック検索最適化）"""
        if not self.client:
            raise Exception("Azure OpenAI is not configured")

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "system",
                    "content": """あなたはテキストを分類するアシスタントです。
与えられたテキストを以下のカテゴリのいずれか1つに分類してください：
- 仕事（業務、プロジェクト、会議、報告書など）
- 技術（プログラミング、システム、IT、開発など）
- 家族（家庭、育児、親族、家事など）
- 趣味（娯楽、スポーツ、旅行、ゲームなど）
- 健康（医療、運動、食事、メンタルなど）
- 学習（勉強、資格、教育、研修など）
- 金融（お金、投資、経済、保険など）
- その他

カテゴリ名のみを出力してください。"""
                },
                {
                    "role": "user",
                    "content": text[:500]
                }
            ],
            max_tokens=20,
            temperature=0.2
        )

        return response.choices[0].message.content.strip()

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

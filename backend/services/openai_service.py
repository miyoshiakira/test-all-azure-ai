import os
import json
import httpx
from openai import AzureOpenAI
from typing import List, Optional, Dict, Any, Callable


# 社員用のtools定義
EMPLOYEE_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "register_employee",
            "description": "新規社員情報をデータベースに登録します。ユーザーが「社員を登録したい」「新しい社員を追加して」などと言った場合に使用します。",
            "parameters": {
                "type": "object",
                "properties": {
                    "user_name": {
                        "type": "string",
                        "description": "社員の氏名（例: 山田太郎、佐藤花子）"
                    },
                    "grade": {
                        "type": "integer",
                        "description": "グレード（0以上の整数、役職レベルを表す）"
                    },
                    "others": {
                        "type": "string",
                        "description": "備考（任意）"
                    }
                },
                "required": ["user_name", "grade"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_employees",
            "description": "登録されている社員一覧を取得します。ユーザーが「社員一覧を見せて」「登録されてる社員は？」「トップ5の社員を教えて」「グレードが低い順に3人」などと言った場合に使用します。",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "description": "取得する人数（デフォルト: 10、最大: 50）"
                    },
                    "sort_order": {
                        "type": "string",
                        "enum": ["desc", "asc"],
                        "description": "グレードのソート順。desc=降順（高い順）、asc=昇順（低い順）。デフォルト: desc"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "delete_employee",
            "description": "社員情報をデータベースから削除します。ユーザーが「社員を削除して」「〇〇を削除して」「ID:XXの社員を消して」などと言った場合に使用します。削除前に確認を取ることを推奨します。",
            "parameters": {
                "type": "object",
                "properties": {
                    "user_id": {
                        "type": "integer",
                        "description": "削除する社員のID"
                    },
                    "user_name": {
                        "type": "string",
                        "description": "削除する社員の名前（IDが不明な場合に名前で検索して削除）"
                    }
                },
                "required": []
            }
        }
    }
]


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
        self._tool_handlers: Dict[str, Callable] = {}

    def register_tool_handler(self, name: str, handler: Callable):
        """ツールハンドラーを登録"""
        self._tool_handlers[name] = handler

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
                    "content": text[:500]
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

    def chat(self, messages: List[dict], context: Optional[str] = None, model: Optional[str] = None) -> str:
        """General chat with optional context (no tools)"""
        if not self.client:
            raise Exception("Azure OpenAI is not configured")

        use_model = model or self.model

        system_message = "You are a helpful assistant. Answer in Japanese."
        if context:
            system_message += f"\n\nUse the following context to help answer questions:\n{context}"

        all_messages = [{"role": "system", "content": system_message}] + messages

        response = self.client.chat.completions.create(
            model=use_model,
            messages=all_messages,
            max_tokens=2000,
            temperature=0.7
        )

        return response.choices[0].message.content

    def chat_with_tools(self, messages: List[dict], context: Optional[str] = None) -> Dict[str, Any]:
        """Chat with tools support (Function Calling)"""
        if not self.client:
            raise Exception("Azure OpenAI is not configured")

        system_message = """You are a helpful assistant. Answer in Japanese.
あなたは以下の機能を持っています：
- register_employee: 新規社員情報をデータベースに登録する
- get_employees: 登録されている社員一覧を取得する（人数や並び順を指定可能）
- delete_employee: 社員情報をデータベースから削除する（IDまたは名前で指定）

ユーザーが社員の登録を依頼した場合は、register_employeeツールを使用してください。
ユーザーが社員一覧の確認を依頼した場合は、get_employeesツールを使用してください。
ユーザーが社員の削除を依頼した場合は、delete_employeeツールを使用してください。
「トップ5」「上位3名」などは人数指定、「低い順」は昇順（asc）を指定してください。
削除を実行する前に、対象の社員情報を確認してからユーザーに削除してよいか確認してください。"""

        if context:
            system_message += f"\n\nUse the following context to help answer questions:\n{context}"

        all_messages = [{"role": "system", "content": system_message}] + messages

        # 最初のリクエスト（toolsを含む）
        response = self.client.chat.completions.create(
            model=self.model,
            messages=all_messages,
            tools=EMPLOYEE_TOOLS,
            tool_choice="auto",
            max_tokens=2000,
            temperature=0.7
        )

        assistant_message = response.choices[0].message
        tool_calls_made = []

        # Tool callsがある場合は処理
        if assistant_message.tool_calls:
            # アシスタントメッセージをメッセージリストに追加
            all_messages.append({
                "role": "assistant",
                "content": assistant_message.content or "",
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": tc.type,
                        "function": {
                            "name": tc.function.name,
                            "arguments": tc.function.arguments
                        }
                    }
                    for tc in assistant_message.tool_calls
                ]
            })

            # 各ツール呼び出しを処理
            for tool_call in assistant_message.tool_calls:
                function_name = tool_call.function.name
                function_args = json.loads(tool_call.function.arguments)

                print(f"[Tool Call] {function_name}: {function_args}")

                # ツールハンドラーを実行
                if function_name in self._tool_handlers:
                    result = self._tool_handlers[function_name](**function_args)
                    tool_calls_made.append({
                        "tool_name": function_name,
                        "arguments": function_args,
                        "result": result
                    })
                else:
                    result = {"error": f"Unknown tool: {function_name}"}
                    tool_calls_made.append({
                        "tool_name": function_name,
                        "arguments": function_args,
                        "result": result
                    })

                # ツール結果をメッセージに追加
                all_messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": json.dumps(result, ensure_ascii=False)
                })

            # ツール結果を含めて再度リクエスト
            final_response = self.client.chat.completions.create(
                model=self.model,
                messages=all_messages,
                max_tokens=2000,
                temperature=0.7
            )

            return {
                "response": final_response.choices[0].message.content,
                "tool_calls": tool_calls_made
            }

        # Tool callsがない場合はそのまま返す
        return {
            "response": assistant_message.content,
            "tool_calls": []
        }

    def web_search(self, query: str, count: int = 10) -> List[dict]:
        """Bing Web Search APIでWeb検索を実行"""
        subscription_key = os.getenv("BING_SEARCH_API_KEY")
        if not subscription_key:
            raise Exception("BING_SEARCH_API_KEY is not configured")

        endpoint = "https://api.bing.microsoft.com/v7.0/search"
        headers = {"Ocp-Apim-Subscription-Key": subscription_key}
        params = {
            "q": query,
            "count": count,
            "mkt": "ja-JP",
            "setLang": "ja",
        }

        with httpx.Client(timeout=15.0) as client:
            response = client.get(endpoint, headers=headers, params=params)
            response.raise_for_status()
            data = response.json()

        results = []
        for page in data.get("webPages", {}).get("value", []):
            results.append({
                "title": page.get("name", ""),
                "url": page.get("url", ""),
                "snippet": page.get("snippet", ""),
            })
        return results

    def competitor_search_table(self, chat_context: str, web_results: List[dict], model: Optional[str] = None) -> List[List[str]]:
        """Web検索結果をもとにAIで競合表を生成（2次元配列で返す）"""
        if not self.client:
            raise Exception("Azure OpenAI is not configured")

        use_model = model or self.model

        # Web検索結果をテキスト化
        web_text = "\n".join([
            f"- {r['title']}: {r['snippet']} ({r['url']})"
            for r in web_results
        ])

        prompt = f"""以下のチャットの文脈とWeb検索結果をもとに、競合他社の一覧表を作成してください。

【チャットの文脈】
{chat_context}

【Web検索結果】
{web_text}

出力形式の指示:
- 1行目はヘッダー行として、列のタイトルを入力してください（例: 競合企業名, 製品名, 価格, 市場シェア, 特徴, URL）
- 2行目以降はデータ行として、各競合の情報を入力してください
- 各セルはカンマ区切り（CSV形式）で出力してください
- 情報が見つからない場合は「不明」と入力してください
- 必ず5〜10行のデータを作成してください
- CSVデータのみを出力してください（説明文は不要）"""

        response = self.client.chat.completions.create(
            model=use_model,
            messages=[
                {"role": "system", "content": "あなたは競合分析の専門家です。与えられた情報から競合他社の比較表を作成します。CSV形式のみを出力してください。"},
                {"role": "user", "content": prompt},
            ],
            max_tokens=3000,
            temperature=0.3,
        )

        csv_text = response.choices[0].message.content.strip()
        # CSVをパースして2次元配列に変換
        rows: List[List[str]] = []
        for line in csv_text.split("\n"):
            line = line.strip()
            if not line:
                continue
            # 簡易CSVパース（カンマ区切り、ダブルクォート対応）
            cells = self._parse_csv_line(line)
            rows.append(cells)

        return rows

    @staticmethod
    def _parse_csv_line(line: str) -> List[str]:
        """簡易CSVパース"""
        cells = []
        current = ""
        in_quotes = False
        for ch in line:
            if ch == '"':
                in_quotes = not in_quotes
            elif ch == ',' and not in_quotes:
                cells.append(current.strip())
                current = ""
            else:
                current += ch
        cells.append(current.strip())
        return cells

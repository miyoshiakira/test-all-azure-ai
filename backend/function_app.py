import azure.functions as func
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import the FastAPI app from main.py
from main import app as fastapi_app

# 変数名を 'app' に変更（これが Azure Functions の標準探索対象）
app = func.AsgiFunctionApp(app=fastapi_app, http_auth_level=func.AuthLevel.ANONYMOUS)
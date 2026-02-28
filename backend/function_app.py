import azure.functions as func
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import the FastAPI app from main.py
from main import app

# Azure Functions integration
main = func.AsgiFunctionApp(app=app, http_auth_level=func.AuthLevel.ANONYMOUS)

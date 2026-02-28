import azure.functions as func
from main import app as fastapi_app

# 変数名を必ず 'app' にします（以前の 'main =' はNGです）
app = func.AsgiFunctionApp(app=fastapi_app, http_auth_level=func.AuthLevel.ANONYMOUS)
import sys
import os

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the FastAPI application instance
from app.main import app

# This allows Vercel's Serverless environment to serve the FastAPI app

import os
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/')
MONGODB_DB_NAME = os.getenv('MONGODB_DB', 'kapablebee')

# Initialize PyMongo Client
# Using a try-except block to gracefully report issues in logs if connection fails
try:
    client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
    db = client[MONGODB_DB_NAME]
    
    # Collections
    candidates_collection = db['candidates']
    jobs_collection = db['jobs']
    
    # Simple check to verify connection is successful when imported
    # Will not block, but will log issues
except Exception as e:
    print(f"Error connecting to MongoDB at {MONGODB_URI}: {e}")
    db = None
    candidates_collection = None
    jobs_collection = None

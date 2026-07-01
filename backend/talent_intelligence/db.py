import os
from pymongo import MongoClient, ASCENDING
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

except Exception as e:
    print(f"Error connecting to MongoDB at {MONGODB_URI}: {e}")
    db = None
    candidates_collection = None
    jobs_collection = None

# Ensure a sparse unique index on candidate_id for fast upserts.
# This is kept in a separate try/except so a quota or permission error
# (e.g. Atlas free-tier storage full) does NOT null out the collection
# references above — reads will still work even when writes are blocked.
if candidates_collection is not None:
    try:
        candidates_collection.create_index(
            [('candidate_id', ASCENDING)],
            unique=True,
            sparse=True,
            name='candidate_id_unique'
        )
    except Exception as e:
        print(f"Warning: could not create candidate_id index: {e}")

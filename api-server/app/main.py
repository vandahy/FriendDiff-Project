from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import routes

app = FastAPI(title="FriendDiff API")

# Setup CORS to allow the Chrome Extension to communicate with this backend.
# In production, replace "*" with the actual chrome-extension://<id> origin.
# Similar to @CrossOrigin in Spring Boot or CORS middleware in Laravel/PHP.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routes.router, prefix="/api")

@app.get("/")
def read_root():
    return {"status": "ok", "message": "FriendDiff Backend is running"}

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import Base, engine
from .routers import items as items_router

# Create tables if missing
Base.metadata.create_all(bind=engine)

app = FastAPI(title="OFS API", version="0.2.0")

# CORS: allow local Next.js dev server to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],   # GET for browse, POST for review
    allow_headers=["*"],
)

app.include_router(items_router.router)

@app.get("/healthz")
def healthz():
    return {"ok": True}

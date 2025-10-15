from fastapi import FastAPI
from starlette.middleware.sessions import SessionMiddleware
from fastapi.middleware.cors import CORSMiddleware
from .database import Base, engine
from .routers import items as items_router
from .routers import auth as auth_router
from .routers import cart as cart_router

# Create tables if missing
Base.metadata.create_all(bind=engine)

app = FastAPI(title="OFS API", version="0.3.0")

app.add_middleware(
    SessionMiddleware,
    secret_key="secret-key-change-in-prod"
)

# CORS: allow local Next.js dev server to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(items_router.router)
app.include_router(cart_router.router)

@app.get("/healthz")
def healthz():
    return {"ok": True}

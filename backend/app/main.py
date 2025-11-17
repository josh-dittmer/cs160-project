from fastapi import FastAPI
from starlette.middleware.sessions import SessionMiddleware
from fastapi.middleware.cors import CORSMiddleware
from .database import Base, engine
from .routers import items as items_router
from .routers import auth as auth_router
from .routers import cart as cart_router
from .routers import orders as orders_router
from .routers import admin as admin_router
from .routers import manager as manager_router
from .routers import employee as employee_router
from .routers import payment as payment_router
from .routers import favorites as favorites_router
import stripe
import os
from .routers import image_generation as image_generation_router
from .routers import video_generation as video_generation_router
from .routers import vehicle as vehicle_router

stripe.api_key = os.getenv("STRIPE_API_KEY", "")

DEFAULT_CORS_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "https://localhost:3000",
    "https://127.0.0.1:3000",
]

additional_origins = os.getenv("ADDITIONAL_CORS_ORIGINS")
if additional_origins:
    DEFAULT_CORS_ORIGINS.extend(
        origin.strip()
        for origin in additional_origins.split(",")
        if origin.strip()
    )

# Remove duplicates while preserving order
ALLOWED_CORS_ORIGINS = list(dict.fromkeys(DEFAULT_CORS_ORIGINS))

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
    allow_origins=ALLOWED_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(items_router.router)
app.include_router(cart_router.router)
app.include_router(orders_router.router)
app.include_router(admin_router.router)
app.include_router(manager_router.router)
app.include_router(employee_router.router)
app.include_router(payment_router.router)
app.include_router(favorites_router.router)
app.include_router(image_generation_router.router)
app.include_router(video_generation_router.router)
app.include_router(vehicle_router.router)

@app.get("/healthz")
def healthz():
    return {"ok": True}

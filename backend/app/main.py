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
import stripe
import os
from .routers import image_generation as image_generation_router
from .routers import video_generation as video_generation_router

stripe.api_key = os.getenv("STRIPE_API_KEY", "")

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
app.include_router(orders_router.router)
app.include_router(admin_router.router)
app.include_router(manager_router.router)
app.include_router(employee_router.router)
app.include_router(payment_router.router)
app.include_router(image_generation_router.router)
app.include_router(video_generation_router.router)

@app.get("/healthz")
def healthz():
    return {"ok": True}

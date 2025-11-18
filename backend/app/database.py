from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

import os

BASE_DIR = Path(__file__).resolve().parent.parent
DB_DIR = BASE_DIR / "db" 
DB_PATH = DB_DIR / "sqlite.db"
DB_URL = f"sqlite:///{DB_PATH}"

os.makedirs(DB_DIR, exist_ok=True)

# check_same_thread=False allows SQLite use across FastAPI worker threads
engine = create_engine(DB_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    """Base for SQLAlchemy models."""
    pass


def get_db():
    """Yield a DB session per request and always close it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

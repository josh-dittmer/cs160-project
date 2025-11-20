"""Pytest configuration and shared fixtures."""
import sys
from pathlib import Path

# Add backend directory to Python path so tests can import app
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

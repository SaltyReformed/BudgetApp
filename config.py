# config.py
import os
from datetime import timedelta


class Config:
    # Base directory of the application
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))

    # SQLite database
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL"
    ) or "sqlite:///" + os.path.join(BASE_DIR, "finance.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Enhanced Security Settings
    SECRET_KEY = os.environ.get("SECRET_KEY") or os.urandom(24)
    WTF_CSRF_ENABLED = True
    WTF_CSRF_SECRET_KEY = os.environ.get("WTF_CSRF_SECRET_KEY") or os.urandom(24)

    # Session configuration
    SESSION_COOKIE_SECURE = False  # Set to True if using HTTPS
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    REMEMBER_COOKIE_SECURE = False  # Set to True if using HTTPS
    REMEMBER_COOKIE_HTTPONLY = True
    REMEMBER_COOKIE_SAMESITE = 'Lax'
    WTF_CSRF_ENABLED = True
    WTF_CSRF_TIME_LIMIT = 3600  # 1 hour

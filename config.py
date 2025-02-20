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
    PERMANENT_SESSION_LIFETIME = timedelta(days=31)
    SESSION_PROTECTION = "strong"
    SESSION_COOKIE_SECURE = True  # Only send cookies over HTTPS
    SESSION_COOKIE_HTTPONLY = True  # Prevent JavaScript access to session cookie
    REMEMBER_COOKIE_DURATION = timedelta(days=31)
    REMEMBER_COOKIE_SECURE = True
    REMEMBER_COOKIE_HTTPONLY = True

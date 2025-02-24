# app/__init__.py
import logging
from logging.handlers import RotatingFileHandler
import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from config import Config
from flask_migrate import Migrate

# Initialize Flask extensions
db = SQLAlchemy()
migrate = Migrate()
login_manager = LoginManager()
login_manager.login_view = "auth.login"

# Initialize rate limiter
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri="memory://",
)


def setup_logging(app):
    """Configure logging for the application"""
    if not os.path.exists("logs"):
        os.mkdir("logs")

    file_handler = RotatingFileHandler(
        "logs/finance_app.log", maxBytes=10240, backupCount=10
    )
    file_handler.setFormatter(
        logging.Formatter(
            "%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]"
        )
    )
    file_handler.setLevel(logging.INFO)

    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(
        logging.Formatter("%(asctime)s %(levelname)s: %(message)s")
    )

    app.logger.addHandler(file_handler)
    app.logger.addHandler(console_handler)
    app.logger.setLevel(logging.INFO)
    app.logger.info("Finance app startup")


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    limiter.init_app(app)

    # Register blueprints
    from app.routes import main
    from app.auth import auth
    from app.admin import admin
    from app.errors import errors
    from app.api import api

    # Apply rate limiting to auth blueprint
    auth.decorators = [
        limiter.limit(
            "5 per minute",
            error_message="Too many login attempts. Please try again later.",
        )
    ]

    app.register_blueprint(main)
    app.register_blueprint(auth)
    app.register_blueprint(admin)
    app.register_blueprint(errors)
    app.register_blueprint(api)

    # Register CLI commands
    from app.cli import register_commands

    register_commands(app)

    from app.errors import (
        ValidationError,
        ResourceNotFoundError,
        AuthorizationError,
        handle_validation_error,
    )
    from flask import request, jsonify

    @app.errorhandler(ValidationError)
    def handle_validation_exception(error):
        # Try the API handler first
        api_response = handle_validation_error(error)
        if api_response:
            return api_response

        # Fall back to HTML template
        return render_template("errors/422.html", error_message=str(error)), 422

    @app.errorhandler(ResourceNotFoundError)
    def handle_resource_not_found_exception(error):
        if request.path.startswith("/api/"):
            return (
                jsonify(
                    {
                        "error": "Resource Not Found",
                        "message": str(error),
                        "resource_type": error.resource_type,
                        "resource_id": error.resource_id,
                        "code": 404,
                    }
                ),
                404,
            )
        return render_template("errors/404.html"), 404

    @app.errorhandler(AuthorizationError)
    def handle_authorization_exception(error):
        if request.path.startswith("/api/"):
            return (
                jsonify(
                    {"error": "Authorization Error", "message": str(error), "code": 403}
                ),
                403,
            )
        return render_template("errors/403.html"), 403

    # Create database tables
    with app.app_context():
        db.create_all()
        from app.models import Role

        Role.insert_roles()

    setup_logging(app)

    return app

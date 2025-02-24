# app/errors.py
from flask import Blueprint, render_template, current_app, jsonify, request
from app import db
import logging
import traceback

errors = Blueprint("errors", __name__)
logger = logging.getLogger(__name__)


def wants_json_response():
    """Check if the client expects a JSON response"""
    return (
        request.accept_mimetypes.best == "application/json"
        or request.path.startswith("/api/")
    )


@errors.app_errorhandler(400)
def bad_request_error(error):
    logger.error(f"Bad request error: {error}")
    if wants_json_response():
        return (
            jsonify(
                {
                    "error": "Bad Request",
                    "message": getattr(error, "description", str(error)),
                    "code": 400,
                }
            ),
            400,
        )
    return render_template("errors/400.html"), 400


@errors.app_errorhandler(401)
def unauthorized_error(error):
    logger.error(f"Unauthorized access attempt: {error}")
    if wants_json_response():
        return (
            jsonify(
                {
                    "error": "Unauthorized",
                    "message": "Authentication is required to access this resource",
                    "code": 401,
                }
            ),
            401,
        )
    return render_template("errors/401.html"), 401


@errors.app_errorhandler(403)
def forbidden_error(error):
    logger.error(f"Forbidden access attempt: {error}")
    if wants_json_response():
        return (
            jsonify(
                {
                    "error": "Forbidden",
                    "message": "You don't have permission to access this resource",
                    "code": 403,
                }
            ),
            403,
        )
    return render_template("errors/403.html"), 403


@errors.app_errorhandler(404)
def not_found_error(error):
    logger.error(f"Page not found: {error}")
    if wants_json_response():
        return (
            jsonify(
                {
                    "error": "Not Found",
                    "message": "The requested resource was not found",
                    "code": 404,
                }
            ),
            404,
        )
    return render_template("errors/404.html"), 404


@errors.app_errorhandler(422)
def unprocessable_entity_error(error):
    logger.error(f"Unprocessable entity: {error}")
    if wants_json_response():
        # Extract validation errors if available
        messages = getattr(error, "data", {}).get("messages", {})
        if not messages:
            messages = {"error": getattr(error, "description", "Invalid input")}

        return (
            jsonify(
                {
                    "error": "Unprocessable Entity",
                    "message": "The request data couldn't be processed",
                    "validation_errors": messages,
                    "code": 422,
                }
            ),
            422,
        )
    return render_template("errors/422.html"), 422


@errors.app_errorhandler(500)
def internal_error(error):
    # Roll back any failed transactions
    db.session.rollback()

    # Get detailed error information
    error_traceback = traceback.format_exc()
    error_type = type(error).__name__
    error_message = str(error)

    # Log the full traceback
    logger.error(
        f"Server Error: {error_type} - {error_message}\n"
        f"Traceback: {error_traceback}"
    )

    # Notify administrators if in production
    if not current_app.debug:
        # Here you could add email notification or other alerting
        # e.g., send_error_notification(error_type, error_message, error_traceback)
        pass

    if wants_json_response():
        # Don't expose detailed error info in API responses
        return (
            jsonify(
                {
                    "error": "Internal Server Error",
                    "message": "An unexpected error occurred",
                    "code": 500,
                }
            ),
            500,
        )

    return render_template("errors/500.html"), 500


# Custom handler for any other HTTP error
@errors.app_errorhandler(Exception)
def handle_exception(error):
    # First try to handle it as an HTTP exception if it has a code attribute
    if hasattr(error, "code") and isinstance(error.code, int):
        error_code = error.code
        error_title = getattr(error, "name", "Error")
        error_message = getattr(error, "description", str(error))

        # Log the error
        logger.error(f"HTTP Error {error_code}: {error_title} - {error_message}")

        # Try to find a specific template for this error code
        try:
            return render_template(f"errors/{error_code}.html"), error_code
        except:
            # Fall back to generic template
            return (
                render_template(
                    "errors/generic.html",
                    error_code=error_code,
                    error_title=error_title,
                    error_message=error_message,
                ),
                error_code,
            )

    # For non-HTTP exceptions, use the 500 handler
    return internal_error(error)


# Custom validation error handler for API requests
def handle_validation_error(error_obj):
    """Handle ValidationError for API requests"""
    if wants_json_response():
        errors = {}
        if hasattr(error_obj, "field") and error_obj.field:
            errors[error_obj.field] = error_obj.message
        else:
            errors["_general"] = error_obj.message

        return (
            jsonify(
                {
                    "error": "Validation Error",
                    "message": str(error_obj),
                    "validation_errors": errors,
                    "code": 422,
                }
            ),
            422,
        )
    return None  # Let the normal error handler take care of it


# Custom exception for application-specific errors
class FinanceAppError(Exception):
    """Base exception class for Finance App"""

    def __init__(self, message, error_type="General Error", status_code=500):
        super().__init__(message)
        self.message = message
        self.error_type = error_type
        self.status_code = status_code
        logger.error(f"{error_type}: {message}")


# Specialized error types
class ValidationError(FinanceAppError):
    """Raised when data validation fails"""

    def __init__(self, message, field=None):
        super().__init__(message, error_type="Validation Error", status_code=422)
        self.field = field


class ResourceNotFoundError(FinanceAppError):
    """Raised when a requested resource doesn't exist"""

    def __init__(self, resource_type, resource_id):
        message = f"{resource_type} with ID {resource_id} not found"
        super().__init__(
            message, error_type="Resource Not Found Error", status_code=404
        )
        self.resource_type = resource_type
        self.resource_id = resource_id


class AuthorizationError(FinanceAppError):
    """Raised when a user tries to access something they're not authorized for"""

    def __init__(self, message="You don't have permission to perform this action"):
        super().__init__(message, error_type="Authorization Error", status_code=403)

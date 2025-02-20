# app/errors.py
from flask import Blueprint, render_template
from app import db
import logging

errors = Blueprint("errors", __name__)
logger = logging.getLogger(__name__)


@errors.app_errorhandler(404)
def not_found_error(error):
    logger.error(f"Page not found: {error}")
    return render_template("errors/404.html"), 404


@errors.app_errorhandler(500)
def internal_error(error):
    db.session.rollback()
    logger.error(f"Server Error: {error}")
    return render_template("errors/500.html"), 500


@errors.app_errorhandler(403)
def forbidden_error(error):
    logger.error(f"Forbidden access attempt: {error}")
    return render_template("errors/403.html"), 403


# Custom exception for logging
class FinanceAppError(Exception):
    """Base exception class for Finance App"""

    def __init__(self, message, error_type="General Error", status_code=500):
        super().__init__(message)
        self.message = message
        self.error_type = error_type
        self.status_code = status_code
        logger.error(f"{error_type}: {message}")


from flask import Blueprint, render_template, flash, redirect, url_for, request
from flask_login import login_required, current_user
from app import db
from app.models import Paycheck, Expense, SalaryProjection

main = Blueprint("main", __name__)


@main.route("/")
@main.route("/index")
@login_required
def index():
    return render_template("index.html", title="Home")


@main.route("/dashboard")
@login_required
def dashboard():
    recent_paychecks = (
        Paycheck.query.filter_by(user_id=current_user.id)
        .order_by(Paycheck.date.desc())
        .limit(5)
        .all()
    )
    recent_expenses = (
        Expense.query.filter_by(user_id=current_user.id)
        .order_by(Expense.date.desc())
        .limit(5)
        .all()
    )
    return render_template(
        "dashboard.html",
        title="Dashboard",
        paychecks=recent_paychecks,
        expenses=recent_expenses,
    )

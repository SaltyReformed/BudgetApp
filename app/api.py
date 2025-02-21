# app/api.py
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from app import db
from app.models import Paycheck, Expense
from datetime import datetime
import json

api = Blueprint("api", __name__)


@api.route("/api/income", methods=["POST"])
@login_required
def add_income():
    data = request.get_json()

    if not data:
        return jsonify({"error": "No data provided"}), 400

    try:
        # Parse the date
        date = datetime.strptime(data.get("date"), "%Y-%m-%d").date()

        # Determine pay type based on income_type
        income_type = data.get("income_type")
        description = data.get("description", "")

        if income_type == "salary":
            pay_type = "Regular"
        elif income_type == "phoneStipend":
            pay_type = "Phone Stipend"
        elif income_type == "otherIncome":
            pay_type = "Other Income"
        elif income_type == "taxReturn":
            pay_type = "Tax Return"
        elif income_type == "transfer":
            pay_type = "Transfer"
        else:
            pay_type = income_type.capitalize()

        # Get amount
        amount = float(data.get("amount", 0))

        # Simple tax calculation - assume 75% is taxable for regular income, 0% for other types
        if income_type == "salary":
            taxable = amount * 0.75
            non_taxable = amount * 0.25
            net_amount = amount * 0.85  # Simplified calculation assuming 15% tax
        else:
            # For non-salary income, assume no tax
            taxable = 0
            non_taxable = amount
            net_amount = amount

        # Create new paycheck
        paycheck = Paycheck(
            date=date,
            pay_type=pay_type,
            gross_amount=amount,
            taxable_amount=taxable,
            non_taxable_amount=non_taxable,
            net_amount=net_amount,
            phone_stipend=(income_type == "phoneStipend"),
            user_id=current_user.id,
        )

        db.session.add(paycheck)
        db.session.commit()

        return (
            jsonify(
                {
                    "success": True,
                    "message": "Income added successfully",
                    "paycheck": {
                        "id": paycheck.id,
                        "date": paycheck.date.strftime("%Y-%m-%d"),
                        "pay_type": paycheck.pay_type,
                        "gross_amount": float(paycheck.gross_amount),
                        "net_amount": float(paycheck.net_amount),
                    },
                }
            ),
            201,
        )

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@api.route("/api/expense", methods=["POST"])
@login_required
def add_expense():
    data = request.get_json()

    if not data:
        return jsonify({"error": "No data provided"}), 400

    try:
        # Parse the date
        date = datetime.strptime(data.get("date"), "%Y-%m-%d").date()

        # Create new expense
        expense = Expense(
            date=date,
            category=data.get("category"),
            description=data.get("description", ""),
            amount=float(data.get("amount", 0)),
            recurring=data.get("recurring", False),
            frequency=data.get("frequency") if data.get("recurring", False) else None,
            user_id=current_user.id,
        )

        db.session.add(expense)
        db.session.commit()

        return jsonify({"success": True, "message": "Expense added successfully"}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@api.route("/api/budget_data", methods=["GET"])
@login_required
def get_budget_data():
    """Get all budget data for the current user"""
    try:
        # Get income data
        paychecks = Paycheck.query.filter_by(user_id=current_user.id).all()
        income_data = []

        for paycheck in paychecks:
            income_type = "salary"
            if paycheck.pay_type == "Phone Stipend":
                income_type = "phoneStipend"
            elif paycheck.pay_type == "Other Income":
                income_type = "otherIncome"

            income_data.append(
                {
                    "id": paycheck.id,
                    "date": paycheck.date.strftime("%Y-%m-%d"),
                    "income_type": income_type,
                    "amount": float(paycheck.gross_amount),
                    "net_amount": float(paycheck.net_amount),
                }
            )

        # Get expense data
        expenses = Expense.query.filter_by(user_id=current_user.id).all()
        expense_data = []

        for expense in expenses:
            expense_data.append(
                {
                    "id": expense.id,
                    "date": expense.date.strftime("%Y-%m-%d"),
                    "category": expense.category,
                    "description": expense.description,
                    "amount": float(expense.amount),
                    "recurring": expense.recurring,
                    "frequency": expense.frequency,
                }
            )

        return jsonify({"income": income_data, "expenses": expense_data})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api.route("/api/income/add", methods=["GET", "POST"])
@login_required
def add_one_time_income():
    """Form to add one-time income"""
    from flask_wtf import FlaskForm
    from wtforms import StringField, FloatField, DateField, SelectField, SubmitField
    from wtforms.validators import DataRequired, NumberRange
    from datetime import datetime

    class IncomeForm(FlaskForm):
        income_type = SelectField(
            "Income Type",
            choices=[
                ("otherIncome", "Other Income"),
                ("salary", "Salary"),
                ("phoneStipend", "Phone Stipend"),
                ("taxReturn", "Tax Return"),
                ("transfer", "Transfer from Savings"),
            ],
            validators=[DataRequired()],
        )
        description = StringField("Description")
        date = DateField("Date", validators=[DataRequired()], default=datetime.today)
        amount = FloatField("Amount", validators=[DataRequired(), NumberRange(min=0)])
        submit = SubmitField("Add Income")

    form = IncomeForm()

    if form.validate_on_submit():
        # Process form data
        income_type = form.income_type.data

        # Determine pay type based on income_type
        if income_type == "salary":
            pay_type = "Regular"
        elif income_type == "phoneStipend":
            pay_type = "Phone Stipend"
        elif income_type == "otherIncome":
            pay_type = "Other Income"
        elif income_type == "taxReturn":
            pay_type = "Tax Return"
        elif income_type == "transfer":
            pay_type = "Transfer"
        else:
            pay_type = income_type.capitalize()

        # Get amount
        amount = form.amount.data

        # Simple tax calculation - assume 75% is taxable for regular income, 0% for other types
        if income_type == "salary":
            taxable = amount * 0.75
            non_taxable = amount * 0.25
            net_amount = amount * 0.85  # Simplified calculation assuming 15% tax
        else:
            # For non-salary income, assume no tax
            taxable = 0
            non_taxable = amount
            net_amount = amount

        # Create new paycheck
        paycheck = Paycheck(
            date=form.date.data,
            pay_type=pay_type,
            gross_amount=amount,
            taxable_amount=taxable,
            non_taxable_amount=non_taxable,
            net_amount=net_amount,
            phone_stipend=(income_type == "phoneStipend"),
            user_id=current_user.id,
        )

        db.session.add(paycheck)
        try:
            db.session.commit()
            flash(f"{pay_type} income of ${amount:.2f} added successfully!")
            return redirect(url_for("main.budget"))
        except Exception as e:
            db.session.rollback()
            flash(f"Error adding income: {str(e)}")

    return render_template(
        "finance/add_income.html", form=form, title="Add One-Time Income"
    )

# app/routes.py
from flask import Blueprint, render_template, flash, redirect, url_for, request, jsonify
from flask_login import login_required, current_user
from app import db
from app.models import Paycheck, Expense, SalaryProjection
from app.errors import FinanceAppError
from app.forms import PaycheckForm, ExpenseForm
from datetime import datetime, timedelta
import json

main = Blueprint("main", __name__)


@main.route("/")
@main.route("/index")
@login_required
def index():
    return render_template("index.html", title="Home")


@main.route("/paycheck/add", methods=["GET", "POST"])
@login_required
def add_paycheck():
    form = PaycheckForm()
    if form.validate_on_submit():
        paycheck = Paycheck(
            date=form.date.data,
            pay_type=form.pay_type.data,
            gross_amount=form.gross_amount.data,
            taxable_amount=form.taxable_amount.data,
            non_taxable_amount=form.non_taxable_amount.data,
            phone_stipend=form.phone_stipend.data,
            user_id=current_user.id,
            net_amount=form.gross_amount.data
            - (form.taxable_amount.data * 0.25),  # Simplified tax calculation
        )
        db.session.add(paycheck)
        try:
            db.session.commit()
            flash("Paycheck added successfully!")
            return redirect(url_for("main.dashboard"))
        except Exception as e:
            db.session.rollback()
            flash("Error adding paycheck. Please try again.")
    return render_template("finance/add_paycheck.html", title="Add Paycheck", form=form)


@main.route("/expense/add", methods=["GET", "POST"])
@login_required
def add_expense():
    form = ExpenseForm()
    if form.validate_on_submit():
        expense = Expense(
            date=form.date.data,
            category=form.category.data,
            description=form.description.data,
            amount=form.amount.data,
            recurring=form.recurring.data,
            frequency=form.frequency.data if form.recurring.data else None,
            user_id=current_user.id,
        )
        db.session.add(expense)
        try:
            db.session.commit()
            flash("Expense added successfully!")
            return redirect(url_for("main.dashboard"))
        except Exception as e:
            db.session.rollback()
            flash("Error adding expense. Please try again.")
    return render_template("finance/add_expense.html", title="Add Expense", form=form)


@main.route("/dashboard")
@login_required
def dashboard():
    # Fetch recent paychecks and expenses
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

    # Calculate totals
    all_paychecks = Paycheck.query.filter_by(user_id=current_user.id).all()
    all_expenses = Expense.query.filter_by(user_id=current_user.id).all()

    total_income = sum(p.net_amount for p in all_paychecks)
    total_expenses = sum(e.amount for e in all_expenses)

    # Prepare data for charts
    paycheck_data = [
        {
            "date": paycheck.date.isoformat(),
            "gross_amount": float(paycheck.gross_amount),
            "net_amount": float(paycheck.net_amount),
            "pay_type": paycheck.pay_type,
        }
        for paycheck in Paycheck.query.filter_by(user_id=current_user.id)
        .order_by(Paycheck.date.asc())
        .limit(12)
        .all()
    ]

    expense_data = [
        {
            "date": expense.date.isoformat(),
            "amount": float(expense.amount),
            "category": expense.category,
            "description": expense.description,
        }
        for expense in Expense.query.filter_by(user_id=current_user.id)
        .order_by(Expense.date.asc())
        .limit(12)
        .all()
    ]

    return render_template(
        "dashboard.html",
        title="Dashboard",
        paychecks=recent_paychecks,
        expenses=recent_expenses,
        total_income=total_income,
        total_expenses=total_expenses,
        paycheck_data=paycheck_data,
        expense_data=expense_data,
    )


# app/routes.py - Update the budget route


@main.route("/budget")
@login_required
def budget():
    # Get the user's pay periods (bi-weekly)
    today = datetime.today()
    # Get last 3 months of bi-weekly periods
    periods = []
    current_date = today
    for i in range(6):  # 6 bi-weekly periods
        periods.append({"id": i + 1, "date": current_date.strftime("%m/%d/%Y")})
        current_date -= timedelta(days=14)  # Go back 2 weeks

    periods.reverse()  # Show oldest to newest

    # Get the user's financial data
    paychecks = Paycheck.query.filter_by(user_id=current_user.id).all()
    expenses = Expense.query.filter_by(user_id=current_user.id).all()

    # Calculate summary
    total_income = sum(p.net_amount for p in paychecks) if paychecks else 0
    total_expenses = sum(e.amount for e in expenses) if expenses else 0
    net = total_income - total_expenses

    # Process data for each period
    period_data = {}
    for period in periods:
        period_id = period["id"]
        period_data[period_id] = {
            "income": {
                "salary": 0,
                "phoneStipend": 0,
                "otherIncome": 0,
                "taxReturn": 0,
                "transfer": 0,
                "total": 0,
            },
            "expenses": {},
            "net": 0,
        }

    # Map paychecks to periods - this is simplified and would need custom logic
    # for your specific date mapping requirements
    for paycheck in paychecks:
        # Find the closest period
        paycheck_date = paycheck.date
        closest_period = None
        min_diff = float("inf")

        for period in periods:
            period_date = datetime.strptime(period["date"], "%m/%d/%Y").date()
            diff = abs((paycheck_date - period_date).days)
            if diff < min_diff:
                min_diff = diff
                closest_period = period["id"]

        if closest_period:
            # Determine income type
            income_type = "salary"
            if paycheck.pay_type == "Phone Stipend":
                income_type = "phoneStipend"
            elif paycheck.pay_type == "Other Income":
                income_type = "otherIncome"
            elif paycheck.pay_type == "Tax Return":
                income_type = "taxReturn"
            elif paycheck.pay_type == "Transfer":
                income_type = "transfer"

            # Add to period data
            if closest_period in period_data:
                period_data[closest_period]["income"][income_type] += float(
                    paycheck.net_amount
                )
                period_data[closest_period]["income"]["total"] += float(
                    paycheck.net_amount
                )

    summary = {
        "totalIncome": float(total_income),
        "totalExpenses": float(total_expenses),
        "net": float(net),
        "projectedBalance": float(net),  # You can adjust this calculation as needed
    }

    # Convert to JSON for React
    periods_json = json.dumps(periods)
    summary_json = json.dumps(summary)
    period_data_json = json.dumps(period_data)

    return render_template(
        "finance/budget.html",
        title="Budget Tracker",
        periods_json=periods_json,
        summary_json=summary_json,
        period_data_json=period_data_json,
    )

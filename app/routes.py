# app/routes.py
from flask import Blueprint, render_template, flash, redirect, url_for, request, jsonify
from flask_login import login_required, current_user
from app import db
from app.models import Paycheck, Expense, SalaryProjection
from app.errors import FinanceAppError
from app.forms import PaycheckForm, ExpenseForm, SalaryForecastForm
from datetime import datetime, timedelta
import json
from app.utils.paycheck_generator import create_salary_paychecks

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


# Update the dashboard route in app/routes.py


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

    # Get the current salary projection
    current_salary = SalaryProjection.query.filter_by(
        user_id=current_user.id, is_current=True
    ).first()

    # Prepare salary data for the dashboard
    salary_data = None
    if current_salary:
        salary_data = {
            "annualGross": float(current_salary.annual_salary),
            "annualNet": float(
                current_salary.annual_salary * (1 - (current_salary.tax_rate / 100))
            ),
            "biweeklyGross": float(current_salary.calculate_biweekly_gross()),
            "biweeklyNet": float(current_salary.calculate_biweekly_net()),
            "taxRate": float(current_salary.tax_rate),
        }

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

    # Convert data to JSON for JavaScript
    paychecks_json = json.dumps(paycheck_data)
    expenses_json = json.dumps(expense_data)
    salary_json = json.dumps(salary_data) if salary_data else "null"

    return render_template(
        "dashboard.html",
        title="Dashboard",
        paychecks=recent_paychecks,
        expenses=recent_expenses,
        total_income=total_income,
        total_expenses=total_expenses,
        paychecks_json=paychecks_json,
        expenses_json=expenses_json,
        salary_json=salary_json,
    )


@main.route("/budget", methods=["GET", "POST"])
@login_required
def budget():
    # Set default date range (last 3 months to today)
    today = datetime.today().date()
    default_start_date = today - timedelta(weeks=2)
    default_end_date = today + timedelta(weeks=52)

    # Get date range from query parameters or form submission
    start_date = (
        request.args.get("start_date")
        or request.form.get("start_date")
        or default_start_date.strftime("%Y-%m-%d")
    )
    end_date = (
        request.args.get("end_date")
        or request.form.get("end_date")
        or default_end_date.strftime("%Y-%m-%d")
    )

    # Get starting balance (optional)
    starting_balance = (
        request.args.get("starting_balance")
        or request.form.get("starting_balance")
        or "0"
    )
    try:
        starting_balance = float(starting_balance)
    except ValueError:
        starting_balance = 0

    # Convert string dates to datetime objects
    try:
        start_date_obj = datetime.strptime(start_date, "%Y-%m-%d").date()
        end_date_obj = datetime.strptime(end_date, "%Y-%m-%d").date()
    except ValueError:
        # If there's an issue with the dates, use defaults
        start_date_obj = default_start_date
        end_date_obj = default_end_date
        start_date = default_start_date.strftime("%Y-%m-%d")
        end_date = default_end_date.strftime("%Y-%m-%d")

    # Ensure end_date is not before start_date
    if end_date_obj < start_date_obj:
        end_date_obj = start_date_obj
        end_date = start_date

    # Get all paychecks for the user within the selected date range
    paychecks_in_range = (
        Paycheck.query.filter_by(user_id=current_user.id)
        .filter(Paycheck.date >= start_date_obj, Paycheck.date <= end_date_obj)
        .order_by(Paycheck.date)
        .all()
    )

    # Get the expenses within the date range
    expenses = (
        Expense.query.filter_by(user_id=current_user.id)
        .filter(Expense.date >= start_date_obj, Expense.date <= end_date_obj)
        .order_by(Expense.date)
        .all()
    )

    # Determine the pay periods based on actual paycheck dates
    # We'll group paychecks that fall on the same day
    paycheck_dates = {}
    for paycheck in paychecks_in_range:
        date_str = paycheck.date.strftime("%Y-%m-%d")
        if date_str not in paycheck_dates:
            paycheck_dates[date_str] = []
        paycheck_dates[date_str].append(paycheck)

    # If no paychecks in the range, use biweekly periods as fallback
    if not paycheck_dates:
        # Start from start_date and generate biweekly periods
        current_date = start_date_obj
        while current_date <= end_date_obj:
            date_str = current_date.strftime("%Y-%m-%d")
            paycheck_dates[date_str] = (
                []
            )  # Empty list means no actual paychecks on this date
            current_date += timedelta(days=14)  # Biweekly

    # Sort the dates chronologically
    sorted_dates = sorted(paycheck_dates.keys())

    # Create the periods list
    periods = []
    for i, date_str in enumerate(sorted_dates):
        period_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        periods.append(
            {
                "id": i + 1,
                "date": period_date.strftime("%m/%d/%Y"),
                "date_obj": period_date,
                "paychecks": paycheck_dates[date_str],
            }
        )

    # Calculate start and end date for each period
    for i, period in enumerate(periods):
        # For the first period, start from the selected start date
        if i == 0:
            period_start = start_date_obj
        else:
            # Start from the day after the previous period's date
            period_start = periods[i - 1]["date_obj"] + timedelta(days=1)

        # End date is either the day before the next period or the end_date_obj
        if i < len(periods) - 1:
            period_end = periods[i + 1]["date_obj"] - timedelta(days=1)
        else:
            period_end = end_date_obj

        period["start_date"] = period_start
        period["end_date"] = period_end

    # Calculate summary
    total_income = (
        sum(p.net_amount for p in paychecks_in_range) if paychecks_in_range else 0
    )
    total_expenses = sum(e.amount for e in expenses) if expenses else 0
    net = total_income - total_expenses
    projected_balance = starting_balance + net

    # Define summary dict for template
    summary = {
        "totalIncome": float(total_income),
        "totalExpenses": float(total_expenses),
        "net": float(net),
        "startingBalance": float(starting_balance),
        "projectedBalance": float(projected_balance),
    }

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

        # Add the paycheck amounts directly
        for paycheck in period["paychecks"]:
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
            period_data[period_id]["income"][income_type] += float(paycheck.net_amount)
            period_data[period_id]["income"]["total"] += float(paycheck.net_amount)

    # Map expenses to periods based on date ranges
    for expense in expenses:
        expense_date = expense.date

        # Find the period that contains this date
        for period in periods:
            if period["start_date"] <= expense_date <= period["end_date"]:
                period_id = period["id"]

                # Get or create category
                category = expense.category.lower()
                if category not in period_data[period_id]["expenses"]:
                    period_data[period_id]["expenses"][category] = 0

                # Add expense amount
                period_data[period_id]["expenses"][category] += float(expense.amount)

                # Update net for the period
                period_data[period_id]["net"] = period_data[period_id]["income"][
                    "total"
                ] - sum(period_data[period_id]["expenses"].values())
                break

    # For JSON serialization (for future use if needed)
    periods_json = json.dumps(
        [
            {
                "id": period["id"],
                "date": period["date"],
            }
            for period in periods
        ]
    )

    summary_json = json.dumps(summary)
    period_data_json = json.dumps(period_data)
    paycheck_data_json = json.dumps(
        [
            {
                "id": paycheck.id,
                "date": paycheck.date.strftime("%Y-%m-%d"),
                "pay_type": paycheck.pay_type,
                "gross_amount": float(paycheck.gross_amount),
                "net_amount": float(paycheck.net_amount),
            }
            for paycheck in paychecks_in_range
        ]
    )

    return render_template(
        "finance/budget.html",
        title="Budget Tracker",
        periods=periods,
        summary=summary,
        period_data=period_data,
        paychecks=paychecks_in_range,
        start_date=start_date,
        end_date=end_date,
        starting_balance=starting_balance,
        # Include these for backward compatibility or future use
        periods_json=periods_json,
        summary_json=summary_json,
        period_data_json=period_data_json,
        paycheck_data_json=paycheck_data_json,
    )


@main.route("/salary/history")
@login_required
def salary_history():
    """View all historical salary projections"""
    projections = (
        SalaryProjection.query.filter_by(user_id=current_user.id)
        .order_by(SalaryProjection.start_date.desc())
        .all()
    )

    return render_template(
        "finance/salary_history.html", title="Salary History", projections=projections
    )


@main.route("/salary/delete/<int:id>", methods=["POST"])
@login_required
def delete_salary(id):
    """Delete a salary projection"""
    projection = SalaryProjection.query.filter_by(
        id=id, user_id=current_user.id
    ).first_or_404()

    db.session.delete(projection)
    try:
        db.session.commit()
        flash("Salary projection deleted successfully.")
    except Exception as e:
        db.session.rollback()
        flash(f"Error deleting salary projection: {str(e)}")

    return redirect(url_for("main.salary_history"))


@main.route("/salary/generate-paychecks", methods=["GET", "POST"])
@login_required
def generate_paychecks():
    """Generate paychecks from salary forecasts"""

    # Get all the user's salary projections
    salary_projections = (
        SalaryProjection.query.filter_by(user_id=current_user.id)
        .order_by(SalaryProjection.start_date.asc())
        .all()
    )

    if not salary_projections:
        flash("No salary forecasts found. Please create one first.")
        return redirect(url_for("main.salary_forecast"))

    # Default dates
    today = datetime.today().date()
    default_first_paycheck = today
    default_end = today + timedelta(days=365)  # 1 year ahead

    if request.method == "POST":
        # Parse form input
        first_paycheck_date = datetime.strptime(
            request.form.get("first_paycheck_date"), "%Y-%m-%d"
        ).date()
        end_date = datetime.strptime(request.form.get("end_date"), "%Y-%m-%d").date()
        frequency = int(
            request.form.get("frequency", "14")
        )  # Default to biweekly (14 days)
        force_regenerate = "force_regenerate" in request.form

        # Generate paychecks
        success, message, paychecks = create_salary_paychecks(
            user_id=current_user.id,
            first_paycheck_date=first_paycheck_date,
            end_date=end_date,
            frequency=frequency,
            force_regenerate=force_regenerate,
        )

        flash(message)

        if success:
            return redirect(url_for("main.dashboard"))

    # Get existing paychecks for display
    existing_paychecks = (
        Paycheck.query.filter_by(user_id=current_user.id, pay_type="Regular")
        .filter(Paycheck.date >= today)
        .order_by(Paycheck.date.asc())
        .all()
    )

    # Prepare a list of salary periods for display
    salary_periods = []
    for projection in salary_projections:
        end_date_str = (
            projection.end_date.strftime("%b %d, %Y")
            if projection.end_date
            else "No end date"
        )
        period = {
            "id": projection.id,
            "start_date": projection.start_date.strftime("%b %d, %Y"),
            "end_date": end_date_str,
            "annual_salary": projection.annual_salary,
            "biweekly_gross": projection.calculate_biweekly_gross(),
            "biweekly_net": projection.calculate_biweekly_net(),
        }
        salary_periods.append(period)

    return render_template(
        "finance/generate_paychecks.html",
        title="Generate Paychecks",
        salary_projections=salary_projections,
        salary_periods=salary_periods,
        default_first_paycheck=default_first_paycheck,
        default_end=default_end,
        existing_paychecks=existing_paychecks,
    )


@main.route("/salary/forecast", methods=["GET", "POST"])
@login_required
def salary_forecast():
    form = SalaryForecastForm()

    # Load existing current salary projection if available
    current_projection = SalaryProjection.query.filter_by(
        user_id=current_user.id, is_current=True
    ).first()

    if current_projection and request.method == "GET":
        # Pre-populate form with current salary data
        form.start_date.data = current_projection.start_date
        form.end_date.data = current_projection.end_date
        form.annual_salary.data = current_projection.annual_salary
        form.tax_rate.data = current_projection.tax_rate
        form.is_current.data = current_projection.is_current
        form.notes.data = current_projection.notes

    forecast_data = None

    if form.validate_on_submit():
        # If setting as current salary, update any existing current projections
        if form.is_current.data:
            SalaryProjection.query.filter_by(
                user_id=current_user.id, is_current=True
            ).update({"is_current": False})

        # Create new salary projection
        projection = SalaryProjection(
            start_date=form.start_date.data,
            end_date=form.end_date.data,
            annual_salary=form.annual_salary.data,
            tax_rate=form.tax_rate.data,
            is_current=form.is_current.data,
            notes=form.notes.data,
            user_id=current_user.id,
        )

        db.session.add(projection)
        try:
            db.session.commit()
            flash("Salary forecast created successfully!")

            # The updated auto-generate functionality begins here
            if request.form.get("auto_generate_paychecks"):
                # Get the specified first paycheck date, default to the start date
                first_paycheck_date = projection.start_date

                try:
                    if request.form.get("first_paycheck_date"):
                        first_paycheck_date = datetime.strptime(
                            request.form.get("first_paycheck_date"), "%Y-%m-%d"
                        ).date()
                except:
                    pass  # Use the default if parsing fails

                # End date is either the projection end date or 1 year from start if not specified
                end_date = projection.end_date or (
                    projection.start_date.replace(year=projection.start_date.year + 1)
                )

                # Generate the paychecks using the improved generator
                success, message, _ = create_salary_paychecks(
                    user_id=current_user.id,
                    first_paycheck_date=first_paycheck_date,
                    end_date=end_date,
                    frequency=14,  # Default to biweekly
                    force_regenerate=False,
                )

                if success:
                    flash("Paychecks have been automatically generated!")
                else:
                    flash(message)
            # End of updated auto-generate functionality

            # Generate forecast data for display
            forecast_data = {
                "projection": projection,
                "periods": projection.get_pay_periods(),
                "annual": {
                    "gross": projection.annual_salary,
                    "net": projection.annual_salary * (1 - (projection.tax_rate / 100)),
                },
                "biweekly": {
                    "gross": projection.calculate_biweekly_gross(),
                    "net": projection.calculate_biweekly_net(),
                },
            }

        except Exception as e:
            db.session.rollback()
            flash(f"Error creating salary forecast: {str(e)}")

    # Get historical salary projections for the user
    history = (
        SalaryProjection.query.filter_by(user_id=current_user.id)
        .order_by(SalaryProjection.start_date.desc())
        .all()
    )

    return render_template(
        "finance/salary_forecast.html",
        title="Salary Forecast",
        form=form,
        history=history,
        forecast_data=forecast_data,
    )


@main.route("/salary/manage-paychecks")
@login_required
def manage_paychecks():
    """View and manage all paychecks"""

    # Get all paychecks for the user, ordered by date
    paychecks = (
        Paycheck.query.filter_by(user_id=current_user.id)
        .order_by(Paycheck.date.desc())
        .all()
    )

    return render_template(
        "finance/manage_paychecks.html", title="Manage Paychecks", paychecks=paychecks
    )


@main.route("/salary/edit-paycheck/<int:id>", methods=["GET", "POST"])
@login_required
def edit_paycheck(id):
    """Edit an individual paycheck"""

    paycheck = Paycheck.query.filter_by(id=id, user_id=current_user.id).first_or_404()

    # Create a form and populate it with the paycheck data
    form = PaycheckForm()

    if form.validate_on_submit():
        # Update paycheck data
        paycheck.date = form.date.data
        paycheck.pay_type = form.pay_type.data
        paycheck.gross_amount = form.gross_amount.data
        paycheck.taxable_amount = form.taxable_amount.data
        paycheck.non_taxable_amount = form.non_taxable_amount.data
        paycheck.phone_stipend = form.phone_stipend.data

        # Calculate net amount
        paycheck.net_amount = form.gross_amount.data - (form.taxable_amount.data * 0.25)

        try:
            db.session.commit()
            flash("Paycheck updated successfully!")
            return redirect(url_for("main.manage_paychecks"))
        except Exception as e:
            db.session.rollback()
            flash(f"Error updating paycheck: {str(e)}")

    # Pre-populate form with existing data
    elif request.method == "GET":
        form.date.data = paycheck.date
        form.pay_type.data = paycheck.pay_type
        form.gross_amount.data = paycheck.gross_amount
        form.taxable_amount.data = paycheck.taxable_amount
        form.non_taxable_amount.data = paycheck.non_taxable_amount
        form.phone_stipend.data = paycheck.phone_stipend

    return render_template(
        "finance/edit_paycheck.html",
        title="Edit Paycheck",
        form=form,
        paycheck=paycheck,
    )


@main.route("/salary/delete-paycheck/<int:id>", methods=["POST"])
@login_required
def delete_paycheck(id):
    """Delete an individual paycheck"""

    paycheck = Paycheck.query.filter_by(id=id, user_id=current_user.id).first_or_404()

    try:
        db.session.delete(paycheck)
        db.session.commit()
        flash("Paycheck deleted successfully.")
    except Exception as e:
        db.session.rollback()
        flash(f"Error deleting paycheck: {str(e)}")

    return redirect(url_for("main.manage_paychecks"))

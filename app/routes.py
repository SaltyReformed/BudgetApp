# app/routes.py
import json
from datetime import date, datetime, timedelta

from flask import Blueprint, flash, jsonify, redirect, render_template, request, url_for
from flask_login import current_user, login_required
from sqlalchemy import asc, desc

from app import db
from app.errors import FinanceAppError
from app.forms import (
    ExpenseCategoryForm,
    ExpenseFilterForm,
    ExpenseForm,
    PaycheckForm,
    SalaryForecastForm,
)
from app.models import Expense, ExpenseCategory, Paycheck, SalaryProjection
from app.utils.paycheck_generator import create_salary_paychecks
from app.utils.expense_materializer import materialize_expense

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
    default_start_date = today - timedelta(weeks=1)
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

    # Get starting balance (optional) - We'll use 0 as the default
    # The JavaScript will handle persistence through localStorage
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

    # Get the base expenses within the date range
    base_expenses = (
        Expense.query.filter_by(user_id=current_user.id)
        .filter(Expense.date >= start_date_obj, Expense.date <= end_date_obj)
        .order_by(Expense.date)
        .all()
    )

    # Get all expenses within the date range (no need to generate virtual ones)
    all_expenses = (
        Expense.query.filter_by(user_id=current_user.id)
        .filter(Expense.date >= start_date_obj, Expense.date <= end_date_obj)
        .order_by(Expense.date)
        .all()
    )
    expenses = all_expenses  # Keep the original variable name for compatibility

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

    # Process data for each period
    period_data = {}
    running_balance = starting_balance  # Start with the initial balance
    
    # First create all period data
    for i, period in enumerate(periods):
        period_id = period["id"]
        
        # Create base structure for each period
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
            "startingBalance": 0,  # Will be set correctly in a second pass
            "net": 0,
            "endingBalance": 0,
        }
    
        # Count income for each period
        for paycheck in period["paychecks"]:
            income_type = "salary"
            if paycheck.pay_type == "Phone Stipend":
                income_type = "phoneStipend"
            elif paycheck.pay_type == "Other Income":
                income_type = "otherIncome"
            elif paycheck.pay_type == "Tax Return":
                income_type = "taxReturn"
            elif paycheck.pay_type == "Transfer":
                income_type = "transfer"
    
            period_data[period_id]["income"][income_type] += float(paycheck.    net_amount)
            period_data[period_id]["income"]["total"] += float(paycheck.    net_amount)
    
        # Count expenses for each period
        for expense in expenses:
            expense_date = expense.date
            if period["start_date"] <= expense_date <= period["end_date"]:
                category = expense.category.lower()
                if category not in period_data[period_id]["expenses"]:
                    period_data[period_id]["expenses"][category] = 0
                period_data[period_id]["expenses"][category] += float   (expense.amount)
    
        # Calculate net for this period
        period_total_income = period_data[period_id]["income"]["total"]
        period_total_expenses = sum(period_data[period_id]["expenses"]. values())
        period_data[period_id]["net"] = period_total_income -   period_total_expenses
    
    # Now do a second pass to calculate the running balance
    running_balance = starting_balance
    for i, period in enumerate(periods):
        period_id = period["id"]
        
        # Set the starting balance
        period_data[period_id]["startingBalance"] = running_balance
        
        # Calculate ending balance using the net we already computed
        period_data[period_id]["endingBalance"] = running_balance +     period_data[period_id]["net"]
        
        # Update running balance for next period
        running_balance = period_data[period_id]["endingBalance"]
    
    # Print debug info to the console
    print("\n=== PERIOD BALANCE DEBUG INFO ===")
    for period in periods:
        period_id = period["id"]
        period_date = period["date"]
        start_balance = period_data[period_id]["startingBalance"]
        net = period_data[period_id]["net"]
        end_balance = period_data[period_id]["endingBalance"]
        print(f"Period {period_id} ({period_date}): Starting=$  {start_balance:.2f}, Net=${net:.2f}, Ending=${end_balance:.2f}")
    print("================================\n")
    
    # Update summary to use the last period's ending balance
    total_income = sum(period_data[p["id"]]["income"]["total"] for p in     periods)
    total_expenses = sum(sum(period_data[p["id"]]["expenses"].values()) for     p in periods)
    net = total_income - total_expenses
    projected_balance = period_data[periods[-1]["id"]]["endingBalance"] if  periods else starting_balance
    
    # Update summary dict
    summary = {
        "totalIncome": float(total_income),
        "totalExpenses": float(total_expenses),
        "net": float(net),
        "startingBalance": float(starting_balance),
        "projectedBalance": float(projected_balance),
    }

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
    # Serialize periods for JSON
    serialized_periods = []
    for period in periods:
        serialized_period = {
            "id": period["id"],
            "date": period["date"],
            "start_date": period["start_date"].strftime("%Y-%m-%d"),
            "end_date": period["end_date"].strftime("%Y-%m-%d"),
        }
        serialized_periods.append(serialized_period)

    # Serialize expenses for JSON
    serialized_expenses = []
    for expense in all_expenses:  # Using the all_expenses variable that already exists
        serialized_expense = {
            "id": expense.id,
            "date": expense.date.strftime("%Y-%m-%d"),
            "description": expense.description,
            "category": expense.category,
            "amount": float(expense.amount),
            "paid": expense.paid,
            "recurring": expense.recurring,
        }
        serialized_expenses.append(serialized_expense)

    # Convert to JSON for the template
    periods_json = json.dumps(serialized_periods)
    expenses_json = json.dumps(serialized_expenses)
    

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
        all_expenses=all_expenses,  # This is important for the React component
        periods_json=periods_json,
        summary_json=summary_json,
        period_data_json=period_data_json,
        paycheck_data_json=paycheck_data_json,
        expenses_json=expenses_json,
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


# ============= EXPENSE MANAGEMENT =============


@main.route("/expenses", methods=["GET"])
@login_required
def manage_expenses():
    """View and manage all expenses on a single page"""
    # Initialize the filter form
    filter_form = ExpenseFilterForm()

    # Load all categories for the user for the filter form
    user_categories = (
        ExpenseCategory.query.filter_by(user_id=current_user.id)
        .order_by(ExpenseCategory.name)
        .all()
    )
    filter_form.category.choices = [(0, "All Categories")] + [
        (c.id, c.name) for c in user_categories
    ]

    # Get filter parameters from request
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    category_id = request.args.get("category", type=int)
    paid_status = request.args.get("paid_status", "all")
    sort_by = request.args.get("sort_by", "date")
    sort_order = request.args.get("sort_order", "desc")

    # Pre-fill the form with current filter values
    if start_date:
        filter_form.start_date.data = datetime.strptime(start_date, "%Y-%m-%d").date()
    if end_date:
        filter_form.end_date.data = datetime.strptime(end_date, "%Y-%m-%d").date()
    if category_id:
        filter_form.category.data = category_id
    if paid_status:
        filter_form.paid_status.data = paid_status
    if sort_by:
        filter_form.sort_by.data = sort_by
    if sort_order:
        filter_form.sort_order.data = sort_order

    # Start building the query
    query = Expense.query.filter_by(user_id=current_user.id)

    # Apply date filters
    if start_date:
        query = query.filter(
            Expense.date >= datetime.strptime(start_date, "%Y-%m-%d").date()
        )
    if end_date:
        query = query.filter(
            Expense.date <= datetime.strptime(end_date, "%Y-%m-%d").date()
        )

    # Apply category filter
    if category_id and category_id > 0:
        query = query.filter(Expense.category_id == category_id)

    # Apply paid status filter
    if paid_status == "paid":
        query = query.filter(Expense.paid == True)
    elif paid_status == "unpaid":
        query = query.filter(Expense.paid == False)
    elif paid_status == "overdue":
        query = query.filter(
            Expense.paid == False,
            Expense.due_date.isnot(None),
            Expense.due_date < date.today(),
        )
    elif paid_status == "due_soon":
        query = query.filter(
            Expense.paid == False,
            Expense.due_date.isnot(None),
            Expense.due_date >= date.today(),
            Expense.due_date <= date.today() + timedelta(days=7),
        )

    # Apply sorting
    sort_column = getattr(Expense, sort_by)
    if sort_by == "category":
        sort_column = Expense.category  # Use the category string field

    if sort_order == "desc":
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(asc(sort_column))

    # Execute the query
    expenses = query.all()

    # Compute summary statistics
    total_amount = sum(expense.amount for expense in expenses)
    unpaid_amount = sum(expense.amount for expense in expenses if not expense.paid)
    overdue_amount = sum(
        expense.amount
        for expense in expenses
        if not expense.paid and expense.due_date and expense.due_date < date.today()
    )

    # Group expenses by category for the chart
    category_totals = {}
    for expense in expenses:
        category = expense.category
        if category not in category_totals:
            category_totals[category] = 0
        category_totals[category] += expense.amount

    # Prepare category data for the template
    category_data = [
        {"name": cat, "amount": amt} for cat, amt in category_totals.items()
    ]
    category_data.sort(key=lambda x: x["amount"], reverse=True)

    return render_template(
        "finance/manage_expenses.html",
        title="Manage Expenses",
        expenses=expenses,
        filter_form=filter_form,
        total_amount=total_amount,
        unpaid_amount=unpaid_amount,
        overdue_amount=overdue_amount,
        category_data=category_data,
        categories=user_categories,
    )


@main.route("/expense/add", methods=["GET", "POST"])
@login_required
def add_expense():
    """Add a new expense and automatically materialize if recurring"""
    form = ExpenseForm()

    # Load categories for the form dropdown
    categories = ExpenseCategory.query.filter_by(user_id=current_user.id).all()
    form.category_id.choices = [(0, "-- Select Category --")] + [
        (c.id, c.name) for c in categories
    ]

    if form.validate_on_submit():
        category_id = None
        category_name = (
            form.category_name.data.strip() if form.category_name.data else None
        )

        # Determine category - either existing or new
        if form.category_id.data and form.category_id.data > 0:
            # Using an existing category
            category_id = form.category_id.data
            category_obj = ExpenseCategory.query.get(category_id)
            category_name = category_obj.name
        elif category_name:
            # Using a new category name - check if it already exists
            existing_category = ExpenseCategory.query.filter(
                ExpenseCategory.user_id == current_user.id,
                ExpenseCategory.name.ilike(category_name),
            ).first()

            if existing_category:
                # Use existing category with this name
                category_id = existing_category.id
                category_name = existing_category.name
            else:
                # Create new category
                new_category = ExpenseCategory(
                    name=category_name, user_id=current_user.id
                )
                db.session.add(new_category)
                db.session.flush()  # Get the ID without committing
                category_id = new_category.id

        # Generate a human-readable frequency string for backwards compatibility
        frequency = None
        if (
            form.recurring.data
            and form.frequency_value.data
            and form.frequency_type.data
        ):
            if form.frequency_value.data == 1:
                if form.frequency_type.data == "days":
                    frequency = "daily"
                elif form.frequency_type.data == "weeks":
                    frequency = "weekly"
                elif form.frequency_type.data == "months":
                    frequency = "monthly"
                elif form.frequency_type.data == "years":
                    frequency = "annually"
            elif form.frequency_value.data == 2 and form.frequency_type.data == "weeks":
                frequency = "bi-weekly"
            elif (
                form.frequency_value.data == 3 and form.frequency_type.data == "months"
            ):
                frequency = "quarterly"
            elif (
                form.frequency_value.data == 6 and form.frequency_type.data == "months"
            ):
                frequency = "semi-annually"
            else:
                # Custom frequency
                frequency = (
                    f"custom-{form.frequency_value.data}-{form.frequency_type.data}"
                )

        # Create the expense
        expense = Expense(
            date=form.date.data,
            due_date=form.due_date.data,
            # New fields for materialization
            start_date=form.start_date.data if form.recurring.data else None,
            end_date=form.end_date.data if form.recurring.data else None,
            parent_expense_id=None,  # This is a parent expense, not materialized
            category=category_name,
            category_id=category_id,
            description=form.description.data,
            amount=form.amount.data,
            paid=form.paid.data,
            recurring=form.recurring.data,
            frequency=frequency,
            frequency_type=form.frequency_type.data if form.recurring.data else None,
            frequency_value=form.frequency_value.data if form.recurring.data else None,
            user_id=current_user.id,
        )

        db.session.add(expense)

        try:
            # First save the expense to get an ID
            db.session.flush()

            # If it's recurring, materialize it automatically
            materialized_count = 0
            if form.recurring.data and form.date.data < form.end_date.data:
                materialized_expenses = materialize_expense(expense)
                materialized_count = len(materialized_expenses)

            # Commit all changes
            db.session.commit()

            # Success message
            if materialized_count > 0:
                flash(
                    f"Expense added successfully with {materialized_count} materialized instances!"
                )
            else:
                flash("Expense added successfully!")

            return redirect(url_for("main.manage_expenses"))
        except Exception as e:
            db.session.rollback()
            flash(f"Error adding expense: {str(e)}")

    return render_template("finance/expense_form.html", title="Add Expense", form=form)


@main.route("/expenses/edit/<int:id>", methods=["GET", "POST"])
@login_required
def edit_expense(id):
    """Edit an expense and update materialized instances if needed"""
    expense = Expense.query.filter_by(id=id, user_id=current_user.id).first_or_404()

    # Check if this is a materialized instance (has parent)
    is_materialized = expense.parent_expense_id is not None

    form = ExpenseForm(obj=expense)

    # Load categories for the form dropdown
    categories = ExpenseCategory.query.filter_by(user_id=current_user.id).all()
    form.category_id.choices = [(0, "-- Select Category --")] + [
        (c.id, c.name) for c in categories
    ]

    if request.method == "GET":
        # Pre-populate the form
        if expense.category_id:
            form.category_id.data = expense.category_id

        # Handle frequency fields
        if expense.frequency_type and expense.frequency_value:
            form.frequency_type.data = expense.frequency_type
            form.frequency_value.data = expense.frequency_value
        elif expense.recurring and expense.frequency:
            # Handle legacy frequencies
            if expense.frequency == "daily":
                form.frequency_type.data = "days"
                form.frequency_value.data = 1
            elif expense.frequency == "weekly":
                form.frequency_type.data = "weeks"
                form.frequency_value.data = 1
            elif expense.frequency == "bi-weekly":
                form.frequency_type.data = "weeks"
                form.frequency_value.data = 2
            elif expense.frequency == "monthly":
                form.frequency_type.data = "months"
                form.frequency_value.data = 1
            elif expense.frequency == "quarterly":
                form.frequency_type.data = "months"
                form.frequency_value.data = 3
            elif expense.frequency == "semi-annually":
                form.frequency_type.data = "months"
                form.frequency_value.data = 6
            elif expense.frequency == "annually":
                form.frequency_type.data = "years"
                form.frequency_value.data = 1
            elif expense.frequency.startswith("custom-"):
                # Try to parse custom format like 'custom-2-weeks'
                parts = expense.frequency.split("-")
                if len(parts) == 3 and parts[1].isdigit():
                    form.frequency_value.data = int(parts[1])
                    form.frequency_type.data = parts[2]

    if form.validate_on_submit():
        category_id = None
        category_name = (
            form.category_name.data.strip() if form.category_name.data else None
        )

        # Determine category - either existing or new
        if form.category_id.data and form.category_id.data > 0:
            # Using an existing category
            category_id = form.category_id.data
            category_obj = ExpenseCategory.query.get(category_id)
            category_name = category_obj.name
        elif category_name:
            # Using a new category name - check if it already exists
            existing_category = ExpenseCategory.query.filter(
                ExpenseCategory.user_id == current_user.id,
                ExpenseCategory.name.ilike(category_name),
            ).first()

            if existing_category:
                # Use existing category with this name
                category_id = existing_category.id
                category_name = existing_category.name
            else:
                # Create new category
                new_category = ExpenseCategory(
                    name=category_name, user_id=current_user.id
                )
                db.session.add(new_category)
                db.session.flush()  # Get the ID without committing
                category_id = new_category.id

        # Generate a human-readable frequency string for backwards compatibility
        frequency = None
        if (
            form.recurring.data
            and form.frequency_value.data
            and form.frequency_type.data
        ):
            if form.frequency_value.data == 1:
                if form.frequency_type.data == "days":
                    frequency = "daily"
                elif form.frequency_type.data == "weeks":
                    frequency = "weekly"
                elif form.frequency_type.data == "months":
                    frequency = "monthly"
                elif form.frequency_type.data == "years":
                    frequency = "annually"
            elif form.frequency_value.data == 2 and form.frequency_type.data == "weeks":
                frequency = "bi-weekly"
            elif (
                form.frequency_value.data == 3 and form.frequency_type.data == "months"
            ):
                frequency = "quarterly"
            elif (
                form.frequency_value.data == 6 and form.frequency_type.data == "months"
            ):
                frequency = "semi-annually"
            else:
                # Custom frequency
                frequency = (
                    f"custom-{form.frequency_value.data}-{form.frequency_type.data}"
                )

        # If this is a materialized instance, only update this specific instance
        if is_materialized:
            expense.date = form.date.data
            expense.due_date = form.due_date.data
            expense.category = category_name
            expense.category_id = category_id
            expense.description = form.description.data
            expense.amount = form.amount.data
            expense.paid = form.paid.data
            expense.updated_at = datetime.utcnow()

            try:
                db.session.commit()
                flash("Expense instance updated successfully!")
                return redirect(url_for("main.manage_expenses"))
            except Exception as e:
                db.session.rollback()
                flash(f"Error updating expense instance: {str(e)}")

        # Otherwise, update the recurring parent expense and its future instances
        else:
            # First, update the parent expense
            old_recurring = expense.recurring

            expense.date = form.date.data
            expense.due_date = form.due_date.data
            expense.start_date = form.start_date.data if form.recurring.data else None
            expense.end_date = form.end_date.data if form.recurring.data else None
            expense.category = category_name
            expense.category_id = category_id
            expense.description = form.description.data
            expense.amount = form.amount.data
            expense.paid = form.paid.data
            expense.recurring = form.recurring.data
            expense.frequency = frequency
            expense.frequency_type = (
                form.frequency_type.data if form.recurring.data else None
            )
            expense.frequency_value = (
                form.frequency_value.data if form.recurring.data else None
            )
            expense.updated_at = datetime.utcnow()

            try:
                # Save the parent expense changes
                db.session.flush()

                # If switching from non-recurring to recurring, or if it's already recurring
                materialized_count = 0
                if form.recurring.data:
                    # Handle future materialized instances
                    today = date.today()

                    # Option 1: Find and update any future instances that haven't been modified
                    # This updates future instances to match new details (amount, category, etc.)
                    future_instances = Expense.query.filter(
                        Expense.parent_expense_id == expense.id,
                        Expense.date >= today,
                        Expense.updated_at
                        == Expense.created_at,  # Not manually modified
                    ).all()

                    for instance in future_instances:
                        instance.category = category_name
                        instance.category_id = category_id
                        instance.description = expense.description
                        instance.amount = expense.amount

                    # Materialize new instances
                    materialized_expenses = materialize_expense(expense)
                    materialized_count = len(materialized_expenses)

                # If switching from recurring to non-recurring, handle cleanup
                elif old_recurring and not form.recurring.data:
                    # Option: Delete future instances
                    today = date.today()
                    deleted_count = Expense.query.filter(
                        Expense.parent_expense_id == expense.id, Expense.date >= today
                    ).delete()

                    if deleted_count > 0:
                        flash(
                            f"{deleted_count} future recurring instances were removed."
                        )

                # Commit all changes
                db.session.commit()

                # Success message
                if materialized_count > 0:
                    flash(
                        f"Expense updated successfully with {materialized_count} new materialized instances!"
                    )
                else:
                    flash("Expense updated successfully!")

                return redirect(url_for("main.manage_expenses"))
            except Exception as e:
                db.session.rollback()
                flash(f"Error updating expense: {str(e)}")

    return render_template(
        "finance/expense_form.html",
        title="Edit Expense" if not is_materialized else "Edit Expense Instance",
        form=form,
        expense=expense,
        is_materialized=is_materialized,
    )


@main.route("/expenses/delete/<int:id>", methods=["POST"])
@login_required
def delete_expense(id):
    """Delete an expense and its materialized instances if it's a recurring parent"""
    expense = Expense.query.filter_by(id=id, user_id=current_user.id).first_or_404()

    try:
        deleted_count = 0
        message = "Expense deleted successfully."

        # If this is a parent recurring expense, delete all its materialized instances first
        if expense.recurring and not expense.parent_expense_id:
            # Delete all child instances
            deleted_count = Expense.query.filter_by(
                parent_expense_id=expense.id, user_id=current_user.id
            ).delete()

            if deleted_count > 0:
                message = f"Expense and {deleted_count} materialized instances deleted successfully."

        # Now delete the expense itself
        db.session.delete(expense)
        db.session.commit()
        flash(message)
    except Exception as e:
        db.session.rollback()
        flash(f"Error deleting expense: {str(e)}")

    return redirect(url_for("main.manage_expenses"))


@main.route("/expenses/toggle-paid/<int:id>", methods=["POST"])
@login_required
def toggle_expense_paid(id):
    """Toggle the paid status of an expense with improved AJAX support"""
    expense = Expense.query.filter_by(id=id, user_id=current_user.id).first_or_404()

    try:
        # Toggle the paid status
        expense.paid = not expense.paid
        expense.updated_at = datetime.utcnow()
        db.session.commit()

        # Respond appropriately based on request type
        if request.headers.get("X-Requested-With") == "XMLHttpRequest":
            return jsonify(
                {
                    "success": True,
                    "paid": expense.paid,
                    "message": f"Expense marked as {'paid' if expense.paid else 'unpaid'}.",
                    "expense_id": expense.id,
                }
            )

        # Regular form submission response with redirect
        flash(f"Expense marked as {'paid' if expense.paid else 'unpaid'}.")
    except Exception as e:
        db.session.rollback()

        # Handle errors appropriately
        if request.headers.get("X-Requested-With") == "XMLHttpRequest":
            return jsonify({"success": False, "message": str(e)}), 500

        flash(f"Error updating expense: {str(e)}")

    return redirect(url_for("main.manage_expenses"))


# ============= CATEGORY MANAGEMENT =============


@main.route("/expenses/categories", methods=["GET"])
@login_required
def manage_categories():
    """View and manage expense categories"""
    categories = (
        ExpenseCategory.query.filter_by(user_id=current_user.id)
        .order_by(ExpenseCategory.name)
        .all()
    )

    # Get expense counts and totals for each category
    category_stats = {}
    for category in categories:
        expenses = Expense.query.filter_by(
            category_id=category.id, user_id=current_user.id
        ).all()
        count = len(expenses)
        total = sum(e.amount for e in expenses)
        category_stats[category.id] = {"count": count, "total": total}

    return render_template(
        "finance/manage_categories.html",
        title="Manage Categories",
        categories=categories,
        category_stats=category_stats,
    )


@main.route("/expenses/categories/add", methods=["GET", "POST"])
@login_required
def add_category():
    """Add a new expense category"""
    form = ExpenseCategoryForm()

    if form.validate_on_submit():
        # Check if category already exists
        existing = ExpenseCategory.query.filter(
            ExpenseCategory.user_id == current_user.id,
            ExpenseCategory.name.ilike(form.name.data),
        ).first()

        if existing:
            flash("A category with this name already exists.")
            return render_template(
                "finance/category_form.html", title="Add Category", form=form
            )

        category = ExpenseCategory(
            name=form.name.data,
            description=form.description.data,
            color=form.color.data,
            user_id=current_user.id,
        )

        db.session.add(category)
        try:
            db.session.commit()
            flash("Category added successfully!")
            return redirect(url_for("main.manage_categories"))
        except Exception as e:
            db.session.rollback()
            flash(f"Error adding category: {str(e)}")

    return render_template(
        "finance/category_form.html", title="Add Category", form=form
    )


@main.route("/expenses/categories/edit/<int:id>", methods=["GET", "POST"])
@login_required
def edit_category(id):
    """Edit an expense category"""
    category = ExpenseCategory.query.filter_by(
        id=id, user_id=current_user.id
    ).first_or_404()
    form = ExpenseCategoryForm(obj=category)

    if form.validate_on_submit():
        # Check if this would create a duplicate
        if form.name.data.lower() != category.name.lower():
            existing = ExpenseCategory.query.filter(
                ExpenseCategory.user_id == current_user.id,
                ExpenseCategory.id != category.id,
                ExpenseCategory.name.ilike(form.name.data),
            ).first()

            if existing:
                flash("A category with this name already exists.")
                return render_template(
                    "finance/category_form.html",
                    title="Edit Category",
                    form=form,
                    category=category,
                )

        # Update the category
        category.name = form.name.data
        category.description = form.description.data
        category.color = form.color.data

        try:
            # Also update any expenses using this category
            expenses = Expense.query.filter_by(
                category_id=category.id, user_id=current_user.id
            ).all()
            for expense in expenses:
                expense.category = category.name  # Update the category name string too

            db.session.commit()
            flash("Category updated successfully!")
            return redirect(url_for("main.manage_categories"))
        except Exception as e:
            db.session.rollback()
            flash(f"Error updating category: {str(e)}")

    return render_template(
        "finance/category_form.html",
        title="Edit Category",
        form=form,
        category=category,
    )


@main.route("/expenses/categories/delete/<int:id>", methods=["POST"])
@login_required
def delete_category(id):
    """Delete an expense category"""
    category = ExpenseCategory.query.filter_by(
        id=id, user_id=current_user.id
    ).first_or_404()

    # Check if the category is in use
    expense_count = Expense.query.filter_by(
        category_id=category.id, user_id=current_user.id
    ).count()

    if expense_count > 0:
        flash(f"Cannot delete category. It is used by {expense_count} expenses.")
        return redirect(url_for("main.manage_categories"))

    try:
        db.session.delete(category)
        db.session.commit()
        flash("Category deleted successfully.")
    except Exception as e:
        db.session.rollback()
        flash(f"Error deleting category: {str(e)}")

    return redirect(url_for("main.manage_categories"))

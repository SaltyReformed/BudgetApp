from datetime import datetime, timedelta, date
from app.models import Expense
from app import db


def materialize_expense(expense, end_date=None):
    """
    Materialize a single recurring expense as actual database records.

    Args:
        expense: The parent recurring expense
        end_date: Optional end date to limit materialization (defaults to 6 months)

    Returns:
        list: Newly created materialized expenses
    """
    if not expense.recurring:
        return []

    # Skip if no valid frequency
    freq_days = expense.get_frequency_days()
    if not freq_days:
        return []

    # Determine materialization period
    today = date.today()
    # Default start date is the expense date itself
    start_date = expense.date

    # If a specific start date is defined, use it
    if expense.start_date and expense.start_date > start_date:
        start_date = expense.start_date

    # If start date is in the past, move to the first future occurrence
    if start_date < today:
        # Calculate how many periods have passed
        days_passed = (today - start_date).days
        periods_passed = (days_passed // freq_days) + 1

        # Move start date to next occurrence
        start_date = start_date + timedelta(days=periods_passed * freq_days)

    # Default end date is 6 months from today if not specified
    if not end_date:
        end_date = today + timedelta(days=180)  # ~6 months

    # Respect expense's end date if it's earlier than our default
    if expense.end_date and expense.end_date < end_date:
        end_date = expense.end_date

    # Find existing materialized instances to avoid duplicates
    existing_dates = set()
    for instance in Expense.query.filter_by(
        user_id=expense.user_id, parent_expense_id=expense.id
    ).all():
        existing_dates.add(instance.date)

    # Make sure we don't duplicate the parent expense's date
    existing_dates.add(expense.date)

    # Generate occurrences
    materialized_expenses = []
    # Start at the first occurrence AFTER the expense date
    current_date = start_date + timedelta(days=freq_days)

    while current_date <= end_date:
        # Skip if this date already has an instance
        if current_date in existing_dates:
            current_date += timedelta(days=freq_days)
            continue

        # Create the materialized expense instance
        materialized_expense = Expense(
            date=current_date,
            due_date=expense.due_date,  # Copy the due date pattern
            start_date=None,  # Materialized instances don't need their own start/end dates
            end_date=None,
            parent_expense_id=expense.id,  # Link to the parent expense
            category=expense.category,
            category_id=expense.category_id,
            description=expense.description,
            amount=expense.amount,
            paid=False,  # New instances are unpaid by default
            recurring=False,  # Materialized instances are not recurring themselves
            user_id=expense.user_id,
        )
        db.session.add(materialized_expense)
        materialized_expenses.append(materialized_expense)

        # Move to next occurrence
        current_date += timedelta(days=freq_days)

    return materialized_expenses

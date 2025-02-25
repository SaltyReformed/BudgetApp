from datetime import datetime, timedelta, date
from dateutil.relativedelta import relativedelta
from app.models import Expense
from app import db


def materialize_expense(expense, end_date=None):
    """
    Materialize a single recurring expense as actual database records.

    Args:
        expense: The parent recurring expense
        end_date: Optional end date to limit materialization (defaults to specified expense end date)

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
        # For monthly recurring, find the next occurrence
        # by adding months while preserving the day of the month
        if freq_days < 0:
            months_to_add = (
                (today.year - start_date.year) * 12
                + (today.month - start_date.month)
                + (1 if today.day > start_date.day else 0)
            )
            start_date = start_date + relativedelta(months=months_to_add)
        else:
            # Calculate how many periods have passed
            days_passed = (today - start_date).days
            periods_passed = (days_passed // abs(freq_days)) + 1

            # Move start date to next occurrence
            start_date = start_date + timedelta(days=periods_passed * abs(freq_days))

    # Prioritize the passed end_date, then the expense's end_date,
    # otherwise default to one year from today
    if end_date is None:
        end_date = expense.end_date or (today + timedelta(days=365))

    # Find existing materialized instances to avoid duplicates
    existing_dates = set()
    for instance in Expense.query.filter_by(
        user_id=expense.user_id, parent_expense_id=expense.id
    ).all():
        existing_dates.add(instance.date)

    # Make sure we don't duplicate the parent expense's date
    existing_dates.add(expense.date)

    # Calculate the initial due date offset
    due_date_offset = None
    if expense.due_date:
        due_date_offset = expense.due_date - expense.date

    # Generate occurrences
    materialized_expenses = []
    # Start at the first occurrence AFTER the expense date
    current_date = start_date

    # Increment for the first occurrence
    if freq_days > 0:
        # For regular frequency, add standard timedelta
        current_date += timedelta(days=abs(freq_days))
    else:
        # For monthly, add a month while preserving the day
        current_date += relativedelta(months=abs(freq_days))

    while current_date <= end_date:
        # Skip if this date already has an instance
        if current_date in existing_dates:
            # Increment based on frequency type
            if freq_days > 0:
                current_date += timedelta(days=abs(freq_days))
            else:
                current_date += relativedelta(months=abs(freq_days))
            continue

        # Calculate due date dynamically if offset exists
        dynamic_due_date = None
        if due_date_offset is not None:
            dynamic_due_date = current_date + due_date_offset

        # Create the materialized expense instance
        materialized_expense = Expense(
            date=current_date,
            due_date=dynamic_due_date,  # Dynamically calculated due date
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

        # Increment for the next occurrence
        if freq_days > 0:
            # For regular frequency, add standard timedelta
            current_date += timedelta(days=abs(freq_days))
        else:
            # For monthly, add a month while preserving the day
            current_date += relativedelta(months=abs(freq_days))

    return materialized_expenses

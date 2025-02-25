from datetime import datetime, timedelta, date
from app.models import Expense, db


def generate_recurring_expenses(user_id, start_date, end_date):
    # Find all recurring expenses for the user
    recurring_expenses = Expense.query.filter_by(user_id=user_id, recurring=True).all()

    # Get all existing expense dates within this range to avoid duplicates
    existing_dates = set()
    for expense in (
        Expense.query.filter_by(user_id=user_id)
        .filter(Expense.date > start_date, Expense.date <= end_date)
        .all()
    ):
        key = (expense.date, expense.category, expense.amount)
        existing_dates.add(key)

    generated_expenses = []

    for base_expense in recurring_expenses:
        # Skip if no valid frequency
        freq_days = base_expense.get_frequency_days()
        if not freq_days:
            continue

        # Determine the first occurrence (always start AFTER the initial expense date)
        current_date = base_expense.date + timedelta(days=freq_days)

        # Ensure we start at the correct point and do not include the original expense date
        if base_expense.start_date:
            current_date = max(current_date, base_expense.start_date)

        # Ensure we start after the global start_date, but also do not include base_expense.date
        while current_date <= base_expense.date or current_date < start_date:
            current_date += timedelta(days=freq_days)

        # Set end date, respecting the base expense's end_date
        actual_end_date = min(base_expense.end_date or end_date, end_date)

        # Generate all occurrences in date range
        while current_date <= actual_end_date:
            # Create a key to check against existing expenses
            key = (current_date, base_expense.category, base_expense.amount)

            # Only create if no matching expense exists
            if key not in existing_dates:
                # Create the virtual recurring expense
                recurring_expense = Expense(
                    date=current_date,
                    due_date=base_expense.due_date,
                    category=base_expense.category,
                    category_id=base_expense.category_id,
                    description=f"{base_expense.description} (Recurring)",
                    amount=base_expense.amount,
                    paid=False,  # Virtual recurrences are unpaid by default
                    recurring=False,  # These are materialized instances
                    parent_expense_id=base_expense.id,  # Link to the parent expense
                    user_id=base_expense.user_id,
                )
                generated_expenses.append(recurring_expense)

                # Add this to existing dates to prevent duplicates
                existing_dates.add(key)

            # Move to next occurrence
            current_date += timedelta(days=freq_days)

    return generated_expenses

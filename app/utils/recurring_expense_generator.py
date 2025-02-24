from datetime import datetime, timedelta, date
from app.models import Expense, db


def generate_recurring_expenses(user_id, start_date, end_date):
    """
    Generate recurring expenses for a given date range

    Args:
        user_id (int): ID of the user
        start_date (date): Start of the date range
        end_date (date): End of the date range

    Returns:
        list: Generated recurring expenses
    """
    # Find all recurring expenses for the user
    recurring_expenses = Expense.query.filter_by(user_id=user_id, recurring=True).all()

    generated_expenses = []

    for base_expense in recurring_expenses:
        # Skip if the base expense is outside the date range
        if not base_expense.recurring:
            continue

        # Get frequency in days using the helper method
        freq_days = base_expense.get_frequency_days()

        # Skip if no valid frequency
        if not freq_days:
            continue

        # Start generating from the base expense date
        current_date = base_expense.date

        while current_date <= end_date:
            # Only add if the current date is within the range and after the base expense date
            if (
                start_date <= current_date <= end_date
                and current_date > base_expense.date
            ):
                # Check if an expense with this exact date and base details already exists
                existing_expense = Expense.query.filter(
                    Expense.user_id == user_id,
                    Expense.date == current_date,
                    Expense.category == base_expense.category,
                    Expense.amount == base_expense.amount,
                    Expense.description.like(f"%{base_expense.description}%"),
                ).first()

                # Only create if no matching expense exists
                if not existing_expense:
                    # Adjust due date if present
                    adjusted_due_date = None
                    if base_expense.due_date:
                        # Calculate the offset between the original date and due date
                        days_offset = (base_expense.due_date - base_expense.date).days
                        adjusted_due_date = current_date + timedelta(days=days_offset)

                    recurring_expense = Expense(
                        date=current_date,
                        due_date=adjusted_due_date,
                        category=base_expense.category,
                        category_id=base_expense.category_id,
                        description=f"{base_expense.description} (Recurring)",
                        amount=base_expense.amount,
                        paid=False,  # New recurrence is unpaid by default
                        recurring=True,
                        frequency=base_expense.frequency,
                        frequency_type=base_expense.frequency_type,
                        frequency_value=base_expense.frequency_value,
                        user_id=base_expense.user_id,
                    )
                    generated_expenses.append(recurring_expense)

            # Move to next occurrence
            current_date += timedelta(days=freq_days)

    return generated_expenses

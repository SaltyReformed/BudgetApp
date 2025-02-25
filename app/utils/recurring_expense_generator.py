from datetime import datetime, timedelta, date
from app.models import Expense, db


def generate_recurring_expenses(user_id, start_date, end_date):
    # Find all recurring expenses for the user
    recurring_expenses = Expense.query.filter_by(user_id=user_id, recurring=True).all()

    # Get all existing expense dates within this range to avoid duplicates
    existing_expenses = {}
    for expense in Expense.query.filter_by(user_id=user_id).filter(
        Expense.date >= start_date, Expense.date <= end_date
    ).all():
        key = (expense.date, expense.category, expense.amount)
        existing_expenses[key] = True
    
    generated_expenses = []

    for base_expense in recurring_expenses:
        # Skip if no valid frequency
        freq_days = base_expense.get_frequency_days()
        if not freq_days:
            continue

        # Start generating from the base expense date
        current_date = base_expense.date
        
        # Move to first occurrence after or equal to start_date
        while current_date < start_date:
            current_date += timedelta(days=freq_days)
            
        # Generate all occurrences in date range
        while current_date <= end_date:
            # Create a key to check against existing expenses
            key = (current_date, base_expense.category, base_expense.amount)
            
            # Only create if no matching expense exists and it's not the original
            if key not in existing_expenses:
                # Create the virtual recurring expense
                recurring_expense = Expense(
                    date=current_date,
                    due_date=None,
                    category=base_expense.category,
                    category_id=base_expense.category_id,
                    description=f"{base_expense.description} (Recurring)",
                    amount=base_expense.amount,
                    paid=False,  # Virtual recurrences are unpaid by default
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
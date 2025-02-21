# app/utils/paycheck_generator.py

from datetime import datetime, timedelta, date
from app.models import SalaryProjection, Paycheck
from app import db


def generate_paycheck_dates(start_date, end_date, first_paycheck_date, frequency=14):
    """Generate paycheck dates between start and end dates

    Args:
        start_date: Starting date range
        end_date: Ending date range
        first_paycheck_date: Date of the first paycheck to anchor the schedule
        frequency: Days between paychecks (14 for biweekly)

    Returns:
        list: List of paycheck dates within the range
    """
    paycheck_dates = []

    # Calculate all possible paychecks based on the first date
    current_date = first_paycheck_date

    # Generate backward if needed
    if first_paycheck_date > start_date:
        backwards_date = first_paycheck_date
        while True:
            backwards_date = backwards_date - timedelta(days=frequency)
            if backwards_date < start_date:
                break
            # Insert at the beginning to maintain chronological order
            paycheck_dates.insert(0, backwards_date)

    # Generate forward
    while current_date <= end_date:
        if current_date >= start_date:  # Only include dates in our range
            paycheck_dates.append(current_date)
        current_date = current_date + timedelta(days=frequency)

    return paycheck_dates


def find_applicable_salary(date, salary_projections):
    """Find the applicable salary projection for a given date

    Args:
        date: The date to check
        salary_projections: List of SalaryProjection objects

    Returns:
        SalaryProjection or None: The applicable salary projection
    """
    for projection in salary_projections:
        start_date = projection.start_date
        end_date = (
            projection.end_date or datetime(2099, 12, 31).date()
        )  # Far future if no end date

        if start_date <= date <= end_date:
            return projection

    return None


def create_salary_paychecks(
    user_id, first_paycheck_date, end_date=None, frequency=14, force_regenerate=False
):
    """Generate paychecks with automatic salary adjustments.

    Args:
        user_id: User ID
        first_paycheck_date: Date of the first paycheck
        end_date: End date for generating paychecks (optional, defaults to 1 year ahead)
        frequency: Days between paychecks (default 14 for biweekly)
        force_regenerate: If True, regenerate even if paychecks exist

    Returns:
        tuple: (success, message, list of created paychecks)
    """
    # Validate inputs
    if not isinstance(first_paycheck_date, (datetime, date)):
        try:
            first_paycheck_date = datetime.strptime(first_paycheck_date, "%Y-%m-%d").date()
        except:
            return False, "Invalid first paycheck date format", []

    if isinstance(first_paycheck_date, datetime):
        first_paycheck_date = first_paycheck_date.date()

    # Set default end date if not provided
    if not end_date:
        end_date = first_paycheck_date.replace(year=first_paycheck_date.year + 1)
    elif not isinstance(end_date, (datetime, date)):
        try:
            end_date = datetime.strptime(end_date, "%Y-%m-%d").date()
        except:
            return False, "Invalid end date format", []

    if isinstance(end_date, datetime):
        end_date = end_date.date()

    # Get all salary projections for the user, ordered by start date
    salary_projections = (
        SalaryProjection.query.filter_by(user_id=user_id)
        .order_by(SalaryProjection.start_date.asc())
        .all()
    )

    if not salary_projections:
        return False, "No salary projections found for this user", []

    # Determine the earliest and latest possible dates
    earliest_date = min(proj.start_date for proj in salary_projections)
    latest_date = max(
        proj.end_date or datetime(2099, 12, 31).date() for proj in salary_projections
    )

    # Adjust start and end dates based on projections
    start_date = max(
        earliest_date, first_paycheck_date - timedelta(days=365)
    )  # Allow back-calculation up to a year
    end_date = min(latest_date, end_date)

    # Check if we already have paychecks in this date range and not forcing regeneration
    # Handle existing paychecks in this date range
    existing_paychecks = (
        Paycheck.query.filter_by(user_id=user_id, pay_type="Regular")
        .filter(Paycheck.date >= first_paycheck_date, Paycheck.date <= end_date)
        .all()
    )
    
    if existing_paychecks:
        if force_regenerate:
            # Delete existing paychecks if forcing regeneration
            for paycheck in existing_paychecks:
                db.session.delete(paycheck)
            try:
                db.session.commit()
            except Exception as e:
                db.session.rollback()
                return False, f"Error deleting existing paychecks: {str(e)}", []
        else:
            # Don't proceed if we have existing paychecks and not forcing regeneration
            return False, "Paychecks already exist in this date range", []

    # Generate paycheck dates
    paycheck_dates = generate_paycheck_dates(
        start_date, end_date, first_paycheck_date, frequency
    )

    if not paycheck_dates:
        return False, "No paycheck dates were generated for the given range", []

    # Create paychecks with the right salary for each date
    created_paychecks = []

    for pay_date in paycheck_dates:
        # Find the applicable salary for this date
        salary = find_applicable_salary(pay_date, salary_projections)

        if not salary:
            continue  # Skip dates that don't have a salary projection

        gross_biweekly = salary.calculate_biweekly_gross()
        net_biweekly = salary.calculate_biweekly_net()

        paycheck = Paycheck(
            date=pay_date,
            pay_type="Regular",
            gross_amount=gross_biweekly,
            taxable_amount=gross_biweekly,  # Assuming all is taxable
            non_taxable_amount=0,
            net_amount=net_biweekly,
            user_id=user_id,
        )
        db.session.add(paycheck)
        created_paychecks.append(paycheck)

    try:
        db.session.commit()
        return (
            True,
            f"Successfully created {len(created_paychecks)} paychecks",
            created_paychecks,
        )
    except Exception as e:
        db.session.rollback()
        return False, f"Error creating paychecks: {str(e)}", []

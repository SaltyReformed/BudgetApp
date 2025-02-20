# app/forms.py
from flask_wtf import FlaskForm
from wtforms import (
    StringField,
    FloatField,
    DateField,
    SelectField,
    BooleanField,
    SubmitField,
    TextAreaField,
)
from wtforms.validators import DataRequired, NumberRange


class PaycheckForm(FlaskForm):
    date = DateField("Date", validators=[DataRequired()])
    pay_type = SelectField(
        "Pay Type",
        choices=[("Regular", "Regular"), ("Third", "Third")],
        validators=[DataRequired()],
    )
    gross_amount = FloatField(
        "Gross Amount", validators=[DataRequired(), NumberRange(min=0)]
    )
    taxable_amount = FloatField(
        "Taxable Amount", validators=[DataRequired(), NumberRange(min=0)]
    )
    non_taxable_amount = FloatField(
        "Non-taxable Amount", validators=[DataRequired(), NumberRange(min=0)]
    )
    phone_stipend = BooleanField("Phone Stipend")
    submit = SubmitField("Add Paycheck")


class ExpenseForm(FlaskForm):
    date = DateField("Date", validators=[DataRequired()])
    category = SelectField(
        "Category",
        choices=[
            ("Housing", "Housing"),
            ("Transportation", "Transportation"),
            ("Food", "Food"),
            ("Utilities", "Utilities"),
            ("Insurance", "Insurance"),
            ("Healthcare", "Healthcare"),
            ("Savings", "Savings"),
            ("Personal", "Personal"),
            ("Entertainment", "Entertainment"),
            ("Other", "Other"),
        ],
        validators=[DataRequired()],
    )
    description = TextAreaField("Description")
    amount = FloatField("Amount", validators=[DataRequired(), NumberRange(min=0)])
    recurring = BooleanField("Recurring Expense")
    frequency = SelectField(
        "Frequency",
        choices=[
            ("", "One-time"),
            ("monthly", "Monthly"),
            ("bi-weekly", "Bi-weekly"),
            ("weekly", "Weekly"),
            ("annually", "Annually"),
        ],
    )
    submit = SubmitField("Add Expense")

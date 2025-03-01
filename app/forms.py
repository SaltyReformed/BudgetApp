from flask_wtf import FlaskForm
from wtforms import (
    StringField,
    FloatField,
    DateField,
    SelectField,
    BooleanField,
    SubmitField,
    TextAreaField,
    IntegerField,
)
from wtforms.validators import DataRequired, NumberRange, Optional, Length


class PaycheckForm(FlaskForm):
    date = DateField("Date", validators=[DataRequired()])
    pay_type = SelectField(
        "Pay Type",
        choices=[
            ("Regular", "Regular Salary"),
            ("Third", "Third Paycheck"),
            ("Phone Stipend", "Phone Stipend"),
            ("Bonus", "Bonus"),
            ("Other Income", "Other Income"),
            ("Tax Return", "Tax Return"),
            ("Transfer", "Transfer from Savings"),
        ],
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
    net_amount = FloatField(
        "Net Amount", validators=[DataRequired(), NumberRange(min=0)]
    )
    phone_stipend = BooleanField("Phone Stipend")
    description = StringField("Description (Optional)", validators=[Optional()])
    recurring = BooleanField("Recurring Income")
    frequency_type = SelectField(
        "Frequency",
        choices=[
            ("", "One-time"),
            ("weekly", "Weekly"),
            ("biweekly", "Bi-weekly"),
            ("monthly", "Monthly"),
            ("quarterly", "Quarterly"),
            ("annually", "Annually"),
        ],
        validators=[Optional()],
    )
    frequency_value = IntegerField(
        "Repeat Every", validators=[Optional(), NumberRange(min=1)], default=1
    )
    start_date = DateField("Start Date", validators=[Optional()])
    end_date = DateField("End Date", validators=[Optional()])
    submit = SubmitField("Save Paycheck")

    def validate(self, extra_validators=None):
        """Custom validation to ensure net amount is less than or equal to gross amount"""
        if not super().validate(extra_validators):
            return False

        if self.net_amount.data > self.gross_amount.data:
            self.net_amount.errors.append(
                "Net amount cannot be greater than gross amount"
            )
            return False

        if self.recurring.data:
            # Validate recurring fields
            if not self.frequency_type.data:
                self.frequency_type.errors.append(
                    "Frequency type is required for recurring income"
                )
                return False

        return True


class SalaryForecastForm(FlaskForm):
    start_date = DateField("Start Date", validators=[DataRequired()])
    end_date = DateField("End Date", validators=[DataRequired()])
    annual_salary = FloatField(
        "Annual Gross Salary", validators=[DataRequired(), NumberRange(min=0)]
    )
    tax_rate = FloatField(
        "Estimated Tax Rate (%)",
        validators=[DataRequired(), NumberRange(min=0, max=100)],
        default=25.0,
    )
    is_current = BooleanField("Current Salary")
    notes = TextAreaField("Notes")
    submit = SubmitField("Calculate Forecast")


class ExpenseCategoryForm(FlaskForm):
    name = StringField("Category Name", validators=[DataRequired(), Length(max=50)])
    description = TextAreaField("Description", validators=[Length(max=200)])
    color = StringField("Color", default="#6B7280", validators=[Length(max=7)])
    submit = SubmitField("Save Category")


class ExpenseForm(FlaskForm):
    date = DateField("Expense Date", validators=[DataRequired()])
    due_date = DateField("Due Date", validators=[Optional()])
    category_id = SelectField("Category", coerce=int, validators=[Optional()])
    category_name = StringField(
        "Or enter a new category", validators=[Optional(), Length(max=50)]
    )
    description = TextAreaField("Description", validators=[Optional(), Length(max=200)])
    amount = FloatField("Amount", validators=[DataRequired(), NumberRange(min=0)])
    paid = BooleanField("Paid")
    recurring = BooleanField("Recurring Expense")
    start_date = DateField("Start Date", validators=[Optional()])
    end_date = DateField("End Date", validators=[Optional()])

    # New fields for frequency
    frequency_value = IntegerField(
        "Every", validators=[Optional(), NumberRange(min=1)], default=1
    )

    frequency_type = SelectField(
        "Period",
        choices=[
            ("days", "Days"),
            ("weeks", "Weeks"),
            ("months", "Months"),
            ("years", "Years"),
        ],
        validators=[Optional()],
    )

    submit = SubmitField("Save Expense")

    def __init__(self, *args, **kwargs):
        super(ExpenseForm, self).__init__(*args, **kwargs)
        # The categories will be populated in the route


class ExpenseFilterForm(FlaskForm):
    start_date = DateField("Start Date", validators=[Optional()])
    end_date = DateField("End Date", validators=[Optional()])
    category = SelectField("Category", validators=[Optional()], coerce=int)
    paid_status = SelectField(
        "Payment Status",
        choices=[
            ("all", "All Statuses"),
            ("paid", "Paid"),
            ("unpaid", "Unpaid"),
            ("overdue", "Overdue"),
            ("due_soon", "Due Soon (Next 7 days)"),
        ],
        default="all",
    )
    sort_by = SelectField(
        "Sort By",
        choices=[
            ("date", "Date"),
            ("due_date", "Due Date"),
            ("amount", "Amount"),
            ("category", "Category"),
        ],
        default="date",
    )
    sort_order = SelectField(
        "Sort Order",
        choices=[
            ("desc", "Descending"),
            ("asc", "Ascending"),
        ],
        default="desc",
    )
    submit = SubmitField("Apply Filters")

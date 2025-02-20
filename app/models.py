# app/models.py
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin
from app import db, login_manager
from decimal import Decimal
from datetime import date
from sqlalchemy.orm import validates


class Role(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), unique=True)
    permissions = db.Column(db.Integer)
    users = db.relationship("User", backref="role", lazy="dynamic")

    # Define permissions as bit flags
    VIEW_FINANCES = 1
    MANAGE_FINANCES = 2
    MANAGE_USERS = 4
    ADMIN = 255  # All permissions

    @staticmethod
    def insert_roles():
        roles = {
            "User": [Role.VIEW_FINANCES],
            "Manager": [Role.VIEW_FINANCES, Role.MANAGE_FINANCES],
            "Admin": [Role.VIEW_FINANCES, Role.MANAGE_FINANCES, Role.MANAGE_USERS],
        }
        for r in roles:
            role = Role.query.filter_by(name=r).first()
            if role is None:
                role = Role(name=r)
            role.permissions = sum(roles[r])
            db.session.add(role)
        db.session.commit()


class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    role_id = db.Column(db.Integer, db.ForeignKey("role.id"))
    is_active = db.Column(db.Boolean, default=True)
    last_login = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    paychecks = db.relationship("Paycheck", backref="user", lazy="dynamic")
    expenses = db.relationship("Expense", backref="user", lazy="dynamic")

    def __init__(self, **kwargs):
        super(User, self).__init__(**kwargs)
        if self.role is None:
            self.role = Role.query.filter_by(name="User").first()

    def has_permission(self, permission):
        return (
            self.role is not None and (self.role.permissions & permission) == permission
        )

    def is_admin(self):
        return self.has_permission(Role.ADMIN)

    def can_manage_users(self):
        return self.has_permission(Role.MANAGE_USERS)

    def can_manage_finances(self):
        return self.has_permission(Role.MANAGE_FINANCES)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)


class Paycheck(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False, index=True)
    pay_type = db.Column(db.String(20), nullable=False)  # Regular, Third
    gross_amount = db.Column(db.Float, nullable=False)
    taxable_amount = db.Column(db.Float, nullable=False)
    non_taxable_amount = db.Column(db.Float, nullable=False)
    net_amount = db.Column(db.Float, nullable=False)
    phone_stipend = db.Column(db.Boolean, default=False)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    @validates("gross_amount", "taxable_amount", "non_taxable_amount", "net_amount")
    def validate_amounts(self, key, value):
        if not isinstance(value, (int, float, Decimal)):
            raise ValueError(f"{key} must be a numeric value")
        if value < 0:
            raise ValueError(f"{key} cannot be negative")
        return value

    def calculate_net(self):
        """Calculate net amount after taxes and deductions."""
        # Implementation of proper tax calculation logic
        tax_brackets = [
            (0, 11000, 0.10),
            (11001, 44725, 0.12),
            (44726, 95375, 0.22),
            # Add more brackets as needed
        ]
        taxable_income = self.taxable_amount
        tax = 0

        for lower, upper, rate in tax_brackets:
            if taxable_income > lower:
                bracket_income = min(taxable_income - lower, upper - lower)
                tax += bracket_income * rate

        return self.gross_amount - tax + self.non_taxable_amount


class Expense(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False, index=True)
    category = db.Column(db.String(50), nullable=False)
    description = db.Column(db.String(200))
    amount = db.Column(db.Float, nullable=False)
    recurring = db.Column(db.Boolean, default=False)
    frequency = db.Column(db.String(20))  # monthly, bi-weekly, etc.
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class SalaryProjection(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    effective_date = db.Column(db.Date, nullable=False)
    type = db.Column(db.String(20), nullable=False)  # Promotion, Step, COLA
    base_salary = db.Column(db.Float, nullable=False)
    percentage_increase = db.Column(db.Float)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class AuditLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"))
    action = db.Column(db.String(50))
    model_name = db.Column(db.String(50))
    record_id = db.Column(db.Integer)
    changes = db.Column(db.JSON)


@login_manager.user_loader
def load_user(id):
    return User.query.get(int(id))

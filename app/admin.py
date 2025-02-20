# app/admin.py
from flask import Blueprint, render_template, flash, redirect, url_for, request
from flask_login import login_required, current_user
from app import db
from app.models import User, Role
from flask_wtf import FlaskForm
from wtforms import StringField, SelectField, BooleanField, SubmitField, PasswordField
from wtforms.validators import DataRequired, Email, ValidationError
import logging

logger = logging.getLogger(__name__)

admin = Blueprint("admin", __name__)


class UserForm(FlaskForm):
    username = StringField("Username", validators=[DataRequired()])
    email = StringField("Email", validators=[DataRequired(), Email()])
    role = SelectField("Role", coerce=int)
    is_active = BooleanField("Active")
    password = PasswordField("Password")
    submit = SubmitField("Submit")

    def __init__(self, original_username=None, *args, **kwargs):
        super(UserForm, self).__init__(*args, **kwargs)
        self.original_username = original_username
        self.role.choices = [
            (role.id, role.name) for role in Role.query.order_by("name")
        ]

    def validate_username(self, username):
        if username.data != self.original_username:
            user = User.query.filter_by(username=username.data).first()
            if user is not None:
                raise ValidationError("Please use a different username.")


@admin.route("/users")
@login_required
def user_list():
    if not current_user.can_manage_users():
        logger.warning(
            f"Unauthorized access attempt to user management by {current_user.username}"
        )
        flash("You do not have permission to manage users.")
        return redirect(url_for("main.index"))

    users = User.query.all()
    return render_template("admin/user_list.html", users=users)


@admin.route("/users/new", methods=["GET", "POST"])
@login_required
def create_user():
    if not current_user.can_manage_users():
        logger.warning(
            f"Unauthorized access attempt to user creation by {current_user.username}"
        )
        flash("You do not have permission to create users.")
        return redirect(url_for("main.index"))

    form = UserForm()
    if form.validate_on_submit():
        user = User(
            username=form.username.data,
            email=form.email.data,
            role_id=form.role.data,
            is_active=form.is_active.data,
        )
        if form.password.data:
            user.set_password(form.password.data)
        db.session.add(user)
        try:
            db.session.commit()
            logger.info(f"User {user.username} created by {current_user.username}")
            flash(f"User {user.username} has been created.")
            return redirect(url_for("admin.user_list"))
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error creating user: {str(e)}")
            flash("Error creating user. Please try again.")
            return redirect(url_for("admin.create_user"))

    return render_template("admin/user_form.html", form=form, title="Create User")


@admin.route("/users/<int:id>/edit", methods=["GET", "POST"])
@login_required
def edit_user(id):
    if not current_user.can_manage_users():
        logger.warning(
            f"Unauthorized access attempt to user editing by {current_user.username}"
        )
        flash("You do not have permission to edit users.")
        return redirect(url_for("main.index"))

    user = User.query.get_or_404(id)
    form = UserForm(original_username=user.username)

    if form.validate_on_submit():
        user.username = form.username.data
        user.email = form.email.data
        user.role_id = form.role.data
        user.is_active = form.is_active.data
        if form.password.data:
            user.set_password(form.password.data)
        try:
            db.session.commit()
            logger.info(f"User {user.username} updated by {current_user.username}")
            flash(f"User {user.username} has been updated.")
            return redirect(url_for("admin.user_list"))
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error updating user: {str(e)}")
            flash("Error updating user. Please try again.")
    elif request.method == "GET":
        form.username.data = user.username
        form.email.data = user.email
        form.role.data = user.role_id
        form.is_active.data = user.is_active

    return render_template("admin/user_form.html", form=form, title="Edit User")


from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_user, logout_user, login_required
from urllib.parse import urlparse
from app.models import User
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, BooleanField, SubmitField
from wtforms.validators import DataRequired, Email


class LoginForm(FlaskForm):
    username = StringField("Username", validators=[DataRequired()])
    password = PasswordField("Password", validators=[DataRequired()])
    remember_me = BooleanField("Remember Me")
    submit = SubmitField("Sign In")


auth = Blueprint("auth", __name__)


@auth.route("/login", methods=["GET", "POST"])
def login():
    if current_user.is_authenticated:
        return redirect(url_for("main.index"))
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(username=form.username.data).first()
        if user is None or not user.check_password(form.password.data):
            flash("Invalid username or password")
            return redirect(url_for("auth.login"))
        login_user(user, remember=form.remember_me.data)
        next_page = request.args.get("next")
        if not next_page or urlparse(next_page).netloc != "":
            next_page = url_for("main.index")
        return redirect(next_page)
    return render_template("auth/login.html", title="Sign In", form=form)


@auth.route("/logout")
@login_required
def logout():
    logger.info(f"User {current_user.username} logged out")
    logout_user()
    return redirect(url_for("main.index"))


@auth.route("/profile")
@login_required
def profile():
    return render_template("auth/profile.html", title="Profile")


@auth.route("/change-password", methods=["GET", "POST"])
@login_required
def change_password():
    form = ChangePasswordForm()
    if form.validate_on_submit():
        if current_user.check_password(form.current_password.data):
            current_user.set_password(form.new_password.data)
            db.session.commit()
            logger.info(f"Password changed for user {current_user.username}")
            flash("Your password has been changed.")
            return redirect(url_for("auth.profile"))
        else:
            logger.warning(
                f"Failed password change attempt for user {current_user.username}"
            )
            flash("Invalid current password.")
    return render_template(
        "auth/change_password.html", form=form, title="Change Password"
    )

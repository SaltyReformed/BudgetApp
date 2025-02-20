import click
from flask.cli import with_appcontext
from app import db
from app.models import User, Role


def register_commands(app):
    @app.cli.command("create-user")
    @click.argument("username")
    @click.argument("email")
    @click.password_option()
    @click.option("--admin", is_flag=True, help="Create user as admin")
    @with_appcontext
    def create_user(username, email, password, admin):
        """Create a new user."""
        if User.query.filter_by(username=username).first():
            click.echo(f"User {username} already exists!")
            return

        # Ensure roles exist
        Role.insert_roles()

        user = User(username=username, email=email)
        user.set_password(password)

        if admin:
            admin_role = Role.query.filter_by(name="Admin").first()
            user.role = admin_role

        db.session.add(user)
        db.session.commit()
        click.echo(f"Created {'admin ' if admin else ''}user {username}")

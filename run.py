# run.py
from app import create_app, db
from app.models import User
import click
from flask.cli import with_appcontext

app = create_app()





if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0")

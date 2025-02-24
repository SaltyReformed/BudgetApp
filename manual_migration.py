# Save this as manual_migration.py in your project root (not in the app folder)
import os
import sys

# Add the project root directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app import create_app, db
from sqlalchemy import text


def run_migration():
    print("Starting manual database migration...")

    try:
        # First, check if expense_category table exists
        result = db.session.execute(
            text(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='expense_category'"
            )
        )
        if not result.fetchone():
            print("Creating expense_category table...")
            db.session.execute(
                text(
                    """
            CREATE TABLE expense_category (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(50) NOT NULL,
                description VARCHAR(200),
                color VARCHAR(7) DEFAULT '#6B7280',
                user_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES user (id)
            )
            """
                )
            )
            print("ExpenseCategory table created successfully.")
        else:
            print("ExpenseCategory table already exists, skipping creation.")

        # Check and add columns to expense table
        print("Checking expense table columns...")

        # Get current columns in the expense table
        result = db.session.execute(text("PRAGMA table_info(expense)"))
        columns = {row[1] for row in result.fetchall()}

        # Add columns that don't exist
        if "due_date" not in columns:
            print("Adding due_date column to expense table...")
            db.session.execute(text("ALTER TABLE expense ADD COLUMN due_date DATE"))

        if "category_id" not in columns:
            print("Adding category_id column to expense table...")
            db.session.execute(
                text(
                    "ALTER TABLE expense ADD COLUMN category_id INTEGER REFERENCES expense_category(id)"
                )
            )

        if "paid" not in columns:
            print("Adding paid column to expense table...")
            db.session.execute(
                text("ALTER TABLE expense ADD COLUMN paid BOOLEAN DEFAULT 0")
            )

        if "updated_at" not in columns:
            print("Adding updated_at column to expense table...")
            db.session.execute(
                text(
                    "ALTER TABLE expense ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP"
                )
            )

        # Commit the transaction
        db.session.commit()
        print("Migration completed successfully!")

    except Exception as e:
        db.session.rollback()
        print(f"Error during migration: {e}")


if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        run_migration()

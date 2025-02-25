import sqlite3
import os


def update_database():
    """Add all new fields to the Expense table"""

    # Find the database file
    # Check the most common locations
    possible_paths = [
        "finance.db",
        "app.db",
        "instance/app.db",
        "instance/finance_app.db",
    ]

    db_path = None
    for path in possible_paths:
        if os.path.exists(path):
            db_path = path
            break

    if not db_path:
        print("Database file not found. Please provide the correct path:")
        db_path = input("> ")
        if not os.path.exists(db_path):
            print(f"Error: File {db_path} not found")
            return

    print(f"Using database at: {db_path}")

    # Connect to the database
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        print("Connected to the database successfully")

        # Check if columns already exist
        cursor.execute("PRAGMA table_info(expense)")
        columns = cursor.fetchall()
        column_names = [col[1] for col in columns]

        # Add all missing columns
        columns_to_add = {
            "frequency_type": "VARCHAR(10)",
            "frequency_value": "INTEGER",
            "start_date": "DATE",
            "end_date": "DATE",
            "parent_expense_id": "INTEGER",
            "updated_at": "DATETIME",
        }

        for column_name, column_type in columns_to_add.items():
            if column_name not in column_names:
                print(f"Adding {column_name} column...")
                cursor.execute(
                    f"ALTER TABLE expense ADD COLUMN {column_name} {column_type}"
                )
                print(f"{column_name} column added successfully")
            else:
                print(f"{column_name} column already exists")

        # Update existing recurring expenses with appropriate values
        print("Updating existing recurring expenses...")
        cursor.execute("SELECT id, frequency FROM expense WHERE recurring = 1")
        recurring_expenses = cursor.fetchall()

        if not recurring_expenses:
            print("No recurring expenses found to update")
        else:
            print(f"Found {len(recurring_expenses)} recurring expenses to update")

        for expense_id, frequency in recurring_expenses:
            frequency_type = None
            frequency_value = None

            if frequency == "daily":
                frequency_type = "days"
                frequency_value = 1
            elif frequency == "weekly":
                frequency_type = "weeks"
                frequency_value = 1
            elif frequency == "bi-weekly":
                frequency_type = "weeks"
                frequency_value = 2
            elif frequency == "monthly":
                frequency_type = "months"
                frequency_value = 1
            elif frequency == "quarterly":
                frequency_type = "months"
                frequency_value = 3
            elif frequency == "semi-annually":
                frequency_type = "months"
                frequency_value = 6
            elif frequency == "annually":
                frequency_type = "years"
                frequency_value = 1

            if frequency_type and frequency_value:
                print(
                    f"Updating expense ID {expense_id} from '{frequency}' to {frequency_value} {frequency_type}"
                )
                cursor.execute(
                    "UPDATE expense SET frequency_type = ?, frequency_value = ? WHERE id = ?",
                    (frequency_type, frequency_value, expense_id),
                )

        # Set updated_at to created_at for existing records (since that's the default)
        print("Initializing updated_at values...")
        cursor.execute(
            "UPDATE expense SET updated_at = created_at WHERE updated_at IS NULL"
        )

        # Commit the changes
        conn.commit()
        print("Database update completed successfully!")

    except sqlite3.Error as e:
        print(f"SQLite error: {e}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if conn:
            conn.close()
            print("Database connection closed")


if __name__ == "__main__":
    update_database()


from datetime import date
from decimal import Decimal, InvalidOperation

from flask import Flask, jsonify, request, render_template
from db import init_db, get_connection

app = Flask(__name__)

# Create the database table if it doesn't exist.
init_db()




@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/expenses", methods=["GET"])
def get_expenses():
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT id, amount, category, description,
                   expense_date, created_at
            FROM expenses
            ORDER BY expense_date DESC, id DESC
            """
        ).fetchall()

    return jsonify([dict(row) for row in rows])




@app.route("/api/expenses", methods=["POST"])
def add_expense():
    # 1. Check that the request contains JSON.
    if not request.is_json:
        return jsonify({
            "error": "Request must contain JSON data."
        }), 415

    data = request.get_json()

    if not isinstance(data, dict):
        return jsonify({
            "error": "JSON data must be an object."
        }), 400

    # 2. Check required fields.
    required_fields = ["amount", "category", "expense_date"]

    for field in required_fields:
        if field not in data:
            return jsonify({
                "error": f"Missing required field: {field}"
            }), 400

    # 3. Validate the amount.
    try:
        amount = Decimal(str(data["amount"]))
        if not amount.is_finite() or amount <= 0:
            raise InvalidOperation
        if amount.as_tuple().exponent < -2:
            raise InvalidOperation
        if amount >= Decimal("100000000"):
            raise InvalidOperation
    except (InvalidOperation, ValueError):
        return jsonify({
            "error": "Amount must be positive and have at most two decimal places."
        }), 400

    # 4. Validate the category.
    category = data["category"]

    if not isinstance(category, str) or not category.strip():
        return jsonify({
            "error": "Category must be a non-empty string."
        }), 400

    category = category.strip()

    if len(category) > 50:
        return jsonify({
            "error": "Category must be 50 characters or fewer."
        }), 400

    # 5. Validate the optional description.
    description = data.get("description", "")

    if description is None:
        description = ""

    if not isinstance(description, str):
        return jsonify({
            "error": "Description must be a string."
        }), 400

    description = description.strip()

    if len(description) > 255:
        return jsonify({
            "error": "Description must be 255 characters or fewer."
        }), 400

    # 6. Validate the date.
    try:
        if not isinstance(data["expense_date"], str):
            raise ValueError

        expense_date = date.fromisoformat(data["expense_date"])

        if expense_date.isoformat() != data["expense_date"]:
            raise ValueError
    except ValueError:
        return jsonify({
            "error": "Date must use YYYY-MM-DD format."
        }), 400

    # 7. Insert the expense using a parameterized SQL query.
    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO expenses
                (amount, category, description, expense_date)
            VALUES (?, ?, ?, ?)
            """,
            (
                str(amount),
                category,
                description,
                expense_date.isoformat()
            )
        )

        expense_id = cursor.lastrowid

        row = connection.execute(
            "SELECT * FROM expenses WHERE id = ?",
            (expense_id,)
        ).fetchone()

    # 8. Return the saved expense.
    return jsonify(dict(row)), 201



@app.route("/api/expenses/<int:expense_id>", methods=["PUT"])
def update_expense(expense_id):
    data = request.get_json(silent=True) or {}

    amount = data.get("amount")
    category = data.get("category")
    description = data.get("description", "")
    expense_date = data.get("expense_date")

    # Validate the amount.
    try:
        amount_decimal = Decimal(str(amount))
        if (
            not amount_decimal.is_finite()
            or amount_decimal <= 0
            or amount_decimal >= Decimal("100000000")
            or amount_decimal.as_tuple().exponent < -2
        ):
            raise ValueError
    except (InvalidOperation, ValueError, TypeError):
        return jsonify({
            "error": "Amount must be positive and have at most two decimal places."
        }), 400

    # Validate the category.
    if not isinstance(category, str) or not category.strip() or len(category.strip()) > 50:
        return jsonify({"error": "Enter a valid category."}), 400

    # Validate the description.
    if not isinstance(description, str) or len(description) > 255:
        return jsonify({"error": "Description must be 255 characters or fewer."}), 400

    # Validate the date.
    try:
        date.fromisoformat(expense_date)
    except (ValueError, TypeError):
        return jsonify({"error": "Enter a valid expense date."}), 400

    with get_connection() as connection:
        cursor = connection.execute(
            """
            UPDATE expenses
            SET amount = ?, category = ?, description = ?, expense_date = ?
            WHERE id = ?
            """,
            (
                str(amount_decimal),
                category.strip(),
                description.strip(),
                expense_date,
                expense_id,
            ),
        )

        if cursor.rowcount == 0:
            return jsonify({"error": "Expense not found."}), 404

    return jsonify({"message": "Expense updated successfully."}), 200



@app.route("/api/expenses/<int:expense_id>", methods=["DELETE"])
def delete_expense(expense_id):
    with get_connection() as connection:
        cursor = connection.execute(
            "DELETE FROM expenses WHERE id = ?",
            (expense_id,)
        )

        if cursor.rowcount == 0:
            return jsonify({
                "error": "Expense not found."
            }), 404

    return jsonify({
        "message": "Expense deleted successfully.",
        "id": expense_id
    }), 200

@app.route("/api/summary", methods=["GET"])
def get_summary():
    today = date.today()
    month_start = today.replace(day=1).isoformat()

    # Calculate the first day of the next month.
    if today.month == 12:
        next_month_start = date(today.year + 1, 1, 1).isoformat()
    else:
        next_month_start = date(
            today.year, today.month + 1, 1
        ).isoformat()

    with get_connection() as connection:
        # Calculate total spending and expense count.
        overall = connection.execute(
            """
            SELECT
                COALESCE(SUM(amount), 0) AS total_spending,
                COUNT(*) AS expense_count
            FROM expenses
            """
        ).fetchone()

        # Calculate spending grouped by category.
        categories = connection.execute(
            """
            SELECT
                category,
                SUM(amount) AS total
            FROM expenses
            GROUP BY category
            ORDER BY total DESC
            """
        ).fetchall()

        # Calculate spending in the current calendar month.
        monthly = connection.execute(
            """
            SELECT COALESCE(SUM(amount), 0) AS monthly_spending
            FROM expenses
            WHERE expense_date >= ?
              AND expense_date < ?
            """,
            (month_start, next_month_start)
        ).fetchone()

    return jsonify({
        "total_spending": overall["total_spending"],
        "expense_count": overall["expense_count"],
        "monthly_spending": monthly["monthly_spending"],
        "category_totals": [
            {
                "category": row["category"],
                "total": row["total"]
            }
            for row in categories
        ]
    })




if __name__ == "__main__":
    app.run(debug=True)

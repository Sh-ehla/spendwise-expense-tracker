# SpendWise an Expense Tracker

SpendWise is a personal expense tracking web application built with Python and Flask. It provides a dashboard for recording expenses, reviewing spending patterns, and organizing transactions by category.

## Features

- **Expense management:** Add, edit, and delete expense records.
- **Dashboard summary:** View total spending and expense counts.
- **Category insights:** Review spending by category using a doughnut chart and category breakdown.
- **Time-based filtering:** Switch between all-time and current-month category insights.
- **Expense history:** View recorded expenses in a structured table.
- **Persistent storage:** Store expense records in a local SQLite database.
- **Responsive interface:** A dashboard styled with HTML, CSS, and JavaScript.

## Tech Stack

| Technology | Purpose |
|---|---|
| Python | Application logic |
| Flask | Web application and REST API |
| SQLite | Database and persistent storage |
| HTML | Page structure |
| CSS | Dashboard styling |
| JavaScript | Interactive features and API requests |
| Chart.js | Spending visualization |
| Git and GitHub | Version control and source code hosting |

## Project Structure

```text
spendwise-expense-tracker/
├── app.py              # Flask application and API routes
├── db.py               # Database connection and initialization
├── templates/
│   └── index.html      # Dashboard page
├── static/
│   ├── style.css       # Dashboard styling
│   └── script.js       # Frontend interactions
├── .gitignore
└── README.md
```

The SQLite database is created locally when the database initialization code is run. It is excluded from version control so that local transaction data is not published.

## Getting Started

### Prerequisites

- Python 3.10 or later
- pip
- Git

### 1. Clone the repository

```bash
git clone https://github.com/Sh-ehla/spendwise-expense-tracker.git
cd spendwise-expense-tracker
```

### 2. Create a virtual environment

**Windows (PowerShell):**

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

If PowerShell blocks activation, you can temporarily allow it in the current terminal session:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

### 3. Install dependencies

```bash
python -m pip install Flask
```

### 4. Initialize the database

```bash
python db.py
```

This creates the local SQLite database if it does not already exist.

### 5. Run the application

```bash
python app.py
```

Open the following address in your browser:

http://127.0.0.1:5000

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/expenses` | Retrieve expense records |
| GET | `/api/summary` | Retrieve spending summaries |
| POST | `/api/expenses` | Add an expense |
| PUT | `/api/expenses/<id>` | Update an existing expense |
| DELETE | `/api/expenses/<id>` | Delete an expense |

## Database

SpendWise uses SQLite to store expense records. Each expense includes an amount, category, optional description, expense date, and creation timestamp.

The database file is local to the application and is not included in the Git repository.

## Future Improvements

- Add automated tests for the Flask API.
- Improve input validation and error handling.
- Add date-range and category filters for expense history.
- Introduce user authentication and individual expense records.
- Explore deployment with production-ready configuration.

## Author

**GitHub:** [Sh-ehla](https://github.com/Sh-ehla)

---

*SpendWise is a learning and portfolio project demonstrating Python, Flask, SQL database operations, REST API development, and frontend integration.*
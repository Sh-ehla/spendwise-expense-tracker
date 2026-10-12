
"use strict";

const $ = (id) => document.getElementById(id);

const form = $("expense-form");
const expenseList = $("expense-list");
const formMessage = $("form-message");
const submitButton = $("submit-button");
const refreshButton = $("refresh-button");

const currency = new Intl.NumberFormat("sv-SE", {
  style: "currency",
  currency: "SEK"
});

const colors = [
  "#35b66c", "#4d8df7", "#e96a78",
  "#8966db", "#efa52c", "#36b9b0", "#8993a8"
];

// let expenses = [];
// let chart = null;
let expenses = [];
let chart = null;
let chartPeriod = "all";

function money(value) {
  return currency.format(Number(value) || 0);
}

function localDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function message(text, error = false) {
  formMessage.textContent = text;
  formMessage.classList.toggle("error", error);
}

function renderExpenses() {
  expenseList.replaceChildren();

  if (!expenses.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.className = "empty-state";
    cell.textContent = "No expenses yet. Add your first one!";
    row.appendChild(cell);
    expenseList.appendChild(row);
    return;
  }

  expenses.forEach((expense) => {
    const row = document.createElement("tr");

    const descriptionCell = document.createElement("td");
    const description = document.createElement("strong");
    description.textContent = expense.description || expense.category;
    const subtext = document.createElement("small");
    subtext.textContent = expense.description ? "Personal expense" : "Expense";
    descriptionCell.append(description, subtext);

    const categoryCell = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = "category-badge";
    badge.textContent = expense.category;
    categoryCell.appendChild(badge);

    const dateCell = document.createElement("td");
    dateCell.textContent = expense.expense_date;

    const amountCell = document.createElement("td");
    amountCell.className = "amount-cell";
    amountCell.textContent = money(expense.amount);

    const actionCell = document.createElement("td");

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "edit-button";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => {
    startEditing(expense);
    });

    const button = document.createElement("button");
    button.type = "button";
    button.className = "delete-button";
    button.textContent = "Delete";
    button.addEventListener("click", () => {
    deleteExpense(expense.id, button);
    });

    actionCell.append(editButton, button);


    row.append(
      descriptionCell, categoryCell, dateCell, amountCell, actionCell
    );
    expenseList.appendChild(row);
  });
}

function renderLegend(categories, total) {
  const legend = $("category-chart-legend");
  legend.replaceChildren();

  if (!categories.length) {
    const empty = document.createElement("p");
    empty.className = "chart-empty";
    empty.textContent = "Add an expense to see your spending breakdown.";
    legend.appendChild(empty);
    return;
  }

  categories.forEach((item, index) => {
    const amount = Number(item.total) || 0;
    const percentage = total > 0 ? amount / total * 100 : 0;

    const row = document.createElement("div");
    row.className = "legend-row";

    const category = document.createElement("div");
    category.className = "legend-category";

    const dot = document.createElement("span");
    dot.className = "legend-dot";
    dot.style.backgroundColor = colors[index % colors.length];

    const name = document.createElement("span");
    name.textContent = item.category;
    category.append(dot, name);

    const value = document.createElement("span");
    value.className = "legend-value";
    value.textContent = money(amount);

    const share = document.createElement("div");
    share.className = "legend-share";

    const percent = document.createElement("span");
    percent.textContent = `${Math.round(percentage)}%`;

    const track = document.createElement("div");
    track.className = "progress-track";

    const bar = document.createElement("div");
    bar.className = "progress-bar";
    bar.style.width = `${percentage}%`;
    bar.style.backgroundColor = colors[index % colors.length];

    track.appendChild(bar);
    share.append(percent, track);
    row.append(category, value, share);
    legend.appendChild(row);
  });
}

function renderChart(categories) {
  const canvas = $("spending-chart");
  if (!canvas || typeof Chart === "undefined") return;

  if (chart) {
    chart.destroy();
    chart = null;
  }

  // Also remove any existing chart attached to this canvas.
  const existing = Chart.getChart(canvas);
  if (existing) existing.destroy();

  if (!categories.length) return;

  chart = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: categories.map((item) => item.category),
      datasets: [{
        data: categories.map((item) => Number(item.total) || 0),
        backgroundColor: categories.map(
          (_, index) => colors[index % colors.length]
        ),
        borderColor: "#ffffff",
        borderWidth: 3,
        hoverOffset: 7
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: "66%",
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) =>
              `${context.label}: ${money(context.raw)}`
          }
        }
      }
    }
  });
}




function getFilteredSummary() {
  const currentMonth = localDate().slice(0, 7);

  const filtered = chartPeriod === "month"
    ? expenses.filter(expense =>
        typeof expense.expense_date === "string" &&
        expense.expense_date.startsWith(currentMonth)
      )
    : expenses;

  const totals = {};

  filtered.forEach(expense => {
    const category = expense.category;
    totals[category] =
      (totals[category] || 0) + (Number(expense.amount) || 0);
  });

  const categoryTotals = Object.entries(totals)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);

  return {
    total: filtered.reduce(
      (sum, expense) => sum + (Number(expense.amount) || 0),
      0
    ),
    categories: categoryTotals
  };
}


function renderSummary(summary) {
  const total = Number(summary.total_spending) || 0;
  const count = Number(summary.expense_count) || 0;

  const filteredSummary = getFilteredSummary();
  const categories = filteredSummary.categories;
  const chartTotalAmount = filteredSummary.total;

  $("total-spending").textContent = money(total);
  $("expense-count").textContent = String(count);

  $("chart-total").textContent = money(chartTotalAmount);

  if (categories.length && total > 0) {
    const top = categories.reduce((best, item) =>
      Number(item.total) > Number(best.total) ? item : best
    );

    const topAmount = Number(top.total) || 0;
    const share = Math.round(topAmount / total * 100);

    $("top-category").textContent = top.category;
    $("top-category-total").textContent = money(topAmount);
    $("top-category-share").textContent = `${share}%`;

    $("top-category-ring").style.background =
      `conic-gradient(${colors[0]} ${share}%, #d7f3e2 ${share}% 100%)`;
  } else {
    $("top-category").textContent = "—";
    $("top-category-total").textContent = "No spending recorded";
    $("top-category-share").textContent = "0%";
    $("top-category-ring").style.background = "";
  }

  const month = localDate().slice(0, 7);
  const monthlyTotal = expenses.reduce((sum, expense) => {
    return typeof expense.expense_date === "string" &&
      expense.expense_date.startsWith(month)
      ? sum + (Number(expense.amount) || 0)
      : sum;
  }, 0);

  $("monthly-spending").textContent = money(monthlyTotal);

  renderLegend(categories, total);
  renderChart(categories);
}

async function requestJSON(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "The request failed.");
  }

  return data;
}

async function refreshDashboard() {
  refreshButton.disabled = true;

  try {
    message("");

    // Load expenses first because monthly spending uses their dates.
    expenses = await requestJSON("/api/expenses");
    renderExpenses();

    const summary = await requestJSON("/api/summary");
    renderSummary(summary);
  } catch (error) {
    message(error.message, true);
    console.error("Dashboard refresh failed:", error);
  } finally {
    refreshButton.disabled = false;
  }
}


async function startEditing(expense) {
  const description = window.prompt(
    "Edit description:",
    expense.description || ""
  );
  if (description === null) return;

  const amount = window.prompt("Edit amount (SEK):", expense.amount);
  if (amount === null) return;

  const category = window.prompt("Edit category:", expense.category);
  if (category === null) return;

  const expenseDate = window.prompt(
    "Edit date (YYYY-MM-DD):",
    expense.expense_date
  );
  if (expenseDate === null) return;

  try {
    await requestJSON(`/api/expenses/${expense.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description,
        amount,
        category,
        expense_date: expenseDate
      })
    });

    await refreshDashboard();
    message("Expense updated successfully!");
  } catch (error) {
    message(error.message, true);
  }
}


async function deleteExpense(id, button) {
  if (!window.confirm("Are you sure you want to delete this expense?")) {
    return;
  }

  button.disabled = true;

  try {
    await requestJSON(`/api/expenses/${id}`, { method: "DELETE" });
    await refreshDashboard();
    message("Expense deleted successfully!");
  } catch (error) {
    message(error.message, true);
    button.disabled = false;
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!form.reportValidity()) return;

  const data = new FormData(form);
  const expense = {
    amount: data.get("amount"),
    category: data.get("category"),
    description: String(data.get("description") || "").trim(),
    expense_date: data.get("expense_date")
  };

  submitButton.disabled = true;

  try {
    await requestJSON("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(expense)
    });

    form.reset();
    $("expense-date").value = localDate();

    await refreshDashboard();
    message("Expense added successfully!");
  } catch (error) {
    message(error.message, true);
  } finally {
    submitButton.disabled = false;
  }
});

refreshButton.addEventListener("click", refreshDashboard);

$("expense-date").value = localDate();

const now = new Date();
$("current-day").textContent = new Intl.DateTimeFormat("en-GB", {
  weekday: "long"
}).format(now);
$("current-date").textContent = new Intl.DateTimeFormat("en-GB", {
  day: "numeric", month: "short", year: "numeric"
}).format(now);
$("monthly-label").textContent = new Intl.DateTimeFormat("en-GB", {
  month: "long", year: "numeric"
}).format(now);

refreshDashboard();


const periodToggle = $("chart-period-toggle");

periodToggle.addEventListener("click", () => {
  chartPeriod = chartPeriod === "all" ? "month" : "all";

  periodToggle.textContent =
    chartPeriod === "all" ? "All time" : "This month";

  refreshDashboard();
});
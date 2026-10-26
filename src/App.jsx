import { useEffect, useMemo, useState } from "react";
import "./App.css";

const today = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const currentMonth = () => today().slice(0, 7);

const initialTransactions = [
  { id: 1, name: "Grocery shopping", category: "Food & Groceries", date: "2026-10-26", amount: 1250, type: "expense" },
  { id: 2, name: "Monthly stipend", category: "Salary & Income", date: "2026-10-26", amount: 12000, type: "income" },
  { id: 3, name: "Uber ride", category: "Transport", date: "2026-10-25", amount: 340, type: "expense" },
  { id: 4, name: "Netflix subscription", category: "Entertainment", date: "2026-10-25", amount: 649, type: "expense" },
  { id: 5, name: "Cafe coffee", category: "Food & Drinks", date: "2026-10-24", amount: 180, type: "expense" },
];

const categories = [
  "Food & Groceries",
  "Food & Drinks",
  "Transport",
  "Shopping",
  "Entertainment",
  "Bills & Utilities",
  "Education",
  "Health",
  "Salary & Income",
  "Other",
];

const chartColors = ["#638765", "#b5cba8", "#d8c6a0", "#e5e8df", "#566878", "#9aaec0"];

const formatINR = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

const monthLabel = (month) => {
  if (!month) return "Select month";
  return new Date(`${month}-01T12:00:00`).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
};

// Parse CSV safely, including quoted descriptions containing commas.
function parseCSVText(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const input = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (char === '"') {
      if (inQuotes && input[i + 1] === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(field.trim());
      field = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && input[i + 1] === "\n") i += 1;
      row.push(field.trim());

      if (row.some((value) => value !== "")) {
        rows.push(row);
      }

      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.trim());

    if (row.some((value) => value !== "")) {
      rows.push(row);
    }
  }

  return rows;
}

function normalizeCSVDate(value) {
  const raw = String(value || "").trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const parsed = new Date(`${raw}T12:00:00`);

    if (
      parsed.getFullYear() === Number(raw.slice(0, 4)) &&
      parsed.getMonth() + 1 === Number(raw.slice(5, 7)) &&
      parsed.getDate() === Number(raw.slice(8, 10))
    ) {
      return raw;
    }

    return "";
  }

  const match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);

  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);

    const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const parsed = new Date(`${date}T12:00:00`);

    if (
      parsed.getFullYear() === year &&
      parsed.getMonth() + 1 === month &&
      parsed.getDate() === day
    ) {
      return date;
    }
  }

  return "";
}

function guessCategory(description, type) {
  if (type === "income") {
    return /salary|stipend|payroll|interest|refund|cashback|deposit|freelance/i.test(description)
      ? "Salary & Income"
      : "Other";
  }

  if (/grocery|supermarket|vegetable|fruit|provision|market/i.test(description)) {
    return "Food & Groceries";
  }

  if (/restaurant|cafe|coffee|food|swiggy|zomato|pizza|lunch|dinner/i.test(description)) {
    return "Food & Drinks";
  }

  if (/uber|ola|metro|bus|train|fuel|petrol|transport|cab|rapido/i.test(description)) {
    return "Transport";
  }

  if (/amazon|flipkart|shopping|clothing|mall|store/i.test(description)) {
    return "Shopping";
  }

  if (/netflix|spotify|movie|cinema|game|entertainment/i.test(description)) {
    return "Entertainment";
  }

  if (/electricity|water bill|mobile bill|internet|recharge|utility|gas bill/i.test(description)) {
    return "Bills & Utilities";
  }

  if (/college|course|book|tuition|education/i.test(description)) {
    return "Education";
  }

  if (/hospital|doctor|pharmacy|medicine|medical|health/i.test(description)) {
    return "Health";
  }

  return "Other";
}

function getCSVColumn(headers, candidates) {
  return headers.findIndex((header) =>
    candidates.includes(header.trim().toLowerCase().replace(/[\s_-]+/g, ""))
  );
}

function prepareCSVTransactions(text, existingTransactions) {
  const rows = parseCSVText(text);

  if (rows.length < 2) {
    return {
      items: [],
      error: "The CSV needs a header row and at least one transaction row.",
    };
  }

  const headers = rows[0].map((header) =>
    header.toLowerCase().replace(/^\uFEFF/, "").trim()
  );

  const dateIndex = getCSVColumn(headers, [
    "date",
    "transactiondate",
    "valuedate",
    "postingdate",
  ]);

  const nameIndex = getCSVColumn(headers, [
    "description",
    "name",
    "narration",
    "particulars",
    "details",
    "merchant",
    "transaction",
  ]);

  const amountIndex = getCSVColumn(headers, [
    "amount",
    "transactionamount",
  ]);

  const typeIndex = getCSVColumn(headers, [
    "type",
    "transactiontype",
    "drcr",
    "debitcredit",
  ]);

  const debitIndex = getCSVColumn(headers, [
    "debit",
    "withdrawal",
    "withdrawals",
    "paidout",
  ]);

  const creditIndex = getCSVColumn(headers, [
    "credit",
    "deposit",
    "deposits",
    "paidin",
  ]);

  if (
    dateIndex < 0 ||
    nameIndex < 0 ||
    (amountIndex < 0 && debitIndex < 0 && creditIndex < 0)
  ) {
    return {
      items: [],
      error:
        "Couldn't identify the required columns. Include Date, Description, and Amount + Type, or Debit/Credit columns.",
    };
  }

  const seen = new Set(
    existingTransactions.map(
      (item) =>
        `${item.date}|${item.name.trim().toLowerCase()}|${Number(item.amount)}|${item.type}`
    )
  );

  const items = rows.slice(1).map((cells, index) => {
    const rawDate = cells[dateIndex] || "";
    const date = normalizeCSVDate(rawDate);
    const name = String(cells[nameIndex] || "").trim();

    const debitRaw =
      debitIndex >= 0
        ? String(cells[debitIndex] || "").replace(/[₹,\s]/g, "")
        : "";

    const creditRaw =
      creditIndex >= 0
        ? String(cells[creditIndex] || "").replace(/[₹,\s]/g, "")
        : "";

    const amountRaw =
      amountIndex >= 0
        ? String(cells[amountIndex] || "")
            .replace(/[₹,\s]/g, "")
            .replace(/[()]/g, "")
        : "";

    let amount = 0;
    let type = "expense";

    if (debitRaw && Number(debitRaw) !== 0) {
      amount = Math.abs(Number(debitRaw));
      type = "expense";
    } else if (creditRaw && Number(creditRaw) !== 0) {
      amount = Math.abs(Number(creditRaw));
      type = "income";
    } else {
      amount = Math.abs(Number(amountRaw));

      const rawType =
        typeIndex >= 0
          ? String(cells[typeIndex] || "").trim().toLowerCase()
          : "";

      if (/credit|income|deposit|cr\b/.test(rawType)) {
        type = "income";
      } else if (/debit|expense|withdraw|dr\b/.test(rawType)) {
        type = "expense";
      } else if (
        amountIndex >= 0 &&
        (
          String(cells[amountIndex] || "").trim().startsWith("-") ||
          /^\(.*\)$/.test(String(cells[amountIndex] || "").trim())
        )
      ) {
        type = "expense";
      }
    }

    const error = !date
      ? "Invalid date (use YYYY-MM-DD or DD/MM/YYYY)"
      : !name
        ? "Missing description"
        : !Number.isFinite(amount) || amount <= 0
          ? "Amount must be greater than ₹0"
          : "";

    const category = guessCategory(name, type);
    const duplicateKey = `${date}|${name.toLowerCase()}|${amount}|${type}`;
    const duplicate = !error && seen.has(duplicateKey);

    if (!error && !duplicate) {
      seen.add(duplicateKey);
    }

    return {
      rowNumber: index + 2,
      transaction: {
        id: `csv-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
        name,
        category,
        date,
        amount,
        type,
      },
      error,
      duplicate,
    };
  });

  return { items, error: "" };
}

function App() {
  const [transactions, setTransactions] = useState(() => {
    try {
      const saved = localStorage.getItem("spendsense-transactions");
      return saved ? JSON.parse(saved) : initialTransactions;
    } catch {
      return initialTransactions;
    }
  });

  const [budget, setBudget] = useState(() => {
    try {
      const saved = localStorage.getItem("spendsense-budget");
      return saved ? Number(saved) : 30000;
    } catch {
      return 30000;
    }
  });

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [csvPreview, setCsvPreview] = useState([]);
  const [csvError, setCsvError] = useState("");
  const [csvFileName, setCsvFileName] = useState("");
  const [filter, setFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    name: "",
    category: "Food & Groceries",
    amount: "",
    type: "expense",
    date: today(),
  });

  useEffect(() => {
    localStorage.setItem("spendsense-transactions", JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem("spendsense-budget", String(budget));
  }, [budget]);

  const monthlyTransactions = useMemo(
    () => transactions.filter((item) => item.date?.startsWith(selectedMonth)),
    [transactions, selectedMonth]
  );

  const totalSpent = useMemo(
    () =>
      monthlyTransactions
        .filter((item) => item.type === "expense")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [monthlyTransactions]
  );

  const totalIncome = useMemo(
    () =>
      monthlyTransactions
        .filter((item) => item.type === "income")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [monthlyTransactions]
  );

  const remaining = budget - totalSpent;
  const savings = totalIncome - totalSpent;

  const categoryTotals = useMemo(() => {
    const totals = {};

    monthlyTransactions
      .filter((item) => item.type === "expense")
      .forEach((item) => {
        const category = item.category || "Other";
        totals[category] = (totals[category] || 0) + Number(item.amount || 0);
      });

    return Object.entries(totals).sort((a, b) => b[1] - a[1]);
  }, [monthlyTransactions]);

  const filteredTransactions = useMemo(
    () =>
      transactions
        .filter((item) => filter === "All" || item.category === filter)
        .filter((item) => typeFilter === "all" || item.type === typeFilter)
        .filter((item) => item.name.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [transactions, filter, typeFilter, search]
  );

  function addTransaction(event) {
    event.preventDefault();

    const amount = Number(form.amount);

    if (!form.name.trim() || !Number.isFinite(amount) || amount <= 0 || !form.date) {
      return;
    }

    const newTransaction = {
      id: Date.now(),
      name: form.name.trim(),
      category: form.category,
      amount,
      type: form.type,
      date: form.date,
    };

    setTransactions((current) => [newTransaction, ...current]);
    setSelectedMonth(form.date.slice(0, 7));

    setForm({
      name: "",
      category: "Food & Groceries",
      amount: "",
      type: "expense",
      date: today(),
    });

    setShowForm(false);
  }

  async function handleCSVFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    setCsvError("");
    setCsvPreview([]);

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setCsvError("Please choose a .csv file.");
      event.target.value = "";
      return;
    }

    try {
      const text = await file.text();
      const result = prepareCSVTransactions(text, transactions);

      if (result.error) {
        setCsvError(result.error);
      } else {
        setCsvPreview(result.items);

        if (result.items.length === 0) {
          setCsvError("No transaction rows were found in this file.");
        }
      }
    } catch {
      setCsvError("This file couldn't be read. Please try another CSV file.");
    }

    event.target.value = "";
  }

  function importCSVTransactions() {
    const validItems = csvPreview
      .filter((item) => !item.error && !item.duplicate)
      .map((item) => item.transaction);

    if (validItems.length === 0) {
      setCsvError("There are no new valid transactions to import.");
      return;
    }

    setTransactions((current) => [...validItems, ...current]);

    const newestDate = validItems.reduce(
      (latest, item) => (item.date > latest ? item.date : latest),
      validItems[0].date
    );

    setSelectedMonth(newestDate.slice(0, 7));
    setCsvPreview([]);
    setCsvError("");
    setCsvFileName("");
    setShowImport(false);
  }

  function closeCSVImport() {
    setShowImport(false);
    setCsvPreview([]);
    setCsvError("");
    setCsvFileName("");
  }

  function deleteTransaction(id) {
    setTransactions((current) => current.filter((item) => item.id !== id));
  }

  function editBudget() {
    const value = window.prompt("Enter your monthly budget in ₹", String(budget));

    if (
      value !== null &&
      value.trim() !== "" &&
      Number.isFinite(Number(value)) &&
      Number(value) > 0
    ) {
      setBudget(Number(value));
    }
  }

  const maxCategory = Math.max(...categoryTotals.map((item) => item[1]), 1);
  const topCategory = categoryTotals[0];
  const budgetPercent = budget > 0 ? Math.min((totalSpent / budget) * 100, 100) : 0;

  const donutGradient = useMemo(() => {
    if (totalSpent <= 0) return "#e5e8df";

    let runningTotal = 0;

    const segments = categoryTotals.map(([category, amount], index) => {
      const start = (runningTotal / totalSpent) * 100;
      runningTotal += amount;
      const end = (runningTotal / totalSpent) * 100;

      return `${chartColors[index % chartColors.length]} ${start}% ${end}%`;
    });

    return `conic-gradient(${segments.join(", ")})`;
  }, [categoryTotals, totalSpent]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#overview">
          <span className="brand-mark">S</span>
          <span>
            spendsense<span className="brand-dot">.</span>
          </span>
        </a>

        <p className="nav-label">WORKSPACE</p>

        <nav className="navigation">
          <a className="nav-item active" href="#overview"><span>◫</span> Overview</a>
          <a className="nav-item" href="#transactions"><span>↕</span> Transactions</a>
          <a className="nav-item" href="#budgets"><span>◷</span> Budgets</a>
          <a className="nav-item" href="#insights"><span>✳</span> Money insights <span className="ai-tag">AI</span></a>
        </nav>

        <div className="sidebar-bottom">
          <div className="upgrade-card">
            <span className="upgrade-icon">✦</span>
            <h3>Make smarter moves.</h3>
            <p>Small changes today can build a better financial future.</p>
            <a href="#insights">Explore insights ↗</a>
          </div>

          <div className="profile">
            <div className="avatar">Y</div>
            <div className="profile-copy">
              <strong>Your Wallet</strong>
              <span>Personal account</span>
            </div>
            <span className="profile-menu">•••</span>
          </div>
        </div>
      </aside>

      <main className="main-content" id="overview">
        <header className="topbar">
          <div className="breadcrumb">Workspace <span>/</span> Overview</div>

          <div className="topbar-right">
            <label className="month-picker-label">
              <span>◷</span>
              <input
                className="month-picker"
                aria-label="Select dashboard month"
                type="month"
                value={selectedMonth}
                onChange={(event) =>
                  setSelectedMonth(event.target.value || currentMonth())
                }
              />
            </label>

            <div className="avatar top-avatar">Y</div>
          </div>
        </header>

        <section className="welcome-row">
          <div>
            <p className="eyebrow">YOUR PERSONAL FINANCE DASHBOARD</p>
            <h1>Your money, <span>in perspective.</span></h1>
            <p className="welcome-subtitle">A clearer picture of your spending starts here.</p>
          </div>

          <div className="welcome-actions">
            <button className="secondary-button" onClick={() => setShowImport(true)}>
              <span>↥</span> Import CSV
            </button>

            <button
              className="primary-button"
              onClick={() => {
                setForm((current) => ({
                  ...current,
                  date: `${selectedMonth}-${today().slice(8, 10)}`,
                }));
                setShowForm(true);
              }}
            >
              <span>＋</span> Add transaction
            </button>
          </div>
        </section>

        <section className="summary-grid" id="budgets">
          <article className="summary-card">
            <div className="card-topline">
              <span>Total spent</span>
              <span className="metric-icon green-icon">↗</span>
            </div>
            <h2>{formatINR(totalSpent)}</h2>
            <p className="metric-note">
              <span className="positive">{monthLabel(selectedMonth)}</span>
              <span> · expenses</span>
            </p>
            <div className="mini-bars" aria-label="Decorative spending trend">
              {[35, 52, 42, 68, 48, 76, 55, 85, 63, 72, 50, 91].map((height, i) => (
                <span key={i} style={{ height: `${height}%` }} />
              ))}
            </div>
          </article>

          <article className="summary-card">
            <div className="card-topline">
              <span>Monthly budget</span>
              <span className="metric-icon">◎</span>
            </div>
            <h2>{formatINR(budget)}</h2>
            <p className="metric-note">
              <span>{budgetPercent.toFixed(1)}% used</span>
              <span className="muted"> · {monthLabel(selectedMonth)}</span>
            </p>
            <div className="progress-track">
              <span style={{ width: `${budgetPercent}%` }} />
            </div>
            <p className="bottom-note">
              {formatINR(Math.abs(remaining))} {remaining >= 0 ? "remaining" : "over budget"}
            </p>
            <button className="text-button" onClick={editBudget}>Edit budget →</button>
          </article>

          <article className="summary-card">
            <div className="card-topline">
              <span>Income − spending</span>
              <span className="metric-icon purple-icon">✳</span>
            </div>
            <h2>{formatINR(savings)}</h2>
            <p className="metric-note">
              <span className={savings >= 0 ? "positive" : "purple-text"}>
                {savings >= 0 ? "Net balance" : "Negative balance"}
              </span>
            </p>
            <p className="bottom-note">Income minus recorded expenses</p>
          </article>

          <article className="summary-card category-summary">
            <div className="card-topline">
              <span>Top category</span>
              <span className="metric-icon orange-icon">⌁</span>
            </div>
            <h2>{topCategory ? topCategory[0] : "No expenses yet"}</h2>
            <p className="metric-note">
              <span>
                {topCategory
                  ? `${Math.round((topCategory[1] / Math.max(totalSpent, 1)) * 100)}% of spending`
                  : "Add an expense to begin"}
              </span>
            </p>
            <div className="category-line">
              {categoryTotals.slice(0, 4).map(([category, amount], index) => (
                <span
                  key={category}
                  title={category}
                  style={{
                    flex: amount,
                    background: chartColors[index % chartColors.length],
                  }}
                />
              ))}
            </div>
            <p className="bottom-note">
              {topCategory
                ? `${formatINR(topCategory[1])} spent`
                : "Your category summary will appear here"}
            </p>
          </article>
        </section>

        <section className="middle-grid">
          <article className="panel spending-panel">
            <div className="panel-heading">
              <div>
                <h3>Spending overview</h3>
                <p>Your largest spending categories</p>
              </div>
              <span className="subtle-button">{monthLabel(selectedMonth)}</span>
            </div>

            {categoryTotals.length === 0 ? (
              <p className="empty-state">
                No expenses recorded for {monthLabel(selectedMonth)}.
              </p>
            ) : (
              <div className="category-bars">
                {categoryTotals.slice(0, 5).map(([category, amount]) => (
                  <div className="category-bar-row" key={category}>
                    <div className="category-bar-label">
                      <span>{category}</span>
                      <strong>{formatINR(amount)}</strong>
                    </div>
                    <div className="progress-track">
                      <span style={{ width: `${(amount / maxCategory) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="panel category-panel">
            <div className="panel-heading">
              <div>
                <h3>Where it goes</h3>
                <p>Spending by category</p>
              </div>
              <span className="more-button">•••</span>
            </div>

            {categoryTotals.length === 0 ? (
              <p className="empty-state">Your category chart will appear here.</p>
            ) : (
              <>
                <div className="donut-area">
                  <div className="donut-chart" style={{ background: donutGradient }}>
                    <div className="donut-hole">
                      <strong>{formatINR(totalSpent)}</strong>
                      <span>Total spent</span>
                    </div>
                  </div>
                </div>

                <div className="category-legend">
                  {categoryTotals.slice(0, 6).map(([category, amount], index) => (
                    <div key={category}>
                      <span
                        className="legend-square"
                        style={{ background: chartColors[index % chartColors.length] }}
                      />
                      <span>{category}</span>
                      <strong>{Math.round((amount / totalSpent) * 100)}%</strong>
                    </div>
                  ))}
                </div>
              </>
            )}
          </article>
        </section>

        <section className="bottom-grid">
          <article className="panel insights-panel" id="insights">
            <div className="panel-heading">
              <div className="insights-title">
                <span className="sparkle">✳</span>
                <div>
                  <h3>Money insights</h3>
                  <p>Based on your recorded transactions</p>
                </div>
              </div>
              <span className="beta-tag">RULE-BASED</span>
            </div>

            <div className="insight-feature">
              <div className="insight-icon">↗</div>
              <div>
                <strong>
                  {topCategory
                    ? `${topCategory[0]} is your top category`
                    : "Start tracking your spending"}
                </strong>
                <p>
                  {topCategory
                    ? `You spent ${formatINR(topCategory[1])} on ${topCategory[0]} in ${monthLabel(selectedMonth)}. Review this category to spot possible savings.`
                    : "Add transactions for this month to get useful spending summaries."}
                </p>
              </div>
            </div>

            <div className="insight-feature">
              <div className="insight-icon green-insight">◎</div>
              <div>
                <strong>
                  {remaining >= 0 ? "Your budget status" : "Your budget needs attention"}
                </strong>
                <p>
                  {remaining >= 0
                    ? `You have ${formatINR(remaining)} left in your budget for ${monthLabel(selectedMonth)}.`
                    : `You are ${formatINR(Math.abs(remaining))} over your budget for ${monthLabel(selectedMonth)}.`}
                </p>
              </div>
            </div>

            <p className="insight-disclaimer">
              These are rule-based summaries of your data, not personalised AI-generated financial advice.
            </p>
          </article>

          <article className="panel transactions-panel" id="transactions">
            <div className="panel-heading">
              <div>
                <h3>Transactions</h3>
                <p>Search and manage your money moves</p>
              </div>
              <button className="subtle-button" onClick={() => setShowForm(true)}>
                ＋ Add new
              </button>
            </div>

            <div className="transaction-controls">
              <input
                aria-label="Search transactions"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search transactions..."
              />

              <select
                aria-label="Filter by category"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              >
                <option value="All">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>

              <select
                aria-label="Filter by type"
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
              >
                <option value="all">Income & expenses</option>
                <option value="income">Income only</option>
                <option value="expense">Expenses only</option>
              </select>
            </div>

            <div className="transaction-list">
              {filteredTransactions.length === 0 ? (
                <p className="empty-state">
                  No matching transactions. Try another filter or add a transaction.
                </p>
              ) : (
                filteredTransactions.slice(0, 8).map((transaction) => (
                  <div className="transaction-row" key={transaction.id}>
                    <div className="transaction-icon">
                      {transaction.type === "income" ? "💰" : "₹"}
                    </div>
                    <div className="transaction-copy">
                      <strong>{transaction.name}</strong>
                      <span>{transaction.category} · {transaction.date}</span>
                    </div>
                    <strong className={`transaction-amount ${transaction.type}`}>
                      {transaction.type === "income" ? "+" : "−"}
                      {formatINR(transaction.amount)}
                    </strong>
                    <button
                      className="delete-button"
                      aria-label={`Delete ${transaction.name}`}
                      title="Delete transaction"
                      onClick={() => deleteTransaction(transaction.id)}
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>

            <p className="insight-disclaimer">
              Showing up to 8 transactions. Monthly summaries above use the selected month.
            </p>
          </article>
        </section>

        <footer className="footer">
          <span>© 2026 SpendSense</span>
          <span>Spend mindfully. Live freely. <b>✳</b></span>
        </footer>
      </main>

      {/* CSV import modal */}
      {showImport && (
        <div
          className="modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeCSVImport();
          }}
        >
          <section
            className="transaction-modal csv-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="csv-import-title"
          >
            <div className="modal-heading">
              <div>
                <h2 id="csv-import-title">Import transactions</h2>
                <p>Preview your CSV before adding anything to SpendSense.</p>
              </div>
              <button
                className="modal-close"
                aria-label="Close CSV import"
                onClick={closeCSVImport}
              >
                ×
              </button>
            </div>

            <div className="csv-privacy-note">
              <strong>Private by design</strong>
              <span>Your file is processed in this browser and is not sent to a server.</span>
            </div>

            <label className="csv-upload-area">
              <span className="csv-upload-icon">↥</span>
              <strong>{csvFileName || "Choose a CSV file"}</strong>
              <span>CSV with Date, Description, Amount and Type columns</span>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleCSVFile}
              />
            </label>

            <div className="csv-format-help">
              <strong>Example format</strong>
              <code>Date,Description,Amount,Type</code>
              <code>2026-10-01,Salary,25000,Income</code>
              <code>2026-10-02,Grocery Store,1200,Expense</code>
              <p>
                Bank CSVs with Debit and Credit columns are also supported.
                Dates like DD/MM/YYYY are accepted.
              </p>
            </div>

            {csvError && (
              <p className="csv-error" role="alert">{csvError}</p>
            )}

            {csvPreview.length > 0 && (
              <div className="csv-preview-wrap">
                <div className="csv-preview-heading">
                  <strong>Preview ({csvPreview.length} rows)</strong>
                  <span>
                    {csvPreview.filter((item) => !item.error && !item.duplicate).length}
                    {" "}ready to import
                  </span>
                </div>

                <div className="csv-preview-table-wrap">
                  <table className="csv-preview-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Amount</th>
                        <th>Type</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvPreview.slice(0, 100).map((item) => (
                        <tr key={`${item.rowNumber}-${item.transaction.id}`}>
                          <td>{item.transaction.date || "—"}</td>
                          <td>{item.transaction.name || "—"}</td>
                          <td>
                            {Number.isFinite(item.transaction.amount) && item.transaction.amount > 0
                              ? formatINR(item.transaction.amount)
                              : "—"}
                          </td>
                          <td>{item.transaction.type}</td>
                          <td>
                            {item.error ? (
                              <span className="csv-status invalid" title={item.error}>
                                Invalid
                              </span>
                            ) : item.duplicate ? (
                              <span className="csv-status duplicate">Duplicate</span>
                            ) : (
                              <span className="csv-status valid">Ready</span>
                            )}

                            {item.error && (
                              <small className="csv-row-error">{item.error}</small>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {csvPreview.length > 100 && (
                  <p className="csv-row-limit">
                    Showing the first 100 rows. All valid rows will be considered for import.
                  </p>
                )}

                <p className="csv-auto-category">
                  Categories are suggested automatically from transaction descriptions.
                  Review them in the dashboard after import.
                </p>
              </div>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="cancel-button"
                onClick={closeCSVImport}
              >
                Cancel
              </button>

              <button
                type="button"
                className="primary-button"
                disabled={!csvPreview.some((item) => !item.error && !item.duplicate)}
                onClick={importCSVTransactions}
              >
                Import {csvPreview.filter((item) => !item.error && !item.duplicate).length}
                {" "}transactions
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Add transaction modal */}
      {showForm && (
        <div
          className="modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) setShowForm(false);
          }}
        >
          <section
            className="transaction-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="transaction-form-title"
          >
            <div className="modal-heading">
              <div>
                <h2 id="transaction-form-title">Add transaction</h2>
                <p>Record where your money goes.</p>
              </div>
              <button
                className="modal-close"
                aria-label="Close form"
                onClick={() => setShowForm(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={addTransaction} className="transaction-form">
              <label>
                Transaction type
                <div className="type-toggle">
                  <button
                    type="button"
                    className={form.type === "expense" ? "type-option selected" : "type-option"}
                    onClick={() =>
                      setForm({
                        ...form,
                        type: "expense",
                        category: "Food & Groceries",
                      })
                    }
                  >
                    − Expense
                  </button>

                  <button
                    type="button"
                    className={form.type === "income" ? "type-option selected" : "type-option"}
                    onClick={() =>
                      setForm({
                        ...form,
                        type: "income",
                        category: "Salary & Income",
                      })
                    }
                  >
                    ＋ Income
                  </button>
                </div>
              </label>

              <label>
                Description
                <input
                  required
                  maxLength={70}
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  placeholder="e.g. Lunch with friends"
                />
              </label>

              <label>
                Amount (₹)
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.amount}
                  onChange={(event) =>
                    setForm({ ...form, amount: event.target.value })
                  }
                  placeholder="e.g. 450"
                />
              </label>

              <label>
                Category
                <select
                  value={form.category}
                  onChange={(event) =>
                    setForm({ ...form, category: event.target.value })
                  }
                >
                  {categories
                    .filter((category) =>
                      form.type === "income"
                        ? category === "Salary & Income" || category === "Other"
                        : category !== "Salary & Income"
                    )
                    .map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                </select>
              </label>

              <label>
                Date
                <input
                  required
                  type="date"
                  value={form.date}
                  onChange={(event) =>
                    setForm({ ...form, date: event.target.value })
                  }
                />
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  Save transaction
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
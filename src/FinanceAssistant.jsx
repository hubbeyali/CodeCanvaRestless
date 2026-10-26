
import { useMemo, useState } from "react";

const formatINR = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);

function FinanceAssistant({
  transactions = [],
  monthlyTransactions = [],
  totalSpent = 0,
  budget = 0,
  selectedMonth = "",
  categoryTotals = [],
  totalIncome = 0,
}) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi! I'm your SpendSense AI. I can analyse your spending, explain your budget, and suggest practical ways to save. What would you like to know?",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const financialContext = useMemo(() => {
    const expenses = monthlyTransactions.filter(
      (item) => item.type === "expense"
    );
    const incomeTransactions = monthlyTransactions.filter(
      (item) => item.type === "income"
    );

    const monthExpenses = expenses.map((item) => ({
      date: item.date,
      description: item.name,
      category: item.category || "Other",
      amount: Number(item.amount) || 0,
    }));

    const monthIncome = incomeTransactions.map((item) => ({
      date: item.date,
      description: item.name,
      category: item.category || "Other",
      amount: Number(item.amount) || 0,
    }));

    const allTimeTotals = {};
    transactions.forEach((item) => {
      if (item.type !== "expense") return;
      const category = item.category || "Other";
      allTimeTotals[category] =
        (allTimeTotals[category] || 0) + (Number(item.amount) || 0);
    });

    return JSON.stringify({
      currency: "INR",
      selectedMonth,
      monthlySummary: {
        totalExpenses: totalSpent,
        totalIncome,
        netBalance: totalIncome - totalSpent,
        monthlyBudget: budget,
        budgetRemaining: budget - totalSpent,
        budgetUsedPercent:
          budget > 0 ? Number(((totalSpent / budget) * 100).toFixed(1)) : null,
      },
      selectedMonthSpendingByCategory: categoryTotals.map(
        ([category, amount]) => ({
          category,
          amount,
          percentage:
            totalSpent > 0
              ? Number(((amount / totalSpent) * 100).toFixed(1))
              : 0,
        })
      ),
      allTimeSpendingByCategory: Object.entries(allTimeTotals)
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount),
      selectedMonthTransactions: monthExpenses,
      selectedMonthIncomeTransactions: monthIncome,
      recentTransactions: transactions.slice(-60).map((item) => ({
        date: item.date,
        description: item.name,
        category: item.category || "Other",
        amount: Number(item.amount) || 0,
        type: item.type,
      })),
      totalTransactionsAvailable: transactions.length,
      instructions:
        "Use these actual figures to answer the user's question. Amounts are in INR. The selected-month figures apply only to selectedMonth. Do not invent transactions or financial facts. If the data is insufficient, explain what is missing. Give practical, specific suggestions based on the provided figures.",
    });
  }, [
    transactions,
    monthlyTransactions,
    totalSpent,
    budget,
    selectedMonth,
    categoryTotals,
    totalIncome,
  ]);

  async function sendQuestion(text = question) {
    const cleanQuestion = text.trim();
    if (!cleanQuestion || loading) return;

    setQuestion("");
    setError("");
    setMessages((current) => [
      ...current,
      { role: "user", content: cleanQuestion },
    ]);
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: cleanQuestion,
          financialContext,
        }),
      });

      const rawResponse = await response.text();
      let data;

      try {
        data = JSON.parse(rawResponse);
      } catch {
        throw new Error(
          "The server returned an unreadable response. Check that the backend is running."
        );
      }

      if (!response.ok) {
        throw new Error(
          data.error || `The AI request failed (${response.status}).`
        );
      }

      if (!data.answer) {
        throw new Error("The AI returned an empty answer. Please try again.");
      }

      setMessages((current) => [
        ...current,
        { role: "assistant", content: data.answer },
      ]);
    } catch (err) {
      setError(
        err.message ||
          "Couldn't reach SpendSense AI. Check that the backend is running."
      );
    } finally {
      setLoading(false);
    }
  }

  const suggestions = [
    "Where am I spending the most?",
    "How much of my budget have I used?",
    "How can I save more next month?",
    "Analyse my spending this month.",
  ];

  return (
    <section className="finance-ai" id="ai-assistant">
      <div className="finance-ai-header">
        <div className="finance-ai-title">
          <div className="finance-ai-icon">✳</div>
          <div>
            <p className="finance-ai-eyebrow">YOUR PERSONAL MONEY COPILOT</p>
            <h2>Ask SpendSense AI</h2>
            <p>
              Real answers based on your transactions and budget.
            </p>
          </div>
        </div>
        <span className="finance-ai-status">
          <span /> AI ASSISTANT
        </span>
      </div>

      <div className="finance-ai-summary">
        <div>
          <span>Spent this month</span>
          <strong>{formatINR(totalSpent)}</strong>
        </div>
        <div>
          <span>Monthly budget</span>
          <strong>{formatINR(budget)}</strong>
        </div>
        <div>
          <span>Transactions</span>
          <strong>{monthlyTransactions.length}</strong>
        </div>
      </div>

      <div className="finance-ai-messages" aria-live="polite">
        {messages.map((message, index) => (
          <div
            className={`finance-ai-message ${
              message.role === "user" ? "user-message" : "assistant-message"
            }`}
            key={`${message.role}-${index}`}
          >
            {message.role === "assistant" && (
              <span className="finance-ai-message-icon">✳</span>
            )}
            <div className="finance-ai-bubble">{message.content}</div>
          </div>
        ))}

        {loading && (
          <div className="finance-ai-message assistant-message">
            <span className="finance-ai-message-icon">✳</span>
            <div className="finance-ai-bubble finance-ai-thinking">
              Analysing your finances
              <span className="thinking-dots">...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="finance-ai-error" role="alert">
            <strong>Couldn't get an AI response.</strong>
            <p>{error}</p>
            <button
              type="button"
              onClick={() => {
                const lastQuestion = [...messages]
                  .reverse()
                  .find((message) => message.role === "user");
                if (lastQuestion) sendQuestion(lastQuestion.content);
              }}
              disabled={loading}
            >
              Try again
            </button>
          </div>
        )}
      </div>

      <div className="finance-ai-suggestions">
        <p>Try asking</p>
        <div className="finance-ai-suggestion-list">
          {suggestions.map((suggestion) => (
            <button
              type="button"
              key={suggestion}
              onClick={() => sendQuestion(suggestion)}
              disabled={loading}
            >
              {suggestion} <span>↗</span>
            </button>
          ))}
        </div>
      </div>

      <form
        className="finance-ai-form"
        onSubmit={(event) => {
          event.preventDefault();
          sendQuestion();
        }}
      >
        <input
          aria-label="Ask SpendSense AI a question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask about your spending, budget or savings..."
          disabled={loading}
          maxLength={1000}
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          aria-label="Send question"
        >
          {loading ? "..." : "↑"}
        </button>
      </form>

      <p className="finance-ai-privacy">
        Your selected-month summary and transaction details are sent to the AI
        service to generate answers. Avoid including passwords or account
        numbers. AI answers can make mistakes; verify important financial
        decisions.
      </p>
    </section>
  );
}

export default FinanceAssistant;

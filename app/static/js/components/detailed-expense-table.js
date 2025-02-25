// app/static/js/components/detailed-expense-table.js
const DetailedExpenseTable = (props) => {
  const [sortedExpenses, setSortedExpenses] = React.useState([]);
  const [isLoaded, setIsLoaded] = React.useState(false);

  // Format currency helper
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  // Format date helper
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Process expenses on load
  React.useEffect(() => {
    console.log("Component mounted with data:", {
      periods: props.periods?.length || 0,
      expenses: props.expenses?.length || 0,
    });

    if (!props.periods || !props.expenses || props.periods.length === 0) {
      setIsLoaded(true);
      return;
    }

    try {
      // Make a copy and sort by date
      const processedExpenses = [...props.expenses].sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      );

      setSortedExpenses(processedExpenses);
      setIsLoaded(true);
    } catch (error) {
      console.error("Error processing expenses:", error);
      setIsLoaded(true);
    }
  }, [props.periods, props.expenses]);

  // Determine which period an expense belongs to
  const getExpensePeriod = (expense) => {
    if (!props.periods || props.periods.length === 0) return null;

    const expenseDate = new Date(expense.date);

    for (const period of props.periods) {
      const startDate = new Date(period.start_date);
      const endDate = new Date(period.end_date);

      if (expenseDate >= startDate && expenseDate <= endDate) {
        return period.id;
      }
    }

    return null;
  };

  // Loading state
  if (!isLoaded) {
    return React.createElement(
      "div",
      { className: "p-4 text-center" },
      React.createElement("p", {}, "Loading expense data...")
    );
  }

  // No data state
  if (!props.expenses || props.expenses.length === 0) {
    return React.createElement(
      "div",
      { className: "p-4 text-center bg-white rounded-lg shadow" },
      React.createElement(
        "p",
        { className: "text-gray-500" },
        "No expenses found for this period."
      ),
      React.createElement(
        "a",
        {
          href: "/expense/add",
          className:
            "inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700",
        },
        "Add an Expense"
      )
    );
  }

  // Create a table to display expenses
  return React.createElement(
    "div",
    { className: "bg-white rounded-lg shadow overflow-hidden" },
    // Header
    React.createElement(
      "div",
      { className: "px-4 py-5 sm:px-6 border-b border-gray-200" },
      React.createElement(
        "h2",
        { className: "text-lg font-medium text-gray-900" },
        "Detailed Expenses"
      ),
      React.createElement(
        "p",
        { className: "mt-1 text-sm text-gray-500" },
        `Showing ${sortedExpenses.length} expenses across ${props.periods.length} pay periods`
      )
    ),

    // Table container
    React.createElement(
      "div",
      { className: "overflow-x-auto" },
      React.createElement(
        "table",
        { className: "min-w-full divide-y divide-gray-200" },
        // Table header
        React.createElement(
          "thead",
          { className: "bg-gray-50" },
          React.createElement(
            "tr",
            {},
            React.createElement(
              "th",
              {
                className:
                  "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
              },
              "Date"
            ),
            React.createElement(
              "th",
              {
                className:
                  "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
              },
              "Category"
            ),
            React.createElement(
              "th",
              {
                className:
                  "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
              },
              "Description"
            ),
            React.createElement(
              "th",
              {
                className:
                  "px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider",
              },
              "Amount"
            ),
            React.createElement(
              "th",
              {
                className:
                  "px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider",
              },
              "Pay Period"
            )
          )
        ),

        // Table body with expenses
        React.createElement(
          "tbody",
          { className: "bg-white divide-y divide-gray-200" },
          sortedExpenses.map((expense, index) => {
            const periodId = getExpensePeriod(expense);
            const periodDate =
              props.periods.find((p) => p.id === periodId)?.date || "N/A";

            return React.createElement(
              "tr",
              { key: expense.id || index, className: "hover:bg-gray-50" },
              // Date column
              React.createElement(
                "td",
                {
                  className:
                    "px-6 py-4 whitespace-nowrap text-sm text-gray-900",
                },
                formatDate(expense.date)
              ),

              // Category column
              React.createElement(
                "td",
                {
                  className:
                    "px-6 py-4 whitespace-nowrap text-sm text-gray-900",
                },
                expense.category
              ),

              // Description column
              React.createElement(
                "td",
                {
                  className:
                    "px-6 py-4 whitespace-nowrap text-sm text-gray-500",
                },
                expense.description || "-"
              ),

              // Amount column
              React.createElement(
                "td",
                {
                  className:
                    "px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-red-600",
                },
                formatCurrency(expense.amount)
              ),

              // Period column
              React.createElement(
                "td",
                {
                  className: "px-6 py-4 whitespace-nowrap text-sm text-center",
                },
                periodDate
              )
            );
          })
        )
      )
    )
  );
};

// Export for both module systems
if (typeof module !== "undefined" && module.exports) {
  module.exports = { default: DetailedExpenseTable };
} else {
  // For direct script tag inclusion
  window.DetailedExpenseTable = DetailedExpenseTable;
}

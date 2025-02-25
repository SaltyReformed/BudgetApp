// app/static/js/components/detailed-expense-table.js
const DetailedExpenseTable = (props) => {
  const [expensesByCategory, setExpensesByCategory] = React.useState({});
  const [categoryTotals, setCategoryTotals] = React.useState({});
  const [periodTotals, setPeriodTotals] = React.useState({});
  const [totalAmount, setTotalAmount] = React.useState(0);
  const [isLoaded, setIsLoaded] = React.useState(false);

  // Format currency helper
  const formatCurrency = (amount) => {
    if (!amount || amount === 0) return "$0.00";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  // Process expenses on load
  React.useEffect(() => {
    if (!props.periods || !props.expenses || props.periods.length === 0) {
      setIsLoaded(true);
      return;
    }

    try {
      // Group expenses by category and description
      const byCategory = {};
      const catTotals = {};
      const perTotals = {};
      let grandTotal = 0;

      // Initialize period totals
      props.periods.forEach((period) => {
        perTotals[period.id] = 0;
      });

      // Process each expense
      props.expenses.forEach((expense) => {
        const category = expense.category.toLowerCase();
        const description = expense.description || "-";
        const key = `${category}|${description}`;
        const amount = parseFloat(expense.amount);
        grandTotal += amount;

        // Find which period this expense belongs to
        const periodId = getExpensePeriod(expense);
        if (periodId && perTotals[periodId] !== undefined) {
          perTotals[periodId] += amount;
        }

        // Add to category totals
        if (!catTotals[category]) {
          catTotals[category] = 0;
        }
        catTotals[category] += amount;

        // Group by category and description
        if (!byCategory[key]) {
          byCategory[key] = {
            category,
            description,
            periods: {},
            total: 0,
          };
        }

        if (periodId) {
          if (!byCategory[key].periods[periodId]) {
            byCategory[key].periods[periodId] = 0;
          }
          byCategory[key].periods[periodId] += amount;
        }

        byCategory[key].total += amount;
      });

      setExpensesByCategory(byCategory);
      setCategoryTotals(catTotals);
      setPeriodTotals(perTotals);
      setTotalAmount(grandTotal);
      setIsLoaded(true);

      // Update the Budget Summary table with our calculated totals
      // Use setTimeout to ensure this runs after the component is mounted
      setTimeout(() => {
        if (window.updateBudgetSummary) {
          window.updateBudgetSummary(grandTotal, perTotals);
        }
      }, 500);
    } catch (error) {
      console.error("Error processing expenses:", error);
      setIsLoaded(true);
    }
  }, [props.periods, props.expenses]);

  // Determine which period an expense belongs to
  function getExpensePeriod(expense) {
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
  }

  // Loading state
  if (!isLoaded) {
    return React.createElement(
      "div",
      { className: "p-4 text-center" },
      React.createElement("div", {
        className:
          "animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto",
      }),
      React.createElement(
        "p",
        { className: "mt-2 text-gray-500" },
        "Loading expenses..."
      )
    );
  }

  // No data state
  if (!props.expenses || props.expenses.length === 0) {
    return React.createElement(
      "div",
      { className: "text-center py-4" },
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
            "inline-block mt-4 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm",
        },
        "Add Expense"
      )
    );
  }

  // Get all unique categories (for category grouping and subtotals)
  const categories = [
    ...new Set(Object.values(expensesByCategory).map((item) => item.category)),
  ];

  // Create a table matching the column-based Expense table with description column
  return React.createElement(
    "div",
    { className: "overflow-x-auto" },
    React.createElement(
      "table",
      { className: "min-w-full table-fixed" },
      // Table header
      React.createElement(
        "thead",
        null,
        React.createElement(
          "tr",
          { className: "bg-gray-50 border-b" },
          React.createElement(
            "th",
            { className: "text-left py-2 px-4 w-1/6" },
            "Category"
          ),
          React.createElement(
            "th",
            { className: "text-left py-2 px-4 w-2/5" },
            "Description"
          ),
          // Create a column for each period
          props.periods.map((period) =>
            React.createElement(
              "th",
              {
                key: `period-${period.id}`,
                className: "text-right py-2 px-4",
              },
              period.date
            )
          ),
          // Total column
          React.createElement(
            "th",
            { className: "text-right py-2 px-4 bg-gray-100" },
            "Total"
          )
        )
      ),
      // Table body with categories and expenses
      React.createElement(
        "tbody",
        null,
        // Group by categories first
        categories.map((category) => {
          // Get all rows for this category
          const categoryItems = Object.values(expensesByCategory).filter(
            (item) => item.category === category
          );
          const rows = [];

          // Add category header row
          rows.push(
            React.createElement(
              "tr",
              {
                key: `category-${category}`,
                className: "bg-gray-100 font-medium",
              },
              // Category name
              React.createElement(
                "td",
                { className: "py-2 px-4 capitalize" },
                category
              ),
              // Empty description cell
              React.createElement("td", { className: "py-2 px-4" }, ""),
              // Empty cells for each period
              props.periods.map((period) =>
                React.createElement(
                  "td",
                  {
                    key: `cat-header-${category}-${period.id}`,
                    className: "py-2 px-4",
                  },
                  ""
                )
              ),
              // Category total
              React.createElement(
                "td",
                { className: "text-right py-2 px-4 bg-gray-100" },
                formatCurrency(categoryTotals[category] || 0)
              )
            )
          );

          // Add rows for each unique description in this category
          categoryItems.forEach((item, index) => {
            rows.push(
              React.createElement(
                "tr",
                {
                  key: `expense-${category}-${item.description}`,
                  className: `border-t hover:bg-gray-50 ${
                    index % 2 === 0 ? "bg-white" : "bg-gray-50"
                  }`,
                },
                // Empty category cell (indented)
                React.createElement("td", { className: "py-2 px-4" }, ""),
                // Description
                React.createElement(
                  "td",
                  { className: "py-2 px-4" },
                  item.description
                ),
                // Amount for each period
                props.periods.map((period) => {
                  const amount = item.periods[period.id] || 0;

                  return React.createElement(
                    "td",
                    {
                      key: `amount-${category}-${item.description}-${period.id}`,
                      className: "text-right py-2 px-4",
                    },
                    amount > 0 ? formatCurrency(amount) : ""
                  );
                }),
                // Row total
                React.createElement(
                  "td",
                  { className: "text-right py-2 px-4" },
                  formatCurrency(item.total)
                )
              )
            );
          });

          return rows;
        }),
        // Total Row
        React.createElement(
          "tr",
          { className: "bg-gray-50 font-bold" },
          React.createElement(
            "td",
            { className: "py-2 px-4" },
            "Total Expenses"
          ),
          // Empty description cell
          React.createElement("td", { className: "py-2 px-4" }, ""),
          // Period totals
          props.periods.map((period) =>
            React.createElement(
              "td",
              {
                key: `total-period-${period.id}`,
                className: "text-right py-2 px-4 text-red-600",
              },
              formatCurrency(periodTotals[period.id] || 0)
            )
          ),
          // Grand total
          React.createElement(
            "td",
            { className: "text-right py-2 px-4 text-red-600 bg-gray-100" },
            formatCurrency(totalAmount)
          )
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

// app/static/js/components/enhanced-expense-table.js
const EnhancedExpenseTable = (props) => {
  // State management for data
  const [expensesByCategory, setExpensesByCategory] = React.useState({});
  const [categoryTotals, setCategoryTotals] = React.useState({});
  const [periodTotals, setPeriodTotals] = React.useState({});
  const [totalAmount, setTotalAmount] = React.useState(0);
  const [isLoaded, setIsLoaded] = React.useState(false);
  
  // State for interactive features
  const [sortField, setSortField] = React.useState('category');
  const [sortDirection, setSortDirection] = React.useState('asc');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterCategory, setFilterCategory] = React.useState('all');
  const [editingExpense, setEditingExpense] = React.useState(null);
  const [categories, setCategories] = React.useState([]);
  
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
      const uniqueCategories = new Set();

      // Initialize period totals
      props.periods.forEach((period) => {
        perTotals[period.id] = 0;
      });

      // Process each expense
      props.expenses.forEach((expense) => {
        const category = expense.category.toLowerCase();
        uniqueCategories.add(category);
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
            id: expense.id, // Store ID for edit functionality
            paid: expense.paid,
            date: expense.date,
            allExpenses: [] // To store all expense IDs for this category/description
          };
        }

        byCategory[key].allExpenses.push(expense);

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
      setCategories(Array.from(uniqueCategories).sort());
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

  // Handle sort change
  const handleSortChange = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value.toLowerCase());
  };

  // Handle category filter change
  const handleCategoryFilterChange = (e) => {
    setFilterCategory(e.target.value);
  };

  // Handle row edit button click
  const handleEditClick = (itemKey) => {
    setEditingExpense(itemKey);
  };

  // Handle save edit
  const handleSaveEdit = (itemKey, newDescription, newAmount) => {
    // Real implementation would send API request to update the expense
    // For now, just update the local state
    alert(`Would save: Description: ${newDescription}, Amount: ${newAmount} for expense key: ${itemKey}`);
    setEditingExpense(null);
  };

  // Handle quick pay toggle
  const handleTogglePaid = async (expenseId) => {
    try {
      // Send request to toggle paid status
      const response = await fetch(`/expenses/toggle-paid/${expenseId}`, {
        method: 'POST',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to toggle expense status');
      }
      
      const result = await response.json();
      
      if (result.success) {
        // Success! Update UI or reload data
        // For simplicity, we'll just reload the page
        window.location.reload();
      } else {
        throw new Error(result.message || 'Unknown error');
      }
    } catch (error) {
      console.error('Error toggling expense:', error);
      alert('Error toggling expense status. Please try again.');
    }
  };

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

  // Filter and sort the expense items
  const filteredAndSortedItems = Object.entries(expensesByCategory)
    .filter(([key, item]) => {
      const matchesSearch = 
        item.category.includes(searchTerm) || 
        item.description.toLowerCase().includes(searchTerm);
      
      const matchesCategory = 
        filterCategory === 'all' || 
        item.category === filterCategory;
      
      return matchesSearch && matchesCategory;
    })
    .sort(([keyA, itemA], [keyB, itemB]) => {
      let comparison = 0;
      
      if (sortField === 'category') {
        comparison = itemA.category.localeCompare(itemB.category);
      } else if (sortField === 'description') {
        comparison = itemA.description.localeCompare(itemB.description);
      } else if (sortField === 'total') {
        comparison = itemA.total - itemB.total;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  // Create controls for filtering, sorting, and searching
  const tableControls = React.createElement(
    "div",
    { className: "flex flex-wrap items-center justify-between mb-4 gap-2" },
    // Search input
    React.createElement(
      "div",
      { className: "flex items-center" },
      React.createElement(
        "label",
        { htmlFor: "search", className: "mr-2 text-sm font-medium text-gray-700" },
        "Search:"
      ),
      React.createElement("input", {
        type: "text",
        id: "search",
        placeholder: "Search expenses...",
        className: "shadow-sm focus:ring-blue-500 focus:border-blue-500 block sm:text-sm border-gray-300 rounded-md",
        value: searchTerm,
        onChange: handleSearchChange
      })
    ),
    // Category filter
    React.createElement(
      "div",
      { className: "flex items-center" },
      React.createElement(
        "label",
        { htmlFor: "category-filter", className: "mr-2 text-sm font-medium text-gray-700" },
        "Category:"
      ),
      React.createElement(
        "select",
        {
          id: "category-filter",
          className: "shadow-sm focus:ring-blue-500 focus:border-blue-500 block sm:text-sm border-gray-300 rounded-md",
          value: filterCategory,
          onChange: handleCategoryFilterChange
        },
        React.createElement("option", { value: "all" }, "All Categories"),
        categories.map(category => 
          React.createElement("option", { key: category, value: category }, 
            category.charAt(0).toUpperCase() + category.slice(1)
          )
        )
      )
    ),
    // Sort controls
    React.createElement(
      "div",
      { className: "flex items-center" },
      React.createElement(
        "label",
        { htmlFor: "sort-by", className: "mr-2 text-sm font-medium text-gray-700" },
        "Sort by:"
      ),
      React.createElement(
        "select",
        {
          id: "sort-by",
          className: "shadow-sm focus:ring-blue-500 focus:border-blue-500 block sm:text-sm border-gray-300 rounded-md mr-2",
          value: sortField,
          onChange: e => setSortField(e.target.value)
        },
        React.createElement("option", { value: "category" }, "Category"),
        React.createElement("option", { value: "description" }, "Description"),
        React.createElement("option", { value: "total" }, "Amount")
      ),
      React.createElement(
        "button",
        {
          className: "inline-flex items-center px-2 py-1 border border-gray-300 text-sm leading-4 font-medium rounded text-gray-700 bg-white hover:bg-gray-50",
          onClick: () => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
        },
        sortDirection === 'asc' ? '↑ Asc' : '↓ Desc'
      )
    )
  );

  // Create a table matching the column-based Expense table with description column
  return React.createElement(
    "div",
    { className: "space-y-4" },
    tableControls,
    React.createElement(
      "div",
      { className: "overflow-x-auto bg-white rounded-lg shadow" },
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
              { 
                className: "text-left py-3 px-4 cursor-pointer hover:bg-gray-100",
                onClick: () => handleSortChange('category')
              },
              "Category ",
              sortField === 'category' && (sortDirection === 'asc' ? '↑' : '↓')
            ),
            React.createElement(
              "th",
              { 
                className: "text-left py-3 px-4 cursor-pointer hover:bg-gray-100",
                onClick: () => handleSortChange('description')
              },
              "Description ",
              sortField === 'description' && (sortDirection === 'asc' ? '↑' : '↓')
            ),
            // Create a column for each period
            props.periods.map((period) =>
              React.createElement(
                "th",
                {
                  key: `period-${period.id}`,
                  className: "text-right py-3 px-4",
                },
                period.date
              )
            ),
            // Total column
            React.createElement(
              "th",
              { 
                className: "text-right py-3 px-4 bg-gray-100 cursor-pointer hover:bg-gray-200",
                onClick: () => handleSortChange('total')
              },
              "Total ",
              sortField === 'total' && (sortDirection === 'asc' ? '↑' : '↓')
            ),
            // Actions column
            React.createElement(
              "th",
              { className: "text-right py-3 px-4 w-24" },
              "Actions"
            )
          )
        ),
        // Table body
        React.createElement(
          "tbody",
          null,
          filteredAndSortedItems.length === 0 ? (
            // No results row
            React.createElement(
              "tr",
              null,
              React.createElement(
                "td",
                { 
                  colSpan: props.periods.length + 4,
                  className: "py-4 px-4 text-center text-gray-500"
                },
                "No expenses match your search criteria."
              )
            )
          ) : (
            // Map filtered and sorted items
            filteredAndSortedItems.map(([key, item], index) => {
              const isEditing = editingExpense === key;
              
              return React.createElement(
                "tr",
                {
                  key: `expense-${key}`,
                  className: `border-t hover:bg-gray-50 ${
                    index % 2 === 0 ? "bg-white" : "bg-gray-50"
                  }`,
                },
                // Category cell
                React.createElement(
                  "td",
                  { className: "py-3 px-4 capitalize" },
                  item.category
                ),
                // Description cell (editable)
                React.createElement(
                  "td",
                  { className: "py-3 px-4" },
                  isEditing ? (
                    React.createElement("input", {
                      type: "text",
                      defaultValue: item.description,
                      className: "w-full p-1 border rounded",
                      id: `edit-description-${key}`
                    })
                  ) : (
                    item.description
                  )
                ),
                // Amount for each period
                props.periods.map((period) => {
                  const amount = item.periods[period.id] || 0;

                  return React.createElement(
                    "td",
                    {
                      key: `amount-${key}-${period.id}`,
                      className: "text-right py-3 px-4",
                    },
                    isEditing && amount > 0 ? (
                      React.createElement("input", {
                        type: "number",
                        defaultValue: amount,
                        className: "w-full p-1 border rounded text-right",
                        id: `edit-amount-${key}-${period.id}`,
                        step: "0.01",
                        min: "0"
                      })
                    ) : (
                      amount > 0 ? formatCurrency(amount) : ""
                    )
                  );
                }),
                // Row total
                React.createElement(
                  "td",
                  { className: "text-right py-3 px-4 font-medium" },
                  formatCurrency(item.total)
                ),
                // Actions
                React.createElement(
                  "td",
                  { className: "text-right py-3 px-4" },
                  React.createElement(
                    "div",
                    { className: "flex justify-end space-x-2" },
                    isEditing ? (
                      // Save button
                      React.createElement(
                        "button",
                        {
                          className: "text-green-600 hover:text-green-900",
                          title: "Save changes",
                          onClick: () => {
                            const newDescription = document.getElementById(`edit-description-${key}`).value;
                            const newAmount = document.getElementById(`edit-amount-${key}-${period.id}`).value;
                            handleSaveEdit(key, newDescription, newAmount);
                          }
                        },
                        React.createElement(
                          "svg",
                          {
                            className: "h-5 w-5",
                            xmlns: "http://www.w3.org/2000/svg",
                            fill: "none",
                            viewBox: "0 0 24 24",
                            stroke: "currentColor"
                          },
                          React.createElement("path", {
                            strokeLinecap: "round",
                            strokeLinejoin: "round",
                            strokeWidth: "2",
                            d: "M5 13l4 4L19 7"
                          })
                        )
                      )
                    ) : (
                      // Edit button
                      React.createElement(
                        "a",
                        {
                          href: `/expenses/edit/${item.id}`,
                          className: "text-blue-600 hover:text-blue-900",
                          title: "Edit"
                        },
                        React.createElement(
                          "svg",
                          {
                            className: "h-5 w-5",
                            xmlns: "http://www.w3.org/2000/svg",
                            fill: "none",
                            viewBox: "0 0 24 24",
                            stroke: "currentColor"
                          },
                          React.createElement("path", {
                            strokeLinecap: "round",
                            strokeLinejoin: "round",
                            strokeWidth: "2",
                            d: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          })
                        )
                      )
                    ),
                    // Toggle paid button for each expense in the group
                    item.allExpenses && item.allExpenses.length > 0 && (
                      React.createElement(
                        "button",
                        {
                          className: `text-${item.allExpenses[0].paid ? 'gray' : 'green'}-600 hover:text-${item.allExpenses[0].paid ? 'gray' : 'green'}-900`,
                          title: item.allExpenses[0].paid ? "Mark as unpaid" : "Mark as paid",
                          onClick: () => handleTogglePaid(item.allExpenses[0].id)
                        },
                        React.createElement(
                          "svg",
                          {
                            className: "h-5 w-5",
                            xmlns: "http://www.w3.org/2000/svg",
                            fill: "none",
                            viewBox: "0 0 24 24",
                            stroke: "currentColor"
                          },
                          React.createElement("path", {
                            strokeLinecap: "round",
                            strokeLinejoin: "round",
                            strokeWidth: "2",
                            d: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          })
                        )
                      )
                    )
                  )
                )
              );
            })
          )
        ),
        // Footer row with totals
        React.createElement(
          "tfoot",
          null,
          React.createElement(
            "tr",
            { className: "bg-gray-100 font-bold" },
            React.createElement(
              "td",
              { className: "py-3 px-4", colSpan: 2 },
              "Total Expenses"
            ),
            // Period totals
            props.periods.map((period) =>
              React.createElement(
                "td",
                {
                  key: `total-period-${period.id}`,
                  className: "text-right py-3 px-4 text-red-600",
                },
                formatCurrency(periodTotals[period.id] || 0)
              )
            ),
            // Grand total
            React.createElement(
              "td",
              { className: "text-right py-3 px-4 text-red-600" },
              formatCurrency(totalAmount)
            ),
            // Empty cell for actions column
            React.createElement("td", { className: "py-3 px-4" })
          )
        )
      )
    )
  );
};

// Export for both module systems
if (typeof module !== "undefined" && module.exports) {
  module.exports = { default: EnhancedExpenseTable };
} else {
  // For direct script tag inclusion
  window.EnhancedExpenseTable = EnhancedExpenseTable;
}
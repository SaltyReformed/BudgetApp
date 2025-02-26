// app/static/js/consolidated-expense-table.js

// Immediately-invoked function expression (IIFE) to avoid variable name conflicts
(function () {
  // Wait for DOM to be fully loaded
  document.addEventListener("DOMContentLoaded", function () {
    // Find the mount point for the expense table
    const mountPoint = document.getElementById("detailed-expense-table");

    if (!mountPoint) {
      console.warn("Mount point #detailed-expense-table not found");
      return;
    }

    // Check if we have the necessary data
    if (!window.periodsData || !window.expensesData) {
      console.error(
        "Required data is missing. Make sure periodsData and expensesData are defined."
      );
      mountPoint.innerHTML = `
        <div class="p-4 bg-red-100 border-l-4 border-red-500 text-red-700">
          <p>Required data is missing. Please refresh the page or contact support.</p>
        </div>
      `;
      return;
    }

    // Define the ResizableTable component
    const ResizableTable = (props) => {
      // State management for data
      const [expensesByCategory, setExpensesByCategory] = React.useState({});
      const [categoryTotals, setCategoryTotals] = React.useState({});
      const [periodTotals, setPeriodTotals] = React.useState({});
      const [totalAmount, setTotalAmount] = React.useState(0);
      const [isLoaded, setIsLoaded] = React.useState(false);

      // State for interactive features
      const [sortField, setSortField] = React.useState("category");
      const [sortDirection, setSortDirection] = React.useState("asc");
      const [searchTerm, setSearchTerm] = React.useState("");
      const [filterCategory, setFilterCategory] = React.useState("all");
      const [categories, setCategories] = React.useState([]);

      // State for column widths
      const [columnWidths, setColumnWidths] = React.useState({
        category: 150,
        description: 300,
      });
      const [resizingColumn, setResizingColumn] = React.useState(null);
      const [resizeStartX, setResizeStartX] = React.useState(0);
      const [initialWidth, setInitialWidth] = React.useState(0);

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
            const expenseDate = new Date(expense.date);
            let periodId = null;
                    
            for (const period of props.periods) {
              const startDate = new Date(period.start_date);
              const endDate = new Date(period.end_date);
            
              // Match expense to period based on date range
              if (expenseDate >= startDate && expenseDate <= endDate) {
                periodId = period.id;
                break;
              }
            }
          
            // Add to period totals if we found a matching period
            if (periodId !== null && perTotals[periodId] !== undefined) {
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
                paid_total: 0,
                unpaid_total: 0,
                id: expense.id,
                paid: expense.paid,
                date: expense.date,
                allExpenses: [],
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
            
            // Track paid vs unpaid totals
            if (expense.paid) {
              byCategory[key].paid_total += amount;
            } else {
              byCategory[key].unpaid_total += amount;
            }
          });
          
          // After the forEach loop, update the state
          setExpensesByCategory(byCategory);
          setCategoryTotals(catTotals);
          setPeriodTotals(perTotals);
          setTotalAmount(grandTotal);
          setCategories(Array.from(uniqueCategories).sort());
          setIsLoaded(true);

          // IMPORTANT: We no longer update the Budget Summary table from JavaScript
          // This has been removed to use server-side calculations only
        } catch (error) {
          console.error("Error processing expenses:", error);
          setIsLoaded(true);
        }
      }, [props.periods, props.expenses]);

      // Handle sort change
      const handleSortChange = (field) => {
        if (sortField === field) {
          setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
          setSortField(field);
          setSortDirection("asc");
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

      // Handle toggle paid
      const handleTogglePaid = async (expenseId) => {
        try {
          const response = await fetch(`/expenses/toggle-paid/${expenseId}`, {
            method: "POST",
            headers: {
              "X-Requested-With": "XMLHttpRequest",
              "Content-Type": "application/json",
            },
          });

          if (!response.ok) {
            throw new Error("Failed to toggle expense status");
          }

          const result = await response.json();

          if (result.success) {
            window.location.reload();
          } else {
            throw new Error(result.message || "Unknown error");
          }
        } catch (error) {
          console.error("Error toggling expense:", error);
          alert("Error toggling expense status. Please try again.");
        }
      };

      // New handlers for column resizing
      const handleResizeStart = (e, column) => {
        setResizingColumn(column);
        setResizeStartX(e.clientX);
        setInitialWidth(columnWidths[column] || 150);
        document.addEventListener("mousemove", handleResizeMove);
        document.addEventListener("mouseup", handleResizeEnd);
        document.body.classList.add("column-resizing");
        e.preventDefault();
      };

      const handleResizeMove = (e) => {
        if (!resizingColumn) return;

        const width = initialWidth + (e.clientX - resizeStartX);
        // Ensure minimum width
        const newWidth = Math.max(50, width);

        setColumnWidths((prev) => ({
          ...prev,
          [resizingColumn]: newWidth,
        }));
      };

      const handleResizeEnd = () => {
        setResizingColumn(null);
        document.removeEventListener("mousemove", handleResizeMove);
        document.removeEventListener("mouseup", handleResizeEnd);
        document.body.classList.remove("column-resizing");

        // Save column widths to localStorage for persistence
        localStorage.setItem(
          "expenseTableColumnWidths",
          JSON.stringify(columnWidths)
        );
      };

      // Load saved column widths on initial render
      React.useEffect(() => {
        try {
          const savedWidths = localStorage.getItem("expenseTableColumnWidths");
          if (savedWidths) {
            setColumnWidths(JSON.parse(savedWidths));
          }
        } catch (err) {
          console.error("Error loading saved column widths:", err);
        }
      }, []);

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
            filterCategory === "all" || item.category === filterCategory;

          return matchesSearch && matchesCategory;
        })
        .sort(([keyA, itemA], [keyB, itemB]) => {
          let comparison = 0;

          if (sortField === "category") {
            comparison = itemA.category.localeCompare(itemB.category);
          } else if (sortField === "description") {
            comparison = itemA.description.localeCompare(itemB.description);
          } else if (sortField === "total") {
            comparison = itemA.total - itemB.total;
          }

          return sortDirection === "asc" ? comparison : -comparison;
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
            {
              htmlFor: "search",
              className: "mr-2 text-sm font-medium text-gray-700",
            },
            "Search:"
          ),
          React.createElement("input", {
            type: "text",
            id: "search",
            placeholder: "Search expenses...",
            className:
              "shadow-sm focus:ring-blue-500 focus:border-blue-500 block sm:text-sm border-gray-300 rounded-md",
            value: searchTerm,
            onChange: handleSearchChange,
          })
        ),
        // Category filter
        React.createElement(
          "div",
          { className: "flex items-center" },
          React.createElement(
            "label",
            {
              htmlFor: "category-filter",
              className: "mr-2 text-sm font-medium text-gray-700",
            },
            "Category:"
          ),
          React.createElement(
            "select",
            {
              id: "category-filter",
              className:
                "shadow-sm focus:ring-blue-500 focus:border-blue-500 block sm:text-sm border-gray-300 rounded-md",
              value: filterCategory,
              onChange: handleCategoryFilterChange,
            },
            React.createElement("option", { value: "all" }, "All Categories"),
            categories.map((category) =>
              React.createElement(
                "option",
                { key: category, value: category },
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
            {
              htmlFor: "sort-by",
              className: "mr-2 text-sm font-medium text-gray-700",
            },
            "Sort by:"
          ),
          React.createElement(
            "select",
            {
              id: "sort-by",
              className:
                "shadow-sm focus:ring-blue-500 focus:border-blue-500 block sm:text-sm border-gray-300 rounded-md mr-2",
              value: sortField,
              onChange: (e) => setSortField(e.target.value),
            },
            React.createElement("option", { value: "category" }, "Category"),
            React.createElement(
              "option",
              { value: "description" },
              "Description"
            ),
            React.createElement("option", { value: "total" }, "Amount")
          ),
          React.createElement(
            "button",
            {
              className:
                "inline-flex items-center px-2 py-1 border border-gray-300 text-sm leading-4 font-medium rounded text-gray-700 bg-white hover:bg-gray-50",
              onClick: () =>
                setSortDirection(sortDirection === "asc" ? "desc" : "asc"),
            },
            sortDirection === "asc" ? "↑ Asc" : "↓ Desc"
          )
        ),
        // Reset table sizing button
        React.createElement(
          "button",
          {
            className:
              "ml-auto inline-flex items-center px-2 py-1 border border-gray-300 text-sm leading-4 font-medium rounded text-gray-700 bg-white hover:bg-gray-50",
            onClick: () => {
              setColumnWidths({
                category: 150,
                description: 300,
              });
              localStorage.removeItem("expenseTableColumnWidths");
            },
          },
          "Reset Column Sizes"
        )
      );

      // Create the resize handle component
      const ResizeHandle = (column) => {
        return React.createElement(
          "div",
          {
            className:
              "absolute top-0 right-0 h-full w-2 cursor-col-resize group",
            onMouseDown: (e) => handleResizeStart(e, column),
          },
          React.createElement("div", {
            className:
              "opacity-0 group-hover:opacity-100 absolute top-0 right-0 h-full w-1 bg-blue-500",
          })
        );
      };

      // Create a table with resizable columns
      return React.createElement(
        "div",
        { className: "space-y-4 resizable-table-container" },
        tableControls,
        React.createElement(
          "div",
          {
            className: "overflow-x-auto bg-white rounded-lg shadow",
            style: { position: "relative" },
          },
          React.createElement(
            "table",
            {
              className: "min-w-full table-fixed resizable-table",
              style: { tableLayout: "fixed" },
            },
            // Table header
            React.createElement(
              "thead",
              null,
              React.createElement(
                "tr",
                { className: "bg-gray-50 border-b" },
                // Category column with resize handle
                React.createElement(
                  "th",
                  {
                    className:
                      "text-left py-3 px-4 cursor-pointer hover:bg-gray-100 relative",
                    onClick: () => handleSortChange("category"),
                    style: { width: `${columnWidths.category}px` },
                  },
                  "Category ",
                  sortField === "category" &&
                    (sortDirection === "asc" ? "↑" : "↓"),
                  ResizeHandle("category")
                ),
                // Description column with resize handle
                React.createElement(
                  "th",
                  {
                    className:
                      "text-left py-3 px-4 cursor-pointer hover:bg-gray-100 relative",
                    onClick: () => handleSortChange("description"),
                    style: { width: `${columnWidths.description}px` },
                  },
                  "Description ",
                  sortField === "description" &&
                    (sortDirection === "asc" ? "↑" : "↓"),
                  ResizeHandle("description")
                ),
                // Period columns
                props.periods.map((period) =>
                  React.createElement(
                    "th",
                    {
                      key: `period-${period.id}`,
                      className: "text-right py-3 px-4 relative",
                      style: { width: "100px" },
                    },
                    period.date,
                    ResizeHandle(`period-${period.id}`)
                  )
                ),
                // Total column
                React.createElement(
                  "th",
                  {
                    className:
                      "text-right py-3 px-4 bg-gray-100 cursor-pointer hover:bg-gray-200 relative",
                    onClick: () => handleSortChange("total"),
                    style: { width: "100px" },
                  },
                  "Total ",
                  sortField === "total" &&
                    (sortDirection === "asc" ? "↑" : "↓"),
                  ResizeHandle("total")
                ),
                // Actions column
                React.createElement(
                  "th",
                  {
                    className: "text-right py-3 px-4 relative",
                    style: { width: "80px" },
                  },
                  "Actions",
                  ResizeHandle("actions")
                )
              )
            ),
            // Table body
            React.createElement(
              "tbody",
              null,
              filteredAndSortedItems.length === 0
                ? // No results row
                  React.createElement(
                    "tr",
                    null,
                    React.createElement(
                      "td",
                      {
                        colSpan: props.periods.length + 4,
                        className: "py-4 px-4 text-center text-gray-500",
                      },
                      "No expenses match your search criteria."
                    )
                  )
                : // Map filtered and sorted items
                  filteredAndSortedItems.map(([key, item], index) => {
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
                        {
                          className:
                            "py-3 px-4 capitalize overflow-hidden text-ellipsis",
                          style: { maxWidth: `${columnWidths.category}px` },
                        },
                        item.category
                      ),
                      // Description cell with word-wrap support
                      React.createElement(
                        "td",
                        {
                          className: "py-3 px-4 overflow-hidden",
                          style: {
                            maxWidth: `${columnWidths.description}px`,
                            whiteSpace: "normal",
                            wordBreak: "break-word",
                          },
                        },
                        item.description
                      ),
                      // Amount for each period
                      props.periods.map((period) => {
                        const amount = item.periods[period.id] || 0;

                        // Find if any expenses in this period/category are paid
                        const hasPaidExpenses = item.allExpenses.some(exp => 
                          exp.paid && 
                          new Date(exp.date) >= new Date(period.start_date) && 
                          new Date(exp.date) <= new Date(period.end_date)
                        );
                      
                        return React.createElement(
                          "td",
                          {
                            key: `amount-${key}-${period.id}`,
                            className: "text-right py-3 px-4",
                          },
                          amount > 0 ? (
                            React.createElement(
                              "div",
                              { className: "flex items-center justify-end" },
                              hasPaidExpenses && 
                              React.createElement(
                                "span",
                                { 
                                  className: "mr-1 text-xs px-1 py-0.5 bg-green-100 text-green-800 rounded-full",
                                  title: "Paid"
                                },
                                "✓"
                              ),
                              formatCurrency(amount)
                            )
                          ) : ""
                        );
                      }),
                      // Row total
                      React.createElement(
                        "td",
                        { className: "text-right py-3 px-4 font-medium" },
                        React.createElement(
                          "div",
                          null,
                          item.unpaid_total > 0 ? (
                            // Show unpaid amount in red
                            React.createElement(
                              "span",
                              { className: "font-bold text-red-600" },
                              formatCurrency(item.unpaid_total)
                            )
                          ) : (
                            // All paid
                            React.createElement(
                              "span",
                              { className: "text-green-600" },
                              "Paid"
                            )
                          ),
                          // If there are both paid and unpaid amounts, show the total
                          // item.paid_total > 0 && item.unpaid_total > 0 ? (
                          //   React.createElement(
                          //     "div",
                          //     { className: "text-xs text-gray-500 mt-1" },
                          //     "(Total: " + formatCurrency(item.total) + ")"
                          //   )
                          // ) : null
                        )
                      ),
                      // Actions
                      React.createElement(
                        "td",
                        { className: "text-right py-3 px-4" },
                        React.createElement(
                          "div",
                          { className: "flex justify-end space-x-2" },
                          // Edit button
                          React.createElement(
                            "a",
                            {
                              href: `/expenses/edit/${item.id}`,
                              className: "text-blue-600 hover:text-blue-900",
                              title: "Edit",
                            },
                            React.createElement(
                              "svg",
                              {
                                className: "h-5 w-5",
                                xmlns: "http://www.w3.org/2000/svg",
                                fill: "none",
                                viewBox: "0 0 24 24",
                                stroke: "currentColor",
                              },
                              React.createElement("path", {
                                strokeLinecap: "round",
                                strokeLinejoin: "round",
                                strokeWidth: "2",
                                d: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
                              })
                            )
                          ),
                          // Toggle paid button
                          item.allExpenses &&
                            item.allExpenses.length > 0 &&
                            React.createElement(
                              "button",
                              {
                                className: `text-${
                                  item.allExpenses[0].paid ? "gray" : "green"
                                }-600 hover:text-${
                                  item.allExpenses[0].paid ? "gray" : "green"
                                }-900`,
                                title: item.allExpenses[0].paid
                                  ? "Mark as unpaid"
                                  : "Mark as paid",
                                onClick: () =>
                                  handleTogglePaid(item.allExpenses[0].id),
                              },
                              React.createElement(
                                "svg",
                                {
                                  className: "h-5 w-5",
                                  xmlns: "http://www.w3.org/2000/svg",
                                  fill: "none",
                                  viewBox: "0 0 24 24",
                                  stroke: "currentColor",
                                },
                                React.createElement("path", {
                                  strokeLinecap: "round",
                                  strokeLinejoin: "round",
                                  strokeWidth: "2",
                                  d: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
                                })
                              )
                            )
                        )
                      )
                    );
                  })
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

    // CSS for resizable columns
    const addResizableTableStyles = () => {
      // Check if styles already exist
      if (document.getElementById("resizable-table-styles")) {
        return;
      }

      // Create style element
      const style = document.createElement("style");
      style.id = "resizable-table-styles";
      style.textContent = `
        /* Base table styles */
        .resizable-table-container {
          position: relative;
        }

        .resizable-table {
          width: 100%;
          table-layout: fixed;
          border-collapse: collapse;
        }

        /* Custom grip/handle for resizing */
        .resizable-table th {
          position: relative;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .resizable-table .group {
          position: absolute;
          top: 0;
          right: 0;
          width: 5px;
          height: 100%;
          cursor: col-resize;
          z-index: 1;
        }

        .resizable-table .group:hover div,
        .resizable-table .group div.active {
          opacity: 1 !important;
        }

        /* When resizing, show a line indicating the resize */
        .resizable-table .group div {
          transition: opacity 0.2s;
        }

        /* Highlight active column being resized */
        body.column-resizing * {
          cursor: col-resize !important;
          user-select: none !important;
        }

        /* Ensure description text breaks properly */
        .resizable-table td {
          overflow: hidden;
          text-overflow: ellipsis;
        }
      `;

      // Add to document
      document.head.appendChild(style);
    };

    // Add the CSS styles
    addResizableTableStyles();

    // IMPORTANT: The updateBudgetSummary function has been REMOVED
    // We are no longer updating the Budget Summary from JavaScript
    // Budget Summary now relies entirely on server-side calculations

    // Render the component
    try {
      if (typeof ReactDOM.createRoot === "function") {
        // React 18+ method
        const root = ReactDOM.createRoot(mountPoint);
        root.render(
          React.createElement(ResizableTable, {
            periods: window.periodsData,
            expenses: window.expensesData,
          })
        );
      } else {
        // React 17 or earlier method
        ReactDOM.render(
          React.createElement(ResizableTable, {
            periods: window.periodsData,
            expenses: window.expensesData,
          }),
          mountPoint
        );
      }

      console.log("Resizable expense table initialized successfully");
    } catch (error) {
      console.error("Error initializing resizable expense table:", error);
      mountPoint.innerHTML = `
        <div class="p-4 bg-red-100 border-l-4 border-red-500 text-red-700">
          <p>Error loading expense table: ${error.message}</p>
          <pre class="mt-2 text-xs overflow-auto">${error.stack || ""}</pre>
        </div>
      `;
    }
  });
})();

// app/static/js/components/detailed-expense-table.js

const DetailedExpenseTable = (props) => {
  // Ensure props exists and has expected properties
  const periods = props?.periods || [];
  const expenses = props?.expenses || [];

  const [categoryExpanded, setCategoryExpanded] = React.useState({});
  const [groupedExpenses, setGroupedExpenses] = React.useState({});
  const [categoryTotals, setCategoryTotals] = React.useState({});
  const [periodTotals, setPeriodTotals] = React.useState({});
  const [grandTotal, setGrandTotal] = React.useState(0);
  const [isLoaded, setIsLoaded] = React.useState(false);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Toggle category expansion
  const toggleCategory = (category) => {
    setCategoryExpanded(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  React.useEffect(() => {
    console.log("DetailedExpenseTable received data:", { periods: props.periods, expenses: props.expenses });
    
    // Debugging info
    if (!props.periods || props.periods.length === 0) {
      console.error("No periods data received");
    }
    
    if (!props.expenses || props.expenses.length === 0) {
      console.error("No expenses data received");
    }
    
    // Group expenses by category
    const grouped = {};
    const catTotals = {};
    const perTotals = {};
    let total = 0;
    
    try {
      if (props.expenses && props.periods && Array.isArray(props.expenses) && Array.isArray(props.periods)) {
        // Initialize period totals
        props.periods.forEach(period => {
          const periodId = period.id;
          perTotals[periodId] = 0;
        });
        
        // Process expenses
        props.expenses.forEach(expense => {
          if (!expense) return;
          
          // Get category, defaulting to "uncategorized" if missing
          const category = (expense.category || "uncategorized").toLowerCase();
          
          // Get amount, defaulting to 0 if missing
          const amount = parseFloat(expense.amount) || 0;
          
          // Initialize category if not exists
          if (!grouped[category]) {
            grouped[category] = {};
            catTotals[category] = 0;
          }
          
          // Find which period this expense belongs to
          const expenseDate = new Date(expense.date);
          let periodId = null;
          
          for (const period of props.periods) {
            if (!period) continue;
            
            const startDate = period.start_date ? new Date(period.start_date) : null;
            const endDate = period.end_date ? new Date(period.end_date) : null;
            
            if (startDate && endDate && expenseDate >= startDate && expenseDate <= endDate) {
              periodId = period.id;
              break;
            }
          }
          
          if (periodId !== null) {
            // Add expense to its category and period
            if (!grouped[category][periodId]) {
              grouped[category][periodId] = [];
            }
            
            grouped[category][periodId].push(expense);
            
            // Update totals
            catTotals[category] += amount;
            perTotals[periodId] += amount;
            total += amount;
          } else {
            console.warn(`Expense date ${expense.date} doesn't match any period`, expense);
          }
        });
        
        console.log("Processed data:", {
          groupedExpenses: grouped,
          categoryTotals: catTotals,
          periodTotals: perTotals,
          grandTotal: total
        });
      }
    } catch (error) {
      console.error("Error processing expense data:", error);
    }

    setGroupedExpenses(grouped);
    setCategoryTotals(catTotals);
    setPeriodTotals(perTotals);
    setGrandTotal(total);
    setIsLoaded(true);
  }, [props.expenses, props.periods]);

  if (!isLoaded) {
    return React.createElement('div', { className: 'p-4 text-gray-500' }, 'Loading expense data...');
  }

  if (!props.periods || props.periods.length === 0) {
    return React.createElement('div', { className: 'p-4 text-gray-500' }, 'No periods defined.');
  }

  if (!props.expenses || props.expenses.length === 0) {
    return React.createElement('div', { className: 'p-4 text-gray-500' }, 'No expenses found for this period.');
  }

  const categories = Object.keys(groupedExpenses);
  
  if (categories.length === 0) {
    return React.createElement('div', { className: 'p-4 text-gray-500' }, 'No categorized expenses found.');
  }

  // Create the table header
  const tableHeader = React.createElement('thead', null,
    React.createElement('tr', { className: 'bg-gray-50 border-b' },
      React.createElement('th', { className: 'text-left py-2 px-4' }, 'Category / Expense'),
      props.periods.map(period => 
        React.createElement('th', { 
          key: period.id, 
          className: 'text-right py-2 px-4' 
        }, period.date)
      ),
      React.createElement('th', { className: 'text-right py-2 px-4 bg-gray-100' }, 'Total')
    )
  );

  // Create the table body with category rows and expense details
  const tableBody = React.createElement('tbody', null,
    categories.sort().map(category => {
      // Create the main category row
      const categoryRow = React.createElement('tr', { key: category, className: 'border-b hover:bg-gray-50' },
        React.createElement('td', { className: 'py-2 px-4 capitalize font-medium' },
          React.createElement('button', { 
            className: 'flex items-center focus:outline-none',
            onClick: () => toggleCategory(category)
          },
            categoryExpanded[category] ?
              React.createElement('svg', { 
                className: 'h-4 w-4 mr-1', 
                xmlns: 'http://www.w3.org/2000/svg', 
                fill: 'none', 
                viewBox: '0 0 24 24', 
                stroke: 'currentColor' 
              },
                React.createElement('path', { 
                  strokeLinecap: 'round', 
                  strokeLinejoin: 'round', 
                  strokeWidth: '2', 
                  d: 'M18 12H6' 
                })
              ) :
              React.createElement('svg', { 
                className: 'h-4 w-4 mr-1', 
                xmlns: 'http://www.w3.org/2000/svg', 
                fill: 'none', 
                viewBox: '0 0 24 24', 
                stroke: 'currentColor' 
              },
                React.createElement('path', { 
                  strokeLinecap: 'round', 
                  strokeLinejoin: 'round', 
                  strokeWidth: '2', 
                  d: 'M12 6v6m0 0v6m0-6h6m-6 0H6' 
                })
              ),
            category
          )
        ),
        // Create cells for each period
        props.periods.map(period => 
          React.createElement('td', { key: period.id, className: 'text-right py-2 px-4' },
            groupedExpenses[category][period.id] ? 
              formatCurrency(groupedExpenses[category][period.id].reduce(
                (sum, exp) => sum + (parseFloat(exp.amount) || 0), 0
              )) : 
              formatCurrency(0)
          )
        ),
        // Create total cell
        React.createElement('td', { className: 'text-right py-2 px-4 bg-gray-100 font-medium' },
          formatCurrency(categoryTotals[category] || 0)
        )
      );

      // Create the expanded detail rows for each expense in the category
      const detailRows = categoryExpanded[category] ? 
        props.periods.flatMap(period => {
          if (!period || !groupedExpenses[category] || !groupedExpenses[category][period.id]) {
            return [];
          }
          
          return groupedExpenses[category][period.id].map((expense, index) => {
            return React.createElement('tr', { key: `${period.id}-${index}`, className: 'border-b text-sm bg-gray-50' },
              React.createElement('td', { className: 'py-1 px-4 pl-10' },
                React.createElement('div', { className: 'flex items-start' },
                  React.createElement('span', { className: 'text-xs text-gray-500 mr-2' },
                    new Date(expense.date).toLocaleDateString()
                  ),
                  React.createElement('span', { className: 'flex-grow' },
                    expense.description || "(No description)",
                    expense.recurring && React.createElement('span', { className: 'ml-1 text-xs text-blue-500' }, 
                      "(Recurring)")
                  )
                )
              ),
              props.periods.map(p => 
                React.createElement('td', { key: p.id, className: 'text-right py-1 px-4' },
                  p.id === period.id ? formatCurrency(parseFloat(expense.amount) || 0) : ''
                )
              ),
              React.createElement('td', { className: 'text-right py-1 px-4 bg-gray-100' },
                formatCurrency(parseFloat(expense.amount) || 0)
              )
            );
          });
        }) : [];

      // Return category row and detail rows
      return [categoryRow, ...detailRows];
    }).flat(),
    // Add the total row at the bottom
    React.createElement('tr', { className: 'bg-gray-50 font-bold' },
      React.createElement('td', { className: 'py-2 px-4' }, 'Total Expenses'),
      props.periods.map(period => 
        React.createElement('td', { key: period.id, className: 'text-right py-2 px-4 text-red-600' },
          formatCurrency(periodTotals[period.id] || 0)
        )
      ),
      React.createElement('td', { className: 'text-right py-2 px-4 text-red-600 bg-gray-100' },
        formatCurrency(grandTotal)
      )
    )
  );

  // Create the complete table
  return React.createElement('div', { className: 'overflow-x-auto' },
    React.createElement('table', { className: 'min-w-full' },
      tableHeader,
      tableBody
    )
  );
};

// Export the component for both module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { default: DetailedExpenseTable };
} else {
  // For direct script tag inclusion
  window.DetailedExpenseTable = DetailedExpenseTable;
}
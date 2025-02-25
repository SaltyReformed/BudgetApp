import React, { useState, useEffect } from 'react';

const DetailedExpenseTable = ({ periods, expenses }) => {
  const [categoryExpanded, setCategoryExpanded] = useState({});
  const [groupedExpenses, setGroupedExpenses] = useState({});
  const [categoryTotals, setCategoryTotals] = useState({});
  const [periodTotals, setPeriodTotals] = useState({});
  const [grandTotal, setGrandTotal] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

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

  useEffect(() => {
    console.log("DetailedExpenseTable received data:", { periods, expenses });
    
    // Debugging info
    if (!periods || periods.length === 0) {
      console.error("No periods data received");
    }
    
    if (!expenses || expenses.length === 0) {
      console.error("No expenses data received");
    }
    
    // Group expenses by category
    const grouped = {};
    const catTotals = {};
    const perTotals = {};
    let total = 0;
    
    try {
      if (expenses && periods && Array.isArray(expenses) && Array.isArray(periods)) {
        // Initialize period totals
        periods.forEach(period => {
          const periodId = period.id;
          perTotals[periodId] = 0;
        });
        
        // Process expenses
        expenses.forEach(expense => {
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
          
          for (const period of periods) {
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
  }, [expenses, periods]);

  if (!isLoaded) {
    return <div className="p-4 text-gray-500">Loading expense data...</div>;
  }

  if (!periods || periods.length === 0) {
    return <div className="p-4 text-gray-500">No periods defined.</div>;
  }

  if (!expenses || expenses.length === 0) {
    return <div className="p-4 text-gray-500">No expenses found for this period.</div>;
  }

  const categories = Object.keys(groupedExpenses);
  
  if (categories.length === 0) {
    return <div className="p-4 text-gray-500">No categorized expenses found.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="bg-gray-50 border-b">
            <th className="text-left py-2 px-4">Category / Expense</th>
            {periods.map(period => (
              <th key={period.id} className="text-right py-2 px-4">
                {period.date}
              </th>
            ))}
            <th className="text-right py-2 px-4 bg-gray-100">Total</th>
          </tr>
        </thead>
        <tbody>
          {categories.sort().map(category => (
            <React.Fragment key={category}>
              {/* Category row */}
              <tr className="border-b hover:bg-gray-50">
                <td className="py-2 px-4 capitalize font-medium">
                  <button 
                    className="flex items-center focus:outline-none" 
                    onClick={() => toggleCategory(category)}
                  >
                    {categoryExpanded[category] ? (
                      <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 12H6" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    )}
                    {category}
                  </button>
                </td>
                {periods.map(period => (
                  <td key={period.id} className="text-right py-2 px-4">
                    {groupedExpenses[category][period.id] ? 
                      formatCurrency(groupedExpenses[category][period.id].reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0)) : 
                      formatCurrency(0)}
                  </td>
                ))}
                <td className="text-right py-2 px-4 bg-gray-100 font-medium">
                  {formatCurrency(categoryTotals[category] || 0)}
                </td>
              </tr>
              
              {/* Individual expense rows */}
              {categoryExpanded[category] && periods.map(period => {
                if (!period || !groupedExpenses[category] || !groupedExpenses[category][period.id]) {
                  return null;
                }
                
                return groupedExpenses[category][period.id].map((expense, index) => (
                  <tr key={`${period.id}-${index}`} className="border-b text-sm bg-gray-50">
                    <td className="py-1 px-4 pl-10">
                      <div className="flex items-start">
                        <span className="text-xs text-gray-500 mr-2">
                          {new Date(expense.date).toLocaleDateString()}
                        </span>
                        <span className="flex-grow">
                          {expense.description || "(No description)"}
                          {expense.recurring && <span className="ml-1 text-xs text-blue-500">(Recurring)</span>}
                        </span>
                      </div>
                    </td>
                    {periods.map(p => (
                      <td key={p.id} className="text-right py-1 px-4">
                        {p.id === period.id ? formatCurrency(parseFloat(expense.amount) || 0) : ''}
                      </td>
                    ))}
                    <td className="text-right py-1 px-4 bg-gray-100">
                      {formatCurrency(parseFloat(expense.amount) || 0)}
                    </td>
                  </tr>
                ));
              })}
            </React.Fragment>
          ))}
          
          {/* Total row */}
          <tr className="bg-gray-50 font-bold">
            <td className="py-2 px-4">Total Expenses</td>
            {periods.map(period => (
              <td key={period.id} className="text-right py-2 px-4 text-red-600">
                {formatCurrency(periodTotals[period.id] || 0)}
              </td>
            ))}
            <td className="text-right py-2 px-4 text-red-600 bg-gray-100">
              {formatCurrency(grandTotal)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default DetailedExpenseTable;
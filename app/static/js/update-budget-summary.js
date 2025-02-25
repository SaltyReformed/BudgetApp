// Function to update Budget Summary with correct expense totals
const updateBudgetSummary = (totalExpenses, periodTotals) => {
  // Find the Budget Summary table
  const summaryTable = document.querySelector(
    ".max-w-7xl .bg-white.rounded-lg.shadow.p-6.mb-6 table"
  );
  if (!summaryTable) {
    console.error("Budget Summary table not found");
    return;
  }

  // Format currency helper
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  try {
    // Find expenses row in summary table (usually the third row)
    const expensesRow = summaryTable.querySelector("tbody tr:nth-child(3)");
    if (!expensesRow) {
      console.error("Expenses row not found in Budget Summary");
      return;
    }

    // Get all cells in the expenses row
    const cells = expensesRow.querySelectorAll("td");

    // Update the period expense totals
    let periodIndex = 1; // Start from the second cell (first cell is "Expenses" label)
    for (const periodId in periodTotals) {
      if (periodIndex < cells.length) {
        cells[periodIndex].textContent = formatCurrency(periodTotals[periodId]);
        cells[periodIndex].classList.add("text-red-600"); // Ensure consistent styling
        periodIndex++;
      }
    }

    // Update the total expenses cell (last cell)
    const totalCell = cells[cells.length - 1];
    if (totalCell) {
      totalCell.textContent = formatCurrency(totalExpenses);
      totalCell.classList.add("text-red-600", "font-bold");
    }

    // Now we need to update the Net row and Projected End Balance row
    updateNetAndBalance();
  } catch (error) {
    console.error("Error updating Budget Summary:", error);
  }
};

// Helper function to update Net and Projected End Balance rows
const updateNetAndBalance = () => {
  const summaryTable = document.querySelector(
    ".max-w-7xl .bg-white.rounded-lg.shadow.p-6.mb-6 table"
  );
  if (!summaryTable) return;

  // Find all rows
  const rows = summaryTable.querySelectorAll("tbody tr");
  if (rows.length < 5) return;

  const startingBalanceRow = rows[0];
  const incomeRow = rows[1];
  const expensesRow = rows[2];
  const netRow = rows[3];
  const balanceRow = rows[4];

  // Go through each column (except the first and last) and recalculate net and balance
  let runningBalance = parseFloat(getCellAmount(startingBalanceRow.cells[1]));

  for (let i = 1; i < incomeRow.cells.length - 1; i++) {
    const income = parseFloat(getCellAmount(incomeRow.cells[i]));
    const expense = parseFloat(getCellAmount(expensesRow.cells[i]));
    const net = income - expense;

    // Update net cell
    netRow.cells[i].textContent = formatCurrency(net);
    netRow.cells[i].className =
      net >= 0
        ? "text-right py-2 px-4 text-green-600"
        : "text-right py-2 px-4 text-red-600";

    // Calculate and update balance
    runningBalance += net;
    balanceRow.cells[i].textContent = formatCurrency(runningBalance);
    balanceRow.cells[i].className =
      runningBalance >= 0
        ? "text-right py-2 px-4 text-green-600"
        : "text-right py-2 px-4 text-red-600";
  }

  // Update total column
  const totalIncome = parseFloat(
    getCellAmount(incomeRow.cells[incomeRow.cells.length - 1])
  );
  const totalExpense = parseFloat(
    getCellAmount(expensesRow.cells[expensesRow.cells.length - 1])
  );
  const totalNet = totalIncome - totalExpense;

  // Update net total
  netRow.cells[netRow.cells.length - 1].textContent = formatCurrency(totalNet);
  netRow.cells[netRow.cells.length - 1].className =
    totalNet >= 0
      ? "text-right py-2 px-4 text-green-600 bg-gray-100"
      : "text-right py-2 px-4 text-red-600 bg-gray-100";

  // Starting balance plus total net equals final balance
  const startingBalance = parseFloat(
    getCellAmount(startingBalanceRow.cells[startingBalanceRow.cells.length - 1])
  );
  const finalBalance = startingBalance + totalNet;

  // Update final balance
  balanceRow.cells[balanceRow.cells.length - 1].textContent =
    formatCurrency(finalBalance);
  balanceRow.cells[balanceRow.cells.length - 1].className =
    finalBalance >= 0
      ? "text-right py-2 px-4 text-green-600 bg-gray-100"
      : "text-right py-2 px-4 text-red-600 bg-gray-100";
};

// Helper to extract numeric amount from a cell's text
const getCellAmount = (cell) => {
  if (!cell || !cell.textContent) return 0;

  // Remove currency symbol and commas, then parse
  return parseFloat(cell.textContent.replace(/[$,]/g, "")) || 0;
};

// Helper to format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

// Expose the update function so the component can call it
window.updateBudgetSummary = updateBudgetSummary;

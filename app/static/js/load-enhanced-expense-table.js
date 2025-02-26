// app/static/js/load-enhanced-expense-table.js

document.addEventListener('DOMContentLoaded', function() {
  // Find the mount point for the expense table
  const mountPoint = document.getElementById('detailed-expense-table');
  
  if (!mountPoint) {
    console.warn('Mount point #detailed-expense-table not found');
    return;
  }
  
  console.log('Initializing enhanced expense table...');
  
  // Check if we have the necessary data
  if (!window.periodsData || !window.expensesData) {
    console.error('Required data is missing. Make sure periodsData and expensesData are defined.');
    mountPoint.innerHTML = `
      <div class="p-4 bg-red-100 border-l-4 border-red-500 text-red-700">
        <p>Required data is missing. Please refresh the page or contact support.</p>
      </div>
    `;
    return;
  }
  
  // Attempt to render the enhanced table component
  try {
    // Get the React component - preferably use the enhanced one
    const TableComponent = window.EnhancedExpenseTable || window.DetailedExpenseTable;
    
    if (!TableComponent) {
      throw new Error('Could not find expense table component. Make sure it is properly loaded.');
    }
    
    // Render the component
    if (typeof ReactDOM.createRoot === 'function') {
      // React 18+ method
      const root = ReactDOM.createRoot(mountPoint);
      root.render(
        React.createElement(TableComponent, {
          periods: window.periodsData,
          expenses: window.expensesData
        })
      );
    } else {
      // React 17 or earlier method
      ReactDOM.render(
        React.createElement(TableComponent, {
          periods: window.periodsData,
          expenses: window.expensesData
        }),
        mountPoint
      );
    }
    
    console.log('Enhanced expense table initialized successfully');
  } catch (error) {
    console.error('Error initializing enhanced expense table:', error);
    mountPoint.innerHTML = `
      <div class="p-4 bg-red-100 border-l-4 border-red-500 text-red-700">
        <p>Error loading expense table: ${error.message}</p>
        <pre class="mt-2 text-xs overflow-auto">${error.stack || ''}</pre>
      </div>
    `;
  }
});
// app/static/js/budget-page-expense-table.js

document.addEventListener("DOMContentLoaded", function () {
  // Ensure React and ReactDOM are available
  if (typeof React === "undefined") {
    console.error(
      "React not loaded. Make sure it is included in your base template."
    );
    return;
  }

  if (typeof ReactDOM === "undefined") {
    console.error(
      "ReactDOM not loaded. Make sure it is included in your base template."
    );
    return;
  }

  // Function to initialize the detailed expense table
  const initializeExpenseTable = () => {
    try {
      // Find the mount point in the DOM
      const mountPoint = document.getElementById("detailed-expense-table");
      if (!mountPoint) {
        console.warn(
          "Mount point #detailed-expense-table not found in the DOM"
        );
        return;
      }

      console.log("Found mount point for expense table");

      // Check if we have the data available in window
      if (!window.periodsData) {
        console.error("periodsData not available in window object");
        mountPoint.innerHTML = `
          <div class="p-4 bg-red-100 border-l-4 border-red-500 text-red-700">
            <p>Error: periodsData not found. Make sure it is properly defined in your template.</p>
          </div>
        `;
        return;
      }

      if (!window.expensesData) {
        console.error("expensesData not available in window object");
        mountPoint.innerHTML = `
          <div class="p-4 bg-red-100 border-l-4 border-red-500 text-red-700">
            <p>Error: expensesData not found. Make sure it is properly defined in your template.</p>
          </div>
        `;
        return;
      }

      console.log("Data available:", {
        periods: window.periodsData.length,
        expenses: window.expensesData.length,
      });

      // Now try to get the DetailedExpenseTable component
      if (typeof window.DetailedExpenseTable === "undefined") {
        console.error("DetailedExpenseTable component not found globally");
        mountPoint.innerHTML = `
          <div class="p-4 bg-red-100 border-l-4 border-red-500 text-red-700">
            <p>Error: DetailedExpenseTable component not found. Make sure detailed-expense-table.js is loaded.</p>
          </div>
        `;
        return;
      }

      console.log("Found component, rendering...");

      // Render using ReactDOM
      try {
        const DetailedExpenseTable = window.DetailedExpenseTable;

        // Check React version to use appropriate rendering method
        if (typeof ReactDOM.createRoot === "function") {
          // React 18+ method
          const root = ReactDOM.createRoot(mountPoint);
          root.render(
            React.createElement(DetailedExpenseTable, {
              periods: window.periodsData,
              expenses: window.expensesData,
            })
          );
        } else {
          // React 17 or earlier method
          ReactDOM.render(
            React.createElement(DetailedExpenseTable, {
              periods: window.periodsData,
              expenses: window.expensesData,
            }),
            mountPoint
          );
        }

        console.log("Component rendered successfully");
      } catch (renderError) {
        console.error("Error rendering component:", renderError);
        mountPoint.innerHTML = `
          <div class="p-4 bg-red-100 border-l-4 border-red-500 text-red-700">
            <p>Error rendering expense table: ${renderError.message}</p>
            <pre class="mt-2 text-xs overflow-auto">${
              renderError.stack || "No stack trace available"
            }</pre>
          </div>
        `;
      }
    } catch (err) {
      console.error("Error initializing expense table:", err);
    }
  };

  // Initialize the component
  initializeExpenseTable();
});

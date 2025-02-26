// app/static/js/starting-balance-persistence.js

/**
 * Handle starting balance persistence using local storage
 * This allows the Budget Tracker starting balance to be remembered
 * across page navigations and browser restarts.
 */
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    // Get the starting balance input field
    const startingBalanceInput = document.getElementById('starting_balance');
    
    if (!startingBalanceInput) {
      return; // Not on the budget page
    }
    
    // Local storage key
    const STORAGE_KEY = 'budgetStartingBalance';
    
    // When the page loads, check if we have a stored value
    const storedValue = localStorage.getItem(STORAGE_KEY);
    
    // If there's no starting balance in the URL and we have a stored value, use it
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.has('starting_balance') && storedValue !== null) {
      startingBalanceInput.value = storedValue;
      
      // If we're using the stored value, we should submit the form to update the calculation
      // But only if we actually changed the value to avoid an unnecessary page reload
      if (startingBalanceInput.defaultValue !== storedValue) {
        // Option 1: Auto-submit the form (can be jarring for users)
        // startingBalanceInput.closest('form').submit();
        
        // Option 2: Show a refresh button to the user
        const formContainer = startingBalanceInput.closest('div');
        const refreshBtn = document.createElement('button');
        refreshBtn.type = 'submit';
        refreshBtn.className = 'mt-2 px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600';
        refreshBtn.textContent = 'Refresh with saved balance';
        formContainer.appendChild(refreshBtn);
      }
    }
    
    // Store the current value whenever it changes
    startingBalanceInput.addEventListener('change', function() {
      localStorage.setItem(STORAGE_KEY, this.value);
    });
    
    // Also store the value when the form is submitted
    startingBalanceInput.closest('form').addEventListener('submit', function() {
      localStorage.setItem(STORAGE_KEY, startingBalanceInput.value);
    });
  });
})();
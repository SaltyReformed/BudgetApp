import React, { useState, useEffect } from "react";

// Helper to handle form submissions with redirects
const submitFormWithRedirect = (url, formData) => {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = url;
  form.style.display = "none";

  // Add form fields
  for (const [key, value] of Object.entries(formData)) {
    const input = document.createElement("input");
    input.type = key === "phone_stipend" ? "checkbox" : "hidden";
    input.name = key;
    input.value = value === true ? "on" : value;
    if (key === "phone_stipend" && value === true) {
      input.checked = true;
    }
    form.appendChild(input);
  }

  // Submit the form
  document.body.appendChild(form);
  form.submit();
};

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl font-bold"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

const AddIncomeModal = ({
  isOpen,
  onClose,
  periods = [],
  activePeriod = null,
  csrfToken,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const today = new Date().toISOString().split("T")[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.target);

    // Check if it's a period-specific entry
    const periodId = formData.get("period");

    // For API endpoint
    const incomeData = {
      date: formData.get("date"),
      income_type: formData.get("income_type"),
      amount: parseFloat(formData.get("amount")),
      description: formData.get("description") || "",
    };

    // Add period ID if specified
    if (periodId) {
      incomeData.period_id = periodId;
    }

    try {
      // Try API endpoint first
      const response = await fetch("/api/income", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(incomeData),
      });

      if (!response.ok) {
        // If API fails, try form submission
        if (response.status === 404) {
          // Redirect to one-time income form
          const oneTimeIncomeData = {
            date: formData.get("date"),
            income_type: formData.get("income_type"),
            amount: formData.get("amount"),
            description: formData.get("description") || "",
          };

          // Add CSRF token if available
          if (csrfToken) {
            oneTimeIncomeData.csrf_token = csrfToken;
          }

          submitFormWithRedirect("/api/income/add", oneTimeIncomeData);
          return;
        }

        throw new Error("Failed to save income");
      }

      const result = await response.json();
      window.location.reload();
    } catch (error) {
      console.error("Error saving income:", error);
      alert("Failed to save income. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add One-Time Income">
      <form onSubmit={handleSubmit} className="space-y-4">
        {!activePeriod && periods.length > 0 && (
          <div>
            <label
              htmlFor="period"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Pay Period
            </label>
            <select
              name="period"
              id="period"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
            >
              <option value="">Select a period (optional)</option>
              {periods.map((period) => (
                <option
                  key={period.id}
                  value={period.id}
                  selected={activePeriod === period.id}
                >
                  {period.date}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label
            htmlFor="income_type"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Income Type
          </label>
          <select
            name="income_type"
            id="income_type"
            required
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
          >
            <option value="">Select income type</option>
            <option value="salary">Salary</option>
            <option value="phoneStipend">Phone Stipend</option>
            <option value="otherIncome">Other Income</option>
            <option value="taxReturn">Tax Return</option>
            <option value="transfer">Transfer from Savings</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Description (optional)
          </label>
          <input
            type="text"
            name="description"
            id="description"
            placeholder="E.g., Bonus, Reimbursement, etc."
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
          />
        </div>

        <div>
          <label
            htmlFor="date"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Date
          </label>
          <input
            type="date"
            name="date"
            id="date"
            required
            defaultValue={today}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
          />
        </div>

        <div>
          <label
            htmlFor="amount"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Amount
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">$</span>
            </div>
            <input
              type="number"
              name="amount"
              id="amount"
              step="0.01"
              required
              min="0"
              placeholder="0.00"
              className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 flex items-center"
          >
            {isSubmitting ? (
              <>
                <span className="inline-block w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Saving...
              </>
            ) : (
              "Save"
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

const AddPaycheckModal = ({ isOpen, onClose, csrfToken }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const today = new Date().toISOString().split("T")[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.target);
    const paycheckData = {
      date: formData.get("date"),
      pay_type: formData.get("pay_type"),
      gross_amount: parseFloat(formData.get("gross_amount")),
      taxable_amount: parseFloat(formData.get("taxable_amount")),
      non_taxable_amount: parseFloat(formData.get("non_taxable_amount")),
      phone_stipend: formData.get("phone_stipend") === "on",
    };

    try {
      // Add CSRF token if available
      if (csrfToken) {
        paycheckData.csrf_token = csrfToken;
      }

      // Submit the form with page redirect
      submitFormWithRedirect("/paycheck/add", paycheckData);
    } catch (error) {
      console.error("Error saving paycheck:", error);
      alert("Failed to save paycheck. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Paycheck">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="date"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Date
          </label>
          <input
            type="date"
            name="date"
            id="date"
            required
            defaultValue={today}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
          />
        </div>

        <div>
          <label
            htmlFor="pay_type"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Pay Type
          </label>
          <select
            name="pay_type"
            id="pay_type"
            required
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
          >
            <option value="Regular">Regular</option>
            <option value="Third">Third</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="gross_amount"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Gross Amount
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">$</span>
            </div>
            <input
              type="number"
              name="gross_amount"
              id="gross_amount"
              step="0.01"
              required
              min="0"
              placeholder="0.00"
              className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="taxable_amount"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Taxable Amount
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">$</span>
            </div>
            <input
              type="number"
              name="taxable_amount"
              id="taxable_amount"
              step="0.01"
              required
              min="0"
              placeholder="0.00"
              className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="non_taxable_amount"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Non-taxable Amount
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">$</span>
            </div>
            <input
              type="number"
              name="non_taxable_amount"
              id="non_taxable_amount"
              step="0.01"
              required
              min="0"
              placeholder="0.00"
              className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
            />
          </div>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            name="phone_stipend"
            id="phone_stipend"
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label
            htmlFor="phone_stipend"
            className="ml-2 block text-sm text-gray-900"
          >
            Phone Stipend
          </label>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 flex items-center"
          >
            {isSubmitting ? (
              <>
                <span className="inline-block w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Saving...
              </>
            ) : (
              "Save"
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

const AddExpenseModal = ({ isOpen, onClose, csrfToken }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const today = new Date().toISOString().split("T")[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.target);

    // For non-API endpoints, use the form submission approach
    if (!isRecurring || window.location.pathname.includes("/budget")) {
      // Direct form submission to the expense endpoint
      const expenseFormData = {
        date: formData.get("date"),
        category: formData.get("category"),
        description: formData.get("description") || "",
        amount: formData.get("amount"),
        recurring: isRecurring ? "y" : "",
        frequency: isRecurring ? formData.get("frequency") : "",
      };

      // Add CSRF token if available
      if (csrfToken) {
        expenseFormData.csrf_token = csrfToken;
      }

      submitFormWithRedirect("/expense/add", expenseFormData);
      return;
    }

    // For API endpoints
    const expenseData = {
      date: formData.get("date"),
      category: formData.get("category"),
      description: formData.get("description") || "",
      amount: parseFloat(formData.get("amount")),
      recurring: isRecurring,
      frequency: isRecurring ? formData.get("frequency") : "",
    };

    try {
      const response = await fetch("/api/expense", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(expenseData),
      });

      if (!response.ok) {
        throw new Error("Failed to save expense");
      }

      window.location.reload();
    } catch (error) {
      console.error("Error saving expense:", error);
      alert("Failed to save expense. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Expense">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="date"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Date
          </label>
          <input
            type="date"
            name="date"
            id="date"
            required
            defaultValue={today}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
          />
        </div>

        <div>
          <label
            htmlFor="category"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Category
          </label>
          <select
            name="category"
            id="category"
            required
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
          >
            <option value="">Select a category</option>
            <option value="Housing">Housing</option>
            <option value="Transportation">Transportation</option>
            <option value="Food">Food</option>
            <option value="Utilities">Utilities</option>
            <option value="Insurance">Insurance</option>
            <option value="Healthcare">Healthcare</option>
            <option value="Savings">Savings</option>
            <option value="Personal">Personal</option>
            <option value="Entertainment">Entertainment</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Description (optional)
          </label>
          <textarea
            name="description"
            id="description"
            rows="3"
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
          ></textarea>
        </div>

        <div>
          <label
            htmlFor="amount"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Amount
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">$</span>
            </div>
            <input
              type="number"
              name="amount"
              id="amount"
              step="0.01"
              required
              min="0"
              placeholder="0.00"
              className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              name="recurring"
              id="recurring"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              checked={isRecurring}
              onChange={() => setIsRecurring(!isRecurring)}
            />
            <label
              htmlFor="recurring"
              className="ml-2 block text-sm text-gray-900"
            >
              Recurring Expense
            </label>
          </div>

          {isRecurring && (
            <div>
              <label
                htmlFor="frequency"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Frequency
              </label>
              <select
                name="frequency"
                id="frequency"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
              >
                <option value="">One-time</option>
                <option value="monthly">Monthly</option>
                <option value="bi-weekly">Bi-weekly</option>
                <option value="weekly">Weekly</option>
                <option value="annually">Annually</option>
              </select>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 flex items-center"
          >
            {isSubmitting ? (
              <>
                <span className="inline-block w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Saving...
              </>
            ) : (
              "Save"
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

const BudgetPageModals = ({ csrfToken }) => {
  const [activeModal, setActiveModal] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [activePeriod, setActivePeriod] = useState(null);

  // Initialize the component by adding click handlers to the buttons
  useEffect(() => {
    // Extract period data if available
    const periodElements = document.querySelectorAll("table thead tr th");
    const extractedPeriods = [];

    periodElements.forEach((el, index) => {
      const dateText = el.textContent.trim();
      // Skip first column and any non-date columns
      if (index > 0 && dateText.match(/\d{1,2}\/\d{1,2}\/\d{4}/)) {
        extractedPeriods.push({
          id: index,
          date: dateText,
        });
      }
    });

    setPeriods(extractedPeriods);

    // Add click handlers
    const addIncomeBtn = document.querySelector(
      'a[href="/api/income/add"], button:contains("Add One-Time Income")'
    );
    const addPaycheckBtn = document.querySelector('a[href="/paycheck/add"]');
    const addExpenseBtn = document.querySelector('a[href="/expense/add"]');

    if (addIncomeBtn) {
      addIncomeBtn.addEventListener("click", (e) => {
        e.preventDefault();
        setActiveModal("income");
      });
    }

    if (addPaycheckBtn) {
      addPaycheckBtn.addEventListener("click", (e) => {
        e.preventDefault();
        setActiveModal("paycheck");
      });
    }

    if (addExpenseBtn) {
      addExpenseBtn.addEventListener("click", (e) => {
        e.preventDefault();
        setActiveModal("expense");
      });
    }

    // Also add handlers for the "+ Add" buttons in the period columns
    document
      .querySelectorAll(".text-xs.text-blue-600.hover\\:text-blue-800")
      .forEach((btn, index) => {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          setActivePeriod(index + 1); // +1 because periods are 1-indexed in your data structure
          setActiveModal("income");
        });
      });

    return () => {
      // Cleanup event listeners if component unmounts
      if (addIncomeBtn) addIncomeBtn.removeEventListener("click", () => {});
      if (addPaycheckBtn) addPaycheckBtn.removeEventListener("click", () => {});
      if (addExpenseBtn) addExpenseBtn.removeEventListener("click", () => {});
    };
  }, []);

  return (
    <>
      <AddIncomeModal
        isOpen={activeModal === "income"}
        onClose={() => {
          setActiveModal(null);
          setActivePeriod(null);
        }}
        periods={periods}
        activePeriod={activePeriod}
        csrfToken={csrfToken}
      />

      <AddPaycheckModal
        isOpen={activeModal === "paycheck"}
        onClose={() => setActiveModal(null)}
        csrfToken={csrfToken}
      />

      <AddExpenseModal
        isOpen={activeModal === "expense"}
        onClose={() => setActiveModal(null)}
        csrfToken={csrfToken}
      />
    </>
  );
};

export default BudgetPageModals;

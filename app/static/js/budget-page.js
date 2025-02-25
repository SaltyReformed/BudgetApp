// app/static/js/budget-page.js

document.addEventListener('DOMContentLoaded', function () {
    /**
     * Debug functionality
     */
    function setupDebugMode() {
        // Debug mode toggle
        const debugToggle = document.getElementById('toggle-debug-mode');
        const debugInfo = document.getElementById('debug-info');
        
        if (debugToggle && debugInfo) {
            debugToggle.addEventListener('click', function () {
                debugInfo.classList.toggle('hidden');
            });
        }

        // Raw data view toggle
        const viewRawDataBtn = document.getElementById('view-raw-data');
        const rawDataContainer = document.getElementById('raw-data-container');
        
        if (viewRawDataBtn && rawDataContainer) {
            viewRawDataBtn.addEventListener('click', function () {
                rawDataContainer.classList.toggle('hidden');

                if (!rawDataContainer.classList.contains('hidden')) {
                    try {
                        const rawData = {
                            periods: window.periodsWithDates,
                            expenses: window.expensesData
                        };
                        document.getElementById('raw-data').textContent = JSON.stringify(rawData, null, 2);
                    } catch (error) {
                        document.getElementById('raw-data').textContent = 'Error generating raw data: ' + error.message;
                    }
                }
            });
        }
    }

    /**
     * React component loader
     */
    async function mountDetailedExpenseTable() {
        try {
            console.log("Mounting expense table with data:", {
                periods: window.periodsWithDates,
                expenses: window.expensesData
            });

            // Use globally available React instead of imports
            const createElement = React.createElement;
            // Check if we have the new createRoot API (React 18+) or need to use the legacy render
            const createRoot = ReactDOM.createRoot || 
                ((domNode) => ({ 
                    render: (component) => ReactDOM.render(component, domNode) 
                }));
            let DetailedExpenseTable;
            try {
                // Try modern import first
                const module = await import('/static/js/components/detailed-expense-table.js');
                DetailedExpenseTable = module.default;
            } catch (importError) {
                console.error('Error with module import:', importError);
                // Fallback to a script tag approach for older browsers
                DetailedExpenseTable = window.DetailedExpenseTable;
                if (!DetailedExpenseTable) {
                    throw new Error('Could not load DetailedExpenseTable component. Make sure it is properly exported.');
                }
            }

            const domNode = document.getElementById('detailed-expense-table');
            if (domNode) {
                try {
                    // Create a simple placeholder component for testing
                    const SimpleTable = (props) => {
                        return React.createElement('div', { className: 'p-4 bg-white border rounded' },
                            React.createElement('h3', { className: 'font-bold mb-2' }, 'Expenses Summary'),
                            React.createElement('p', null, `Found ${props.expenses.length} expenses across ${props.periods.length} periods.`),
                            React.createElement('ul', { className: 'mt-4 space-y-2' },
                                props.periods.map(period => 
                                    React.createElement('li', { key: period.id, className: 'flex justify-between border-b pb-1' },
                                        React.createElement('span', null, period.date),
                                        React.createElement('span', null, '
        } catch (error) {
            console.error('Error loading expense table component:', error);

            const errorMessage =
                `<div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
                    <p>Error loading expense table component: ${error.message}</p>
                    <pre class="mt-2 text-xs overflow-auto">${error.stack}</pre>
                 </div>`;

            const container = document.getElementById('detailed-expense-table');
            if (container) {
                container.innerHTML = errorMessage;
            }
        }
    }

    /**
     * Modal functionality
     */
    function setupModals() {
        // Create modal overlay
        const createModalOverlay = () => {
            const overlay = document.createElement('div');
            overlay.id = 'modal-overlay';
            overlay.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 hidden';
            document.body.appendChild(overlay);
            return overlay;
        };

        // Create the modal container
        const createModalContainer = () => {
            const container = document.createElement('div');
            container.id = 'modal-container';
            container.className = 'bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto';
            return container;
        };

        // Create a modal
        const createModal = (id, title) => {
            const modal = document.createElement('div');
            modal.id = id;
            modal.className = 'hidden';

            // Modal header
            const header = document.createElement('div');
            header.className = 'flex justify-between items-center mb-4';

            const titleEl = document.createElement('h3');
            titleEl.className = 'text-xl font-bold';
            titleEl.textContent = title;

            const closeBtn = document.createElement('button');
            closeBtn.className = 'text-gray-500 hover:text-gray-700 text-xl font-bold';
            closeBtn.textContent = '×';
            closeBtn.addEventListener('click', () => {
                hideModal(id);
            });

            header.appendChild(titleEl);
            header.appendChild(closeBtn);
            modal.appendChild(header);

            return modal;
        };

        // Show a modal
        const showModal = (id) => {
            const overlay = document.getElementById('modal-overlay');
            const modal = document.getElementById(id);

            if (overlay && modal) {
                overlay.classList.remove('hidden');
                modal.classList.remove('hidden');

                // Hide all other modals
                document.querySelectorAll('#modal-container > div').forEach(m => {
                    if (m.id !== id) {
                        m.classList.add('hidden');
                    }
                });
            }
        };

        // Hide a modal
        const hideModal = (id) => {
            const overlay = document.getElementById('modal-overlay');
            const modal = document.getElementById(id);

            if (overlay && modal) {
                overlay.classList.add('hidden');
                modal.classList.add('hidden');
            }
        };

        // Setup modals
        const overlay = createModalOverlay();
        const container = createModalContainer();
        overlay.appendChild(container);

        // Create income modal with iframe
        const createIncomeIframe = () => {
            const modal = createModal('income-modal', 'Add One-Time Income');

            const iframe = document.createElement('iframe');
            iframe.src = '/api/income/add?modal=true';
            iframe.className = 'w-full h-96 border-0';
            iframe.style.height = '450px'; // Fixed height
            // Enable scrolling in the iframe to ensure all content is accessible
            iframe.scrolling = 'yes';
            iframe.onload = function () {
                try {
                    // Try to access iframe content (may fail due to same-origin policy)
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

                    // Check if we got redirected (usually after form submission)
                    if (iframeDoc.URL.indexOf('/api/income/add') === -1) {
                        // Redirect to the main page or reload
                        window.location.reload();
                    }
                } catch (e) {
                    console.log("Cannot access iframe content due to same-origin policy");
                }
            };

            modal.appendChild(iframe);
            container.appendChild(modal);
        };

        // Create paycheck modal with iframe
        const createPaycheckIframe = () => {
            const modal = createModal('paycheck-modal', 'Add Paycheck');

            // Create a div to hold the iframe
            const iframeContainer = document.createElement('div');
            iframeContainer.className = 'overflow-hidden rounded';

            const iframe = document.createElement('iframe');
            iframe.src = '/paycheck/add';
            iframe.className = 'w-full border-0';
            iframe.style.height = '500px'; // Fixed height

            // Remove scrolling from the iframe
            iframe.scrolling = 'yes';

            // Add custom styling to adjust the view inside the iframe
            iframe.onload = function () {
                try {
                    // Try to access iframe content
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

                    // Check if we got redirected (usually after form submission)
                    if (iframeDoc.URL.indexOf('/paycheck/add') === -1) {
                        window.location.reload();
                        return;
                    }

                    // Add custom CSS to the iframe content to hide the header/footer
                    const style = iframeDoc.createElement('style');
                    style.textContent = `
                    body { 
                        padding: 0 !important; 
                        margin: 0 !important;
                        background: transparent !important;
                    }
                    .py-6, .px-6, .px-8 { padding: 0 !important; }
                    .max-w-2xl { max-width: none !important; }
                    .mx-auto { margin: 0 !important; }
                    .shadow-sm { box-shadow: none !important; }
                    .rounded-lg { border-radius: 0 !important; }
                    .bg-white { background: transparent !important; }
                    nav, h1 { display: none !important; }
                    a[href="/dashboard"] { display: none !important; }
                `;
                    iframeDoc.head.appendChild(style);
                } catch (e) {
                    console.log("Cannot access iframe content due to same-origin policy");
                }
            };

            iframeContainer.appendChild(iframe);
            modal.appendChild(iframeContainer);
            container.appendChild(modal);
        };

        // Create expense modal with iframe
        const createExpenseIframe = () => {
            const modal = createModal('expense-modal', 'Add Expense');

            // Create a div to hold the iframe
            const iframeContainer = document.createElement('div');
            iframeContainer.className = 'overflow-hidden rounded max-h-[80vh] overflow-y-auto'; // Added max height and scrolling

            const iframe = document.createElement('iframe');
            iframe.src = '/expense/add';
            iframe.className = 'w-full border-0';
            iframe.style.height = '700px'; // Increased height from 550px to 700px

            // Remove scrolling from the iframe
            iframe.scrolling = 'yes';

            // Add custom styling to adjust the view inside the iframe
            iframe.onload = function () {
                try {
                    // Try to access iframe content
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

                    // Check if we got redirected (usually after form submission)
                    if (iframeDoc.URL.indexOf('/expense/add') === -1) {
                        window.location.reload();
                        return;
                    }

                    // Add custom CSS to the iframe content to hide the header/footer
                    const style = iframeDoc.createElement('style');
                    style.textContent = `
                    body { 
                        padding: 0 !important; 
                        margin: 0 !important;
                        background: transparent !important;
                    }
                    .py-6, .px-6, .px-8 { padding: 0 !important; }
                    .max-w-2xl { max-width: none !important; }
                    .mx-auto { margin: 0 !important; }
                    .shadow-sm { box-shadow: none !important; }
                    .rounded-lg { border-radius: 0 !important; }
                    .bg-white { background: transparent !important; }
                    nav, h1 { display: none !important; }
                    a[href="/dashboard"] { display: none !important; }
                `;
                    iframeDoc.head.appendChild(style);
                } catch (e) {
                    console.log("Cannot access iframe content due to same-origin policy");
                }
            };

            iframeContainer.appendChild(iframe);
            modal.appendChild(iframeContainer);
            container.appendChild(modal);
        };

        // Create all modals
        createIncomeIframe();
        createPaycheckIframe();
        createExpenseIframe();

        // Add event listeners to buttons
        const setupButtonListeners = () => {
            // Find all links to the add pages
            document.querySelectorAll('a').forEach(link => {
                const href = link.getAttribute('href');
                if (!href) return;

                if (href === '/api/income/add') {
                    link.addEventListener('click', function (e) {
                        e.preventDefault();
                        showModal('income-modal');
                    });
                } else if (href === '/paycheck/add') {
                    link.addEventListener('click', function (e) {
                        e.preventDefault();
                        showModal('paycheck-modal');
                    });
                } else if (href === '/expense/add') {
                    link.addEventListener('click', function (e) {
                        e.preventDefault();
                        showModal('expense-modal');
                    });
                }
            });
        };

        setupButtonListeners();

        // Allow clicking outside to close
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) {
                overlay.classList.add('hidden');
                document.querySelectorAll('#modal-container > div').forEach(modal => {
                    modal.classList.add('hidden');
                });
            }
        });

        // Export modal functions to window for potential external use
        window.budgetPageModals = {
            showModal,
            hideModal
        };
    }

    // Initialize everything
    console.log("Budget page script initializing...");
    console.log("- React available:", typeof React !== 'undefined');
    console.log("- ReactDOM available:", typeof ReactDOM !== 'undefined');
    console.log("- periodsWithDates:", window.periodsWithDates ? 
        `${window.periodsWithDates.length} periods` : 'missing');
    console.log("- expensesData:", window.expensesData ? 
        `${window.expensesData.length} expenses` : 'missing');

    setupDebugMode();
    mountDetailedExpenseTable();
    setupModals();
});
 + props.expenses
                                            .filter(e => {
                                                const expDate = new Date(e.date);
                                                const startDate = new Date(period.start_date);
                                                const endDate = new Date(period.end_date);
                                                return expDate >= startDate && expDate <= endDate;
                                            })
                                            .reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0)
                                            .toFixed(2)
                                        )
                                    )
                                )
                            )
                        );
                    };

                    // Try first with our custom component, then fall back to the simple one if needed
                    let ComponentToUse = DetailedExpenseTable;
                    if (!ComponentToUse) {
                        console.warn('Using simple table fallback');
                        ComponentToUse = SimpleTable;
                    }

                    // If using createRoot (React 18+)
                    if (typeof ReactDOM.createRoot === 'function') {
                        const root = ReactDOM.createRoot(domNode);
                        root.render(React.createElement(ComponentToUse, {
                            periods: window.periodsWithDates || [],
                            expenses: window.expensesData || []
                        }));
                    } else {
                        // Legacy React rendering (React 17 and earlier)
                        ReactDOM.render(
                            React.createElement(ComponentToUse, {
                                periods: window.periodsWithDates || [],
                                expenses: window.expensesData || []
                            }),
                            domNode
                        );
                    }
                    console.log('Component rendered successfully');
                } catch (renderError) {
                    console.error('Error rendering component:', renderError);
                    domNode.innerHTML = `
                        <div class="p-4 bg-red-100 border-l-4 border-red-500 text-red-700">
                            <h3 class="font-bold">Error Rendering Expense Table</h3>
                            <p class="mt-2">${renderError.message}</p>
                            <pre class="mt-4 bg-white p-2 rounded text-xs overflow-auto max-h-[200px]">${renderError.stack || 'No stack trace available'}</pre>
                        </div>
                    `;
                }
            } else {
                console.error("Could not find mount point #detailed-expense-table");
            }
        } catch (error) {
            console.error('Error loading expense table component:', error);

            const errorMessage =
                `<div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
                    <p>Error loading expense table component: ${error.message}</p>
                    <pre class="mt-2 text-xs overflow-auto">${error.stack}</pre>
                 </div>`;

            const container = document.getElementById('detailed-expense-table');
            if (container) {
                container.innerHTML = errorMessage;
            }
        }
    }

    /**
     * Modal functionality
     */
    function setupModals() {
        // Create modal overlay
        const createModalOverlay = () => {
            const overlay = document.createElement('div');
            overlay.id = 'modal-overlay';
            overlay.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 hidden';
            document.body.appendChild(overlay);
            return overlay;
        };

        // Create the modal container
        const createModalContainer = () => {
            const container = document.createElement('div');
            container.id = 'modal-container';
            container.className = 'bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto';
            return container;
        };

        // Create a modal
        const createModal = (id, title) => {
            const modal = document.createElement('div');
            modal.id = id;
            modal.className = 'hidden';

            // Modal header
            const header = document.createElement('div');
            header.className = 'flex justify-between items-center mb-4';

            const titleEl = document.createElement('h3');
            titleEl.className = 'text-xl font-bold';
            titleEl.textContent = title;

            const closeBtn = document.createElement('button');
            closeBtn.className = 'text-gray-500 hover:text-gray-700 text-xl font-bold';
            closeBtn.textContent = '×';
            closeBtn.addEventListener('click', () => {
                hideModal(id);
            });

            header.appendChild(titleEl);
            header.appendChild(closeBtn);
            modal.appendChild(header);

            return modal;
        };

        // Show a modal
        const showModal = (id) => {
            const overlay = document.getElementById('modal-overlay');
            const modal = document.getElementById(id);

            if (overlay && modal) {
                overlay.classList.remove('hidden');
                modal.classList.remove('hidden');

                // Hide all other modals
                document.querySelectorAll('#modal-container > div').forEach(m => {
                    if (m.id !== id) {
                        m.classList.add('hidden');
                    }
                });
            }
        };

        // Hide a modal
        const hideModal = (id) => {
            const overlay = document.getElementById('modal-overlay');
            const modal = document.getElementById(id);

            if (overlay && modal) {
                overlay.classList.add('hidden');
                modal.classList.add('hidden');
            }
        };

        // Setup modals
        const overlay = createModalOverlay();
        const container = createModalContainer();
        overlay.appendChild(container);

        // Create income modal with iframe
        const createIncomeIframe = () => {
            const modal = createModal('income-modal', 'Add One-Time Income');

            const iframe = document.createElement('iframe');
            iframe.src = '/api/income/add?modal=true';
            iframe.className = 'w-full h-96 border-0';
            iframe.style.height = '450px'; // Fixed height
            // Enable scrolling in the iframe to ensure all content is accessible
            iframe.scrolling = 'yes';
            iframe.onload = function () {
                try {
                    // Try to access iframe content (may fail due to same-origin policy)
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

                    // Check if we got redirected (usually after form submission)
                    if (iframeDoc.URL.indexOf('/api/income/add') === -1) {
                        // Redirect to the main page or reload
                        window.location.reload();
                    }
                } catch (e) {
                    console.log("Cannot access iframe content due to same-origin policy");
                }
            };

            modal.appendChild(iframe);
            container.appendChild(modal);
        };

        // Create paycheck modal with iframe
        const createPaycheckIframe = () => {
            const modal = createModal('paycheck-modal', 'Add Paycheck');

            // Create a div to hold the iframe
            const iframeContainer = document.createElement('div');
            iframeContainer.className = 'overflow-hidden rounded';

            const iframe = document.createElement('iframe');
            iframe.src = '/paycheck/add';
            iframe.className = 'w-full border-0';
            iframe.style.height = '500px'; // Fixed height

            // Remove scrolling from the iframe
            iframe.scrolling = 'yes';

            // Add custom styling to adjust the view inside the iframe
            iframe.onload = function () {
                try {
                    // Try to access iframe content
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

                    // Check if we got redirected (usually after form submission)
                    if (iframeDoc.URL.indexOf('/paycheck/add') === -1) {
                        window.location.reload();
                        return;
                    }

                    // Add custom CSS to the iframe content to hide the header/footer
                    const style = iframeDoc.createElement('style');
                    style.textContent = `
                    body { 
                        padding: 0 !important; 
                        margin: 0 !important;
                        background: transparent !important;
                    }
                    .py-6, .px-6, .px-8 { padding: 0 !important; }
                    .max-w-2xl { max-width: none !important; }
                    .mx-auto { margin: 0 !important; }
                    .shadow-sm { box-shadow: none !important; }
                    .rounded-lg { border-radius: 0 !important; }
                    .bg-white { background: transparent !important; }
                    nav, h1 { display: none !important; }
                    a[href="/dashboard"] { display: none !important; }
                `;
                    iframeDoc.head.appendChild(style);
                } catch (e) {
                    console.log("Cannot access iframe content due to same-origin policy");
                }
            };

            iframeContainer.appendChild(iframe);
            modal.appendChild(iframeContainer);
            container.appendChild(modal);
        };

        // Create expense modal with iframe
        const createExpenseIframe = () => {
            const modal = createModal('expense-modal', 'Add Expense');

            // Create a div to hold the iframe
            const iframeContainer = document.createElement('div');
            iframeContainer.className = 'overflow-hidden rounded max-h-[80vh] overflow-y-auto'; // Added max height and scrolling

            const iframe = document.createElement('iframe');
            iframe.src = '/expense/add';
            iframe.className = 'w-full border-0';
            iframe.style.height = '700px'; // Increased height from 550px to 700px

            // Remove scrolling from the iframe
            iframe.scrolling = 'yes';

            // Add custom styling to adjust the view inside the iframe
            iframe.onload = function () {
                try {
                    // Try to access iframe content
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

                    // Check if we got redirected (usually after form submission)
                    if (iframeDoc.URL.indexOf('/expense/add') === -1) {
                        window.location.reload();
                        return;
                    }

                    // Add custom CSS to the iframe content to hide the header/footer
                    const style = iframeDoc.createElement('style');
                    style.textContent = `
                    body { 
                        padding: 0 !important; 
                        margin: 0 !important;
                        background: transparent !important;
                    }
                    .py-6, .px-6, .px-8 { padding: 0 !important; }
                    .max-w-2xl { max-width: none !important; }
                    .mx-auto { margin: 0 !important; }
                    .shadow-sm { box-shadow: none !important; }
                    .rounded-lg { border-radius: 0 !important; }
                    .bg-white { background: transparent !important; }
                    nav, h1 { display: none !important; }
                    a[href="/dashboard"] { display: none !important; }
                `;
                    iframeDoc.head.appendChild(style);
                } catch (e) {
                    console.log("Cannot access iframe content due to same-origin policy");
                }
            };

            iframeContainer.appendChild(iframe);
            modal.appendChild(iframeContainer);
            container.appendChild(modal);
        };

        // Create all modals
        createIncomeIframe();
        createPaycheckIframe();
        createExpenseIframe();

        // Add event listeners to buttons
        const setupButtonListeners = () => {
            // Find all links to the add pages
            document.querySelectorAll('a').forEach(link => {
                const href = link.getAttribute('href');
                if (!href) return;

                if (href === '/api/income/add') {
                    link.addEventListener('click', function (e) {
                        e.preventDefault();
                        showModal('income-modal');
                    });
                } else if (href === '/paycheck/add') {
                    link.addEventListener('click', function (e) {
                        e.preventDefault();
                        showModal('paycheck-modal');
                    });
                } else if (href === '/expense/add') {
                    link.addEventListener('click', function (e) {
                        e.preventDefault();
                        showModal('expense-modal');
                    });
                }
            });
        };

        setupButtonListeners();

        // Allow clicking outside to close
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) {
                overlay.classList.add('hidden');
                document.querySelectorAll('#modal-container > div').forEach(modal => {
                    modal.classList.add('hidden');
                });
            }
        });

        // Export modal functions to window for potential external use
        window.budgetPageModals = {
            showModal,
            hideModal
        };
    }

    // Initialize everything
    setupDebugMode();
    mountDetailedExpenseTable();
    setupModals();
});
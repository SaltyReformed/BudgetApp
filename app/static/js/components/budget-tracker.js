// app/static/js/components/budget-tracker.js

// Import the modal component
const AddIncomeModal = async () => {
    const module = await import('./add-income-modal.js');
    return module.default;
};

const BudgetTracker = (props) => {
    // State for modals
    const [isAddIncomeModalOpen, setIsAddIncomeModalOpen] = React.useState(false);
    const [AddIncomeModalComponent, setAddIncomeModalComponent] = React.useState(null);

    // Load the modal component when needed
    React.useEffect(() => {
        if (isAddIncomeModalOpen && !AddIncomeModalComponent) {
            AddIncomeModal().then(component => {
                setAddIncomeModalComponent(component);
            });
        }
    }, [isAddIncomeModalOpen, AddIncomeModalComponent]);
    console.log('BudgetTracker props:', props);
    
    // Safely access the properties with defaults
    const periods = props?.periods || [];
    const summary = props?.summary || {
        totalIncome: 0,
        totalExpenses: 0,
        net: 0,
        projectedBalance: 0
    };
    
    // Format currency function
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    // Income categories
    const incomeCategories = [
        { id: 'salary', name: 'Salary' },
        { id: 'phoneStipend', name: 'Phone Stipend' },
        { id: 'otherIncome', name: 'Other Income' },
        { id: 'taxReturn', name: 'Tax Return' },
        { id: 'transfer', name: 'Transfer from Savings' }
    ];
    
    // Expense categories with their items
    const expenseCategories = [
        { 
            id: 'housing', 
            name: 'Housing', 
            items: ['Rent', 'Utilities', 'Internet'] 
        },
        { 
            id: 'transportation', 
            name: 'Transportation', 
            items: ['Car Payment', 'Gas', 'Insurance'] 
        },
        { 
            id: 'food', 
            name: 'Food', 
            items: ['Groceries', 'Dining Out'] 
        },
        { 
            id: 'healthcare', 
            name: 'Healthcare', 
            items: ['Insurance', 'Medications'] 
        }
    ];

    // Create the summary card
    const summaryCard = React.createElement('div', { className: 'bg-white rounded-lg shadow p-6 mb-6' },
        React.createElement('h2', { className: 'text-xl font-bold mb-4' }, 'Budget Summary'),
        React.createElement('div', { className: 'divide-y' },
            React.createElement('div', { className: 'flex justify-between py-2' },
                React.createElement('span', { className: 'font-medium' }, 'Total Income'),
                React.createElement('span', { className: 'text-green-600' }, formatCurrency(summary.totalIncome))
            ),
            React.createElement('div', { className: 'flex justify-between py-2' },
                React.createElement('span', { className: 'font-medium' }, 'Total Expenses'),
                React.createElement('span', { className: 'text-red-600' }, formatCurrency(summary.totalExpenses))
            ),
            React.createElement('div', { className: 'flex justify-between py-2' },
                React.createElement('span', { className: 'font-medium' }, 'Net'),
                React.createElement('span', { className: 'font-bold' }, formatCurrency(summary.net))
            ),
            React.createElement('div', { className: 'flex justify-between py-2' },
                React.createElement('span', { className: 'font-medium' }, 'Projected End Balance'),
                React.createElement('span', { className: 'font-bold' }, formatCurrency(summary.projectedBalance))
            )
        )
    );

    // Create the income card
    const incomeCard = React.createElement('div', { className: 'bg-white rounded-lg shadow p-6 mb-6' },
        React.createElement('div', { className: 'flex justify-between items-center mb-4' },
            React.createElement('h2', { className: 'text-xl font-bold' }, 'Income'),
            React.createElement('button', { 
                className: 'text-blue-600 hover:text-blue-800',
                onClick: () => setIsAddIncomeModalOpen(true)
            }, 'Add Income')
        ),
        React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full' },
                React.createElement('thead', null,
                    React.createElement('tr', { className: 'bg-gray-50 border-b' },
                        React.createElement('th', { className: 'text-left py-2 px-4' }, 'Source'),
                        periods.map(period => 
                            React.createElement('th', { key: period.id, className: 'text-right py-2 px-4' }, period.date)
                        )
                    )
                ),
                React.createElement('tbody', null,
                    incomeCategories.map(category => 
                        React.createElement('tr', { key: category.id, className: 'border-b' },
                            React.createElement('td', { className: 'py-2 px-4' }, category.name),
                            periods.map(period => 
                                React.createElement('td', { key: `${category.id}-${period.id}`, className: 'text-right py-2 px-4' }, 
                                    formatCurrency(0)
                                )
                            )
                        )
                    ),
                    React.createElement('tr', { className: 'bg-gray-50 font-bold' },
                        React.createElement('td', { className: 'py-2 px-4' }, 'Total'),
                        periods.map(period => 
                            React.createElement('td', { key: `total-${period.id}`, className: 'text-right py-2 px-4' }, 
                                formatCurrency(0)
                            )
                        )
                    )
                )
            )
        )
    );

    // Create the expenses card
    const expensesCard = React.createElement('div', { className: 'bg-white rounded-lg shadow p-6' },
        React.createElement('div', { className: 'flex justify-between items-center mb-4' },
            React.createElement('h2', { className: 'text-xl font-bold' }, 'Expenses'),
            React.createElement('button', { className: 'text-blue-600 hover:text-blue-800' }, 'Add Expense')
        ),
        React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full' },
                React.createElement('thead', null,
                    React.createElement('tr', { className: 'bg-gray-50 border-b' },
                        React.createElement('th', { className: 'text-left py-2 px-4' }, 'Category'),
                        periods.map(period => 
                            React.createElement('th', { key: period.id, className: 'text-right py-2 px-4' }, period.date)
                        )
                    )
                ),
                React.createElement('tbody', null,
                    expenseCategories.map(category => [
                        // Category header row
                        React.createElement('tr', { key: category.id, className: 'bg-gray-50' },
                            React.createElement('td', { className: 'py-2 px-4 font-medium' }, category.name),
                            periods.map(period => 
                                React.createElement('td', { key: `${category.id}-${period.id}`, className: 'text-right py-2 px-4' }, 
                                    formatCurrency(0)
                                )
                            )
                        ),
                        // Item rows for this category
                        ...category.items.map(item => 
                            React.createElement('tr', { key: `${category.id}-${item}`, className: 'border-b' },
                                React.createElement('td', { className: 'py-2 px-4 pl-8' }, item),
                                periods.map(period => 
                                    React.createElement('td', { key: `${category.id}-${item}-${period.id}`, className: 'text-right py-2 px-4' }, 
                                        formatCurrency(0)
                                    )
                                )
                            )
                        )
                    ]).flat(),
                    // Total row
                    React.createElement('tr', { className: 'bg-gray-50 font-bold' },
                        React.createElement('td', { className: 'py-2 px-4' }, 'Total Expenses'),
                        periods.map(period => 
                            React.createElement('td', { key: `total-expense-${period.id}`, className: 'text-right py-2 px-4' }, 
                                formatCurrency(0)
                            )
                        )
                    )
                )
            )
        )
    );

    // Handle saving income
    const handleSaveIncome = async (incomeData) => {
        try {
            // Make API request to save income
            const response = await fetch('/api/income', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(incomeData)
            });
            
            if (!response.ok) {
                throw new Error('Failed to save income');
            }
            
            // Close modal and reload page to see new data
            setIsAddIncomeModalOpen(false);
            window.location.reload();
        } catch (error) {
            console.error('Error saving income:', error);
            alert('Failed to save income. Please try again.');
        }
    };

    // Return the complete component
    return React.createElement(React.Fragment, null,
        React.createElement('div', { className: 'space-y-6' },
            summaryCard,
            incomeCard,
            expensesCard
        ),
        
        // Render the Add Income Modal if it's loaded and open
        isAddIncomeModalOpen && AddIncomeModalComponent && 
        React.createElement(AddIncomeModalComponent, {
            isOpen: isAddIncomeModalOpen,
            onClose: () => setIsAddIncomeModalOpen(false),
            onSave: handleSaveIncome,
            periods: periods
        })
    );
};

// Export the component
export default BudgetTracker;
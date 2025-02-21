// app/static/js/components/budget-tracker.js

// Import the modal component
const AddIncomeModal = async () => {
    const module = await import('./add-income-modal.js');
    return module.default;
};

const BudgetTracker = (props) => {
    console.log('BudgetTracker component rendering with props:', props);
    
    // State for modals
    const [isAddIncomeModalOpen, setIsAddIncomeModalOpen] = React.useState(false);
    const [AddIncomeModalComponent, setAddIncomeModalComponent] = React.useState(null);
    
    // State for active period (for adding income to a specific period)
    const [activePeriod, setActivePeriod] = React.useState(null);

    // Load the modal component when needed
    React.useEffect(() => {
        if (isAddIncomeModalOpen && !AddIncomeModalComponent) {
            AddIncomeModal().then(component => {
                setAddIncomeModalComponent(component);
            });
        }
    }, [isAddIncomeModalOpen, AddIncomeModalComponent]);
    
    // Safely access the properties with defaults
    const periods = props?.periods || [];
    const summary = props?.summary || {
        totalIncome: 0,
        totalExpenses: 0,
        net: 0,
        projectedBalance: 0
    };
    const periodData = props?.periodData || {};
    const paychecks = props?.paychecks || [];
    
    console.log('Extracted data from props:');
    console.log('- periods:', periods);
    console.log('- periodData:', periodData);
    console.log('- paychecks:', paychecks);
    
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

    // Handle opening the income modal for a specific period
    const handleAddIncome = (periodId) => {
        console.log('Opening income modal for period:', periodId);
        setActivePeriod(periodId);
        setIsAddIncomeModalOpen(true);
    };

    // Create the income card
    const incomeCard = React.createElement('div', { className: 'bg-white rounded-lg shadow p-6 mb-6' },
        React.createElement('div', { className: 'flex justify-between items-center mb-4' },
            React.createElement('h2', { className: 'text-xl font-bold' }, 'Income'),
            React.createElement('div', { className: 'flex space-x-2' },
                React.createElement('button', { 
                    className: 'px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700',
                    onClick: () => {
                        console.log('Add one-time income button clicked');
                        setIsAddIncomeModalOpen(true);
                    }
                }, 'Add One-Time Income'),
                React.createElement('a', { 
                    href: '/paycheck/add',
                    className: 'px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700'
                }, 'Add Paycheck')
            )
        ),
        React.createElement('div', { className: 'overflow-x-auto' },
            React.createElement('table', { className: 'min-w-full' },
                React.createElement('thead', null,
                    React.createElement('tr', { className: 'bg-gray-50 border-b' },
                        React.createElement('th', { className: 'text-left py-2 px-4' }, 'Source'),
                        periods.map(period => 
                            React.createElement('th', { key: period.id, className: 'text-right py-2 px-4' }, 
                                React.createElement('div', { className: 'flex flex-col items-end' }, 
                                    React.createElement('span', {}, period.date),
                                    React.createElement('button', {
                                        className: 'text-xs text-blue-600 hover:text-blue-800',
                                        onClick: () => handleAddIncome(period.id)
                                    }, '+ Add')
                                )
                            )
                        )
                    )
                ),
                React.createElement('tbody', null,
                    incomeCategories.map(category => {
                        console.log(`Rendering income category: ${category.id}`);
                        return React.createElement('tr', { key: category.id, className: 'border-b hover:bg-gray-50' },
                            React.createElement('td', { className: 'py-2 px-4' }, category.name),
                            periods.map(period => {
                                const amount = periodData[period.id]?.income?.[category.id] || 0;
                                console.log(`Period ${period.id}, category ${category.id}: ${amount}`);
                                return React.createElement('td', { 
                                    key: `${category.id}-${period.id}`, 
                                    className: 'text-right py-2 px-4'
                                }, 
                                    formatCurrency(amount)
                                );
                            })
                        );
                    }),
                    React.createElement('tr', { className: 'bg-gray-50 font-bold' },
                        React.createElement('td', { className: 'py-2 px-4' }, 'Total'),
                        periods.map(period => {
                            const total = periodData[period.id]?.income?.total || 0;
                            console.log(`Period ${period.id} total: ${total}`);
                            return React.createElement('td', { 
                                key: `total-${period.id}`, 
                                className: 'text-right py-2 px-4 text-green-600'
                            }, 
                                formatCurrency(total)
                            );
                        })
                    )
                )
            )
        )
    );

    // Create Recent Paychecks card
    const recentPaychecksCard = React.createElement('div', { className: 'bg-white rounded-lg shadow p-6 mb-6' },
        React.createElement('div', { className: 'flex justify-between items-center mb-4' },
            React.createElement('h2', { className: 'text-xl font-bold' }, 'Recent Paychecks'),
            React.createElement('a', { 
                href: '/salary/manage-paychecks',
                className: 'text-blue-600 hover:text-blue-800'
            }, 'View All')
        ),
        React.createElement('div', { className: 'overflow-x-auto' },
            paychecks.length === 0 ? 
            React.createElement('p', { className: 'text-gray-500 text-center py-4' }, 'No paychecks found.') :
            React.createElement('table', { className: 'min-w-full' },
                React.createElement('thead', null,
                    React.createElement('tr', { className: 'bg-gray-50 border-b' },
                        React.createElement('th', { className: 'text-left py-2 px-4' }, 'Date'),
                        React.createElement('th', { className: 'text-left py-2 px-4' }, 'Type'),
                        React.createElement('th', { className: 'text-right py-2 px-4' }, 'Gross'),
                        React.createElement('th', { className: 'text-right py-2 px-4' }, 'Net')
                    )
                ),
                React.createElement('tbody', null,
                    paychecks.slice(0, 5).map(paycheck => {
                        console.log(`Rendering paycheck: ${paycheck.id} - ${paycheck.date}`);
                        return React.createElement('tr', { key: paycheck.id, className: 'border-b hover:bg-gray-50' },
                            React.createElement('td', { className: 'py-2 px-4' }, 
                                new Date(paycheck.date).toLocaleDateString()),
                            React.createElement('td', { className: 'py-2 px-4' }, paycheck.pay_type),
                            React.createElement('td', { className: 'py-2 px-4 text-right' }, 
                                formatCurrency(paycheck.gross_amount)),
                            React.createElement('td', { className: 'py-2 px-4 text-right text-green-600' }, 
                                formatCurrency(paycheck.net_amount))
                        );
                    })
                )
            )
        )
    );

    // Handle saving income
    const handleSaveIncome = async (incomeData) => {
        console.log('Saving income:', incomeData);
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
            
            const result = await response.json();
            console.log('Income saved successfully:', result);
            
            // Close modal and reload page to see new data
            setIsAddIncomeModalOpen(false);
            window.location.reload();
        } catch (error) {
            console.error('Error saving income:', error);
            alert('Failed to save income. Please try again.');
        }
    };

    // Return the complete component
    console.log('Rendering budget tracker with components');
    return React.createElement(React.Fragment, null,
        React.createElement('div', { className: 'space-y-6' },
            summaryCard,
            incomeCard,
            recentPaychecksCard
        ),
        
        // Render the Add Income Modal if it's loaded and open
        isAddIncomeModalOpen && AddIncomeModalComponent && 
        React.createElement(AddIncomeModalComponent, {
            isOpen: isAddIncomeModalOpen,
            onClose: () => setIsAddIncomeModalOpen(false),
            onSave: handleSaveIncome,
            periods: periods,
            activePeriod: activePeriod
        })
    );
};

// Export the component
export default BudgetTracker;
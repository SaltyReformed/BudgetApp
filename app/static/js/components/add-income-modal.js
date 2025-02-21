// app/static/js/components/add-income-modal.js

const AddIncomeModal = ({ isOpen, onClose, onSave, periods, activePeriod }) => {
  console.log('Rendering AddIncomeModal - isOpen:', isOpen, 'activePeriod:', activePeriod);
  
  if (!isOpen) return null;

  // Set default date to today
  const today = new Date().toISOString().split('T')[0];

  // Create a form with date selection, income type, and amount
  return React.createElement('div', {
    className: 'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50'
  }, 
    React.createElement('div', {
      className: 'bg-white rounded-lg shadow-lg p-6 w-full max-w-md'
    },
      // Header
      React.createElement('div', { className: 'flex justify-between items-center mb-4' },
        React.createElement('h3', { className: 'text-xl font-bold' }, 'Add Income'),
        React.createElement('button', { 
          onClick: onClose,
          className: 'text-gray-500 hover:text-gray-700 text-xl font-bold'
        }, '×')
      ),
      
      // Form
      React.createElement('form', {
        id: 'income-form',
        onSubmit: (e) => {
          e.preventDefault();
          console.log('Form submitted');
          const formData = new FormData(e.target);
          
          const incomeData = {
            date: formData.get('date'),
            income_type: formData.get('income_type'),
            amount: parseFloat(formData.get('amount')),
            description: formData.get('description') || ''
          };
          
          console.log('Income data to save:', incomeData);
          onSave(incomeData);
        },
        className: 'space-y-4'
      },
        // Period Selection (only if activePeriod is not set)
        !activePeriod && React.createElement('div', null,
          React.createElement('label', { 
            htmlFor: 'period',
            className: 'block text-sm font-medium text-gray-700 mb-1'
          }, 'Pay Period'),
          React.createElement('select', {
            name: 'period',
            id: 'period',
            className: 'mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md'
          },
            React.createElement('option', { value: '' }, 'Select a period (optional)'),
            periods.map(period => 
              React.createElement('option', { 
                key: period.id, 
                value: period.id,
                selected: activePeriod === period.id
              }, period.date)
            )
          )
        ),
        
        // Income Type Selection
        React.createElement('div', null,
          React.createElement('label', { 
            htmlFor: 'income_type',
            className: 'block text-sm font-medium text-gray-700 mb-1'
          }, 'Income Type'),
          React.createElement('select', {
            name: 'income_type',
            id: 'income_type',
            required: true,
            className: 'mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md'
          },
            React.createElement('option', { value: '' }, 'Select income type'),
            React.createElement('option', { value: 'salary' }, 'Salary'),
            React.createElement('option', { value: 'phoneStipend' }, 'Phone Stipend'),
            React.createElement('option', { value: 'otherIncome' }, 'Other Income'),
            React.createElement('option', { value: 'taxReturn' }, 'Tax Return'),
            React.createElement('option', { value: 'transfer' }, 'Transfer from Savings')
          )
        ),
        
        // Description Input
        React.createElement('div', null,
          React.createElement('label', { 
            htmlFor: 'description',
            className: 'block text-sm font-medium text-gray-700 mb-1'
          }, 'Description (optional)'),
          React.createElement('input', {
            type: 'text',
            name: 'description',
            id: 'description',
            placeholder: 'E.g., Bonus, Reimbursement, etc.',
            className: 'mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md'
          })
        ),
        
        // Date Input
        React.createElement('div', null,
          React.createElement('label', { 
            htmlFor: 'date',
            className: 'block text-sm font-medium text-gray-700 mb-1'
          }, 'Date'),
          React.createElement('input', {
            type: 'date',
            name: 'date',
            id: 'date',
            required: true,
            defaultValue: today,
            className: 'mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md'
          })
        ),
        
        // Amount Input
        React.createElement('div', null,
          React.createElement('label', { 
            htmlFor: 'amount',
            className: 'block text-sm font-medium text-gray-700 mb-1'
          }, 'Amount'),
          React.createElement('div', { className: 'mt-1 relative rounded-md shadow-sm' },
            React.createElement('div', { className: 'absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none' },
              React.createElement('span', { className: 'text-gray-500 sm:text-sm' }, '$')
            ),
            React.createElement('input', {
              type: 'number',
              name: 'amount',
              id: 'amount',
              step: '0.01',
              required: true,
              min: '0',
              placeholder: '0.00',
              className: 'focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md'
            })
          )
        ),
        
        // Form Buttons
        React.createElement('div', { className: 'flex justify-end space-x-3 mt-6' },
          React.createElement('button', {
            type: 'button',
            onClick: onClose,
            className: 'px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50'
          }, 'Cancel'),
          React.createElement('button', {
            type: 'submit',
            className: 'px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700'
          }, 'Save')
        )
      )
    )
  );
};

export default AddIncomeModal;
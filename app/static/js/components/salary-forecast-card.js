// app/static/js/components/salary-forecast-card.js

const SalaryForecastCard = ({ salaryData }) => {
  // Early return with loading state if data is not yet available
  if (!salaryData) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Salary Forecast</h3>
        <p className="text-gray-500">No current salary data available</p>
        <a href="/salary/forecast" className="mt-3 inline-block text-sm text-blue-600 hover:text-blue-800">
          Create a salary forecast
        </a>
      </div>
    );
  }

  // Format currency function
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Calculate upcoming pay dates
  const getUpcomingPayDates = () => {
    const today = new Date();
    const upcomingDates = [];
    let currentDate = new Date(today);
    
    // Find the next Friday (typical pay day)
    const daysUntilFriday = (5 - currentDate.getDay() + 7) % 7;
    currentDate.setDate(currentDate.getDate() + daysUntilFriday);
    
    // Get the next 3 biweekly paydays
    for (let i = 0; i < 3; i++) {
      upcomingDates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 14); // Add two weeks
    }
    
    return upcomingDates.map(date => ({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      payAmount: salaryData.biweeklyNet
    }));
  };

  const upcomingPaydays = getUpcomingPayDates();

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">Salary Forecast</h3>
        <a href="/salary/forecast" className="text-sm text-blue-600 hover:text-blue-800">
          View Details
        </a>
      </div>
      
      <div className="mb-4">
        <div className="flex justify-between mb-1">
          <span className="text-sm text-gray-500">Annual Gross</span>
          <span className="text-sm font-medium">{formatCurrency(salaryData.annualGross)}</span>
        </div>
        <div className="flex justify-between mb-1">
          <span className="text-sm text-gray-500">Annual Net</span>
          <span className="text-sm font-medium">{formatCurrency(salaryData.annualNet)}</span>
        </div>
        <div className="flex justify-between font-medium">
          <span className="text-sm text-gray-900">Biweekly Net</span>
          <span className="text-sm text-green-600">{formatCurrency(salaryData.biweeklyNet)}</span>
        </div>
      </div>
      
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-2">Upcoming Pay Dates</h4>
        <div className="space-y-2">
          {upcomingPaydays.map((payday, index) => (
            <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <span className="text-sm font-medium">{payday.date}</span>
              <span className="text-sm text-green-600">{formatCurrency(payday.payAmount)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SalaryForecastCard;
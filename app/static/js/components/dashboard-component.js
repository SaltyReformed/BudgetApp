// app/static/js/dashboard-component.js
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

const DashboardComponent = ({ paychecks = [], expenses = [], salaryData = null, SalaryForecastCard }) => {
  // Early return with loading state if data is not yet available
  if (!Array.isArray(paychecks) || !Array.isArray(expenses)) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-600">Loading financial data...</p>
      </div>
    );
  }

  // Handle empty data states
  if (paychecks.length === 0 && expenses.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-600">No financial data available yet. Start by adding your income and expenses.</p>
        <div className="mt-4 flex space-x-4 justify-center">
          <a href="/paycheck/add" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Add Paycheck
          </a>
          <a href="/expense/add" className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
            Add Expense
          </a>
          <a href="/budget" className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">
            Budget Tracker
          </a>
        </div>
      </div>
    );
  }

  // Process data for charts
  const payCheckData = paychecks.map(paycheck => ({
    date: new Date(paycheck.date).toLocaleDateString(),
    gross: paycheck.gross_amount,
    net: paycheck.net_amount,
    pay_type: paycheck.pay_type
  }));

  // Group paychecks by type for pie chart
  const payTypeGroups = payCheckData.reduce((groups, paycheck) => {
    const type = paycheck.pay_type;
    if (!groups[type]) {
      groups[type] = 0;
    }
    groups[type] += paycheck.net;
    return groups;
  }, {});

  const payTypePieData = Object.keys(payTypeGroups).map(type => ({
    name: type,
    value: payTypeGroups[type]
  }));

  const expenseData = expenses.map(expense => ({
    date: new Date(expense.date).toLocaleDateString(),
    amount: expense.amount,
    category: expense.category
  }));

  // Group expenses by category for pie chart
  const categoryGroups = expenseData.reduce((groups, expense) => {
    const category = expense.category;
    if (!groups[category]) {
      groups[category] = 0;
    }
    groups[category] += expense.amount;
    return groups;
  }, {});

  const categoryPieData = Object.keys(categoryGroups).map(category => ({
    name: category,
    value: categoryGroups[category]
  }));

  // Calculate totals
  const totalIncome = payCheckData.reduce((sum, p) => sum + p.net, 0);
  const totalExpenses = expenseData.reduce((sum, e) => sum + e.amount, 0);
  const netBalance = totalIncome - totalExpenses;

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Income Overview */}
      <div className="col-span-2">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Income Overview</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={payCheckData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Line type="monotone" dataKey="gross" stroke="#8884d8" name="Gross Income" />
                <Line type="monotone" dataKey="net" stroke="#82ca9d" name="Net Income" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Salary Forecast */}
      <div className="lg:col-span-1">
        {React.createElement(SalaryForecastCard, { salaryData })}
      </div>

      {/* Expense Breakdown */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Expenses</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expenseData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="amount" fill="#82ca9d" name="Expense Amount" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Financial Summary</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Income</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(totalIncome)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(totalExpenses)}
              </p>
            </div>
            <div className="pt-4 border-t">
              <p className="text-sm font-medium text-gray-500">Balance</p>
              <p className={`text-2xl font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(netBalance)}
              </p>
            </div>
            <div className="pt-4">
              <a href="/budget" className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800">
                View Budget Tracker
                <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="col-span-3">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
            <div className="flex space-x-2">
              <a href="/paycheck/add" className="text-sm text-blue-600 hover:text-blue-800">Add Income</a>
              <a href="/expense/add" className="text-sm text-blue-600 hover:text-blue-800">Add Expense</a>
            </div>
          </div>
          
          {/* Combine and sort recent activity */}
          {(() => {
            const combinedActivity = [
              ...payCheckData.map(p => ({
                date: new Date(p.date),
                type: 'income',
                amount: p.net,
                description: `${p.pay_type} Income`
              })),
              ...expenseData.map(e => ({
                date: new Date(e.date),
                type: 'expense',
                amount: e.amount,
                description: e.category
              }))
            ].sort((a, b) => b.date - a.date).slice(0, 10);

            return (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {combinedActivity.map((activity, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {activity.date.toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {activity.description}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${activity.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                          {activity.type === 'income' ? '+' : '-'} {formatCurrency(activity.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default DashboardComponent;
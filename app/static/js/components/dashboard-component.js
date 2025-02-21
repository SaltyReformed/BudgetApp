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
      </div>
    );
  }

  // Process data for charts
  const payCheckData = paychecks.map(paycheck => ({
    date: new Date(paycheck.date).toLocaleDateString(),
    gross: paycheck.gross_amount,
    net: paycheck.net_amount
  }));

  const expenseData = expenses.map(expense => ({
    date: new Date(expense.date).toLocaleDateString(),
    amount: expense.amount,
    category: expense.category
  }));

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
                <Tooltip />
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
                <Tooltip />
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
              <p className="text-2xl font-bold">
                ${payCheckData.reduce((sum, p) => sum + p.net, 0).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Expenses</p>
              <p className="text-2xl font-bold">
                ${expenseData.reduce((sum, e) => sum + e.amount, 0).toFixed(2)}
              </p>
            </div>
            <div className="pt-4 border-t">
              <p className="text-sm font-medium text-gray-500">Balance</p>
              <p className="text-2xl font-bold">
                ${(payCheckData.reduce((sum, p) => sum + p.net, 0) - expenseData.reduce((sum, e) => sum + e.amount, 0)).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardComponent;
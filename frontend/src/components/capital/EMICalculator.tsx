import React, { useState, useEffect } from 'react';
import { Calculator, TrendingUp, DollarSign } from 'lucide-react';

interface EMIResult {
  principal: number;
  annual_rate: number;
  tenure_months: number;
  monthly_emi: number;
  total_payment: number;
  total_interest: number;
}

export default function EMICalculator() {
  const [principal, setPrincipal] = useState<string>('500000');
  const [annualRate, setAnnualRate] = useState<string>('10.5');
  const [tenureMonths, setTenureMonths] = useState<string>('60');
  const [result, setResult] = useState<EMIResult | null>(null);

  useEffect(() => {
    calculateEMI();
  }, [principal, annualRate, tenureMonths]);

  const calculateEMI = () => {
    const p = parseFloat(principal) || 0;
    const r = parseFloat(annualRate) || 0;
    const t = parseInt(tenureMonths) || 0;

    if (p <= 0 || t <= 0) {
      setResult(null);
      return;
    }

    const monthlyRate = r / 12 / 100;
    let emi: number;

    if (r === 0) {
      emi = p / t;
    } else {
      emi = (p * monthlyRate * Math.pow(1 + monthlyRate, t)) / (Math.pow(1 + monthlyRate, t) - 1);
    }

    const totalPayment = emi * t;
    const totalInterest = totalPayment - p;

    setResult({
      principal: p,
      annual_rate: r,
      tenure_months: t,
      monthly_emi: Math.round(emi * 100) / 100,
      total_payment: Math.round(totalPayment * 100) / 100,
      total_interest: Math.round(totalInterest * 100) / 100,
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-2 mb-6">
        <Calculator className="w-6 h-6 text-indigo-600" />
        <h2 className="text-xl font-semibold text-gray-900">EMI Calculator</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Loan Amount (₹)
          </label>
          <input
            type="number"
            value={principal}
            onChange={(e) => setPrincipal(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="500000"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Interest Rate (% per annum)
          </label>
          <input
            type="number"
            step="0.1"
            value={annualRate}
            onChange={(e) => setAnnualRate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="10.5"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tenure (Months)
          </label>
          <input
            type="number"
            value={tenureMonths}
            onChange={(e) => setTenureMonths(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="60"
          />
        </div>
      </div>

      {result && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-indigo-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-indigo-600" />
              <span className="text-sm font-medium text-gray-600">Monthly EMI</span>
            </div>
            <p className="text-2xl font-bold text-indigo-600">
              {formatCurrency(result.monthly_emi)}
            </p>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-gray-600">Total Payment</span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(result.total_payment)}
            </p>
          </div>

          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-orange-600" />
              <span className="text-sm font-medium text-gray-600">Total Interest</span>
            </div>
            <p className="text-2xl font-bold text-orange-600">
              {formatCurrency(result.total_interest)}
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Breakdown</h3>
        {result && (
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Principal Amount:</span>
              <span className="font-medium">{formatCurrency(result.principal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Interest Rate:</span>
              <span className="font-medium">{result.annual_rate}% p.a.</span>
            </div>
            <div className="flex justify-between">
              <span>Loan Tenure:</span>
              <span className="font-medium">{result.tenure_months} months ({Math.round(result.tenure_months / 12)} years)</span>
            </div>
            <div className="flex justify-between border-t pt-2 mt-2">
              <span>Interest Percentage:</span>
              <span className="font-medium">
                {((result.total_interest / result.principal) * 100).toFixed(2)}%
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

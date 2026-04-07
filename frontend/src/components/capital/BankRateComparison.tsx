import React, { useState, useEffect } from 'react';
import { TrendingDown, Building2, Info } from 'lucide-react';
import { apiClient } from '../../lib/api';

interface BankRate {
  id: number;
  bank_name: string;
  loan_type: string;
  loan_type_display: string;
  min_interest_rate: string;
  max_interest_rate: string;
  processing_fee_percent: string;
  min_loan_amount: string;
  max_loan_amount: string;
  min_tenure_months: number;
  max_tenure_months: number;
  features: string[];
  is_active: boolean;
}

export default function BankRateComparison() {
  const [loanType, setLoanType] = useState<string>('personal');
  const [loanAmount, setLoanAmount] = useState<string>('500000');
  const [rates, setRates] = useState<BankRate[]>([]);
  const [loading, setLoading] = useState(false);

  const loanTypes = [
    { value: 'personal', label: 'Personal Loan' },
    { value: 'business', label: 'Business Loan' },
    { value: 'home', label: 'Home Loan' },
    { value: 'vehicle', label: 'Vehicle Loan' },
    { value: 'education', label: 'Education Loan' },
    { value: 'gold', label: 'Gold Loan' },
    { value: 'mortgage', label: 'Mortgage Loan' },
  ];

  useEffect(() => {
    fetchRates();
  }, [loanType, loanAmount]);

  const fetchRates = async () => {
    setLoading(true);
    try {
      const params: any = { loan_type: loanType };
      if (loanAmount && parseFloat(loanAmount) > 0) {
        params.loan_amount = loanAmount;
      }
      const response = await apiClient.get('/capital/bank-rates/compare_rates/', { params });
      setRates(response.data);
    } catch (error) {
      console.error('Error fetching bank rates:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(typeof amount === 'string' ? parseFloat(amount) : amount);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-2 mb-6">
        <TrendingDown className="w-6 h-6 text-green-600" />
        <h2 className="text-xl font-semibold text-gray-900">Compare Bank Interest Rates</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Loan Type
          </label>
          <select
            value={loanType}
            onChange={(e) => setLoanType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {loanTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Loan Amount (₹) - Optional
          </label>
          <input
            type="number"
            value={loanAmount}
            onChange={(e) => setLoanAmount(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="500000"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-2 text-gray-600">Loading rates...</p>
        </div>
      ) : rates.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Info className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p>No bank rates available for the selected criteria</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rates.map((rate) => (
            <div key={rate.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-semibold text-gray-900">{rate.bank_name}</h3>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-600">
                    {rate.min_interest_rate}% - {rate.max_interest_rate}%
                  </p>
                  <p className="text-xs text-gray-500">Interest Rate p.a.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                <div>
                  <p className="text-xs text-gray-500">Loan Amount Range</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatCurrency(rate.min_loan_amount)} - {formatCurrency(rate.max_loan_amount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Tenure Range</p>
                  <p className="text-sm font-medium text-gray-900">
                    {rate.min_tenure_months} - {rate.max_tenure_months} months
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Processing Fee</p>
                  <p className="text-sm font-medium text-gray-900">{rate.processing_fee_percent}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                    rate.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {rate.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              {rate.features && rate.features.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Features:</p>
                  <div className="flex flex-wrap gap-2">
                    {rate.features.map((feature, index) => (
                      <span
                        key={index}
                        className="inline-block px-2 py-1 text-xs bg-indigo-50 text-indigo-700 rounded"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

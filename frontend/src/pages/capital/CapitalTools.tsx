import React, { useState } from 'react';
import { Calculator, TrendingDown, FileCheck, Workflow } from 'lucide-react';
import EMICalculator from '../../components/capital/EMICalculator';
import BankRateComparison from '../../components/capital/BankRateComparison';

export default function CapitalTools() {
  const [activeTab, setActiveTab] = useState<'emi' | 'rates'>('emi');

  const tabs = [
    { id: 'emi' as const, label: 'EMI Calculator', icon: Calculator },
    { id: 'rates' as const, label: 'Compare Bank Rates', icon: TrendingDown },
  ];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Capital Tools</h1>
        <p className="text-gray-600">Financial calculators and bank rate comparison tools</p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-4 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'emi' && <EMICalculator />}
        {activeTab === 'rates' && <BankRateComparison />}
      </div>

      {/* Info Cards */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-indigo-50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <FileCheck className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Document Checklist</h3>
              <p className="text-sm text-gray-600">
                Track required documents for each loan application. View document checklist in the loan details page.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Workflow className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Approval Workflow</h3>
              <p className="text-sm text-gray-600">
                Multi-stage approval process for loans. Track progress from initial review to disbursement.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

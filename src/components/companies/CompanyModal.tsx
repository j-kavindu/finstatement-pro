import React, { useState } from 'react';
import { Building2, Calendar, X } from 'lucide-react';
import { Company, ReportingPeriod } from '../../types/accounting';

interface CompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveCompany: (company: Company) => void;
  ownerId: string;
}

export const CompanyModal: React.FC<CompanyModalProps> = ({
  isOpen,
  onClose,
  onSaveCompany,
  ownerId,
}) => {
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('Technology & Software');
  const [currency, setCurrency] = useState('USD');
  const [framework, setFramework] = useState<'IFRS-aligned' | 'US-GAAP-aligned' | 'SME-Standard'>('IFRS-aligned');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newCompany: Company = {
      id: `comp-${Date.now()}`,
      ownerId,
      name: name.trim(),
      industry,
      currency,
      reportingFramework: framework,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveCompany(newCompany);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-[#0f172a] border border-slate-700 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold text-white">Add Reporting Company</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Company Legal Name</label>
            <input
              type="text"
              required
              placeholder="e.g., Summit Holdings Ltd."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Industry Sector</label>
            <input
              type="text"
              placeholder="e.g., Manufacturing, Logistics, SaaS"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Reporting Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD ($)</option>
                <option value="AUD">AUD ($)</option>
                <option value="LKR">LKR (Rs)</option>
                <option value="SGD">SGD ($)</option>
                <option value="JPY">JPY (¥)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Accounting Framework</label>
              <select
                value={framework}
                onChange={(e) => setFramework(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
              >
                <option value="IFRS-aligned">IFRS-aligned</option>
                <option value="US-GAAP-aligned">US-GAAP-aligned</option>
                <option value="SME-Standard">SME Standard</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded"
            >
              Create Company
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface PeriodModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  existingPeriods: ReportingPeriod[];
  onSavePeriod: (period: ReportingPeriod) => void;
}

export const PeriodModal: React.FC<PeriodModalProps> = ({
  isOpen,
  onClose,
  companyId,
  existingPeriods,
  onSavePeriod,
}) => {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-12-31');
  const [comparativeId, setComparativeId] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (!startDate || !endDate || startDate > endDate) { alert("Choose valid reporting dates; start must precede end."); return; }
    const newPeriod: ReportingPeriod = {
      id: `period-${Date.now()}`,
      companyId,
      name: name.trim(),
      startDate,
      endDate,
      status: 'open',
      comparativePeriodId: comparativeId || undefined,
    };

    onSavePeriod(newPeriod);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-[#0f172a] border border-slate-700 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold text-white">Add Reporting Period</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Period Name</label>
            <input
              type="text"
              required
              placeholder="e.g., FY 2026 (Annual Ended Dec 31)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Start Date</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">End Date</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Comparative Prior Period (For Indirect Cash Flow & Comparisons)
            </label>
            <select
              value={comparativeId}
              onChange={(e) => setComparativeId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
            >
              <option value="">-- No comparative period --</option>
              {existingPeriods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded"
            >
              Create Period
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

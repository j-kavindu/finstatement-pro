import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, XCircle, Play, RefreshCw, X } from 'lucide-react';
import { runAccountingTestSuite, TestResult } from '../../tests/accountingEngine.test';

interface TestRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TestRunnerModal: React.FC<TestRunnerModalProps> = ({ isOpen, onClose }) => {
  const [testResults, setTestResults] = useState<TestResult[]>(() => runAccountingTestSuite());

  if (!isOpen) return null;

  const handleRerun = () => {
    setTestResults(runAccountingTestSuite());
  };

  const passedCount = testResults.filter((t) => t.passed).length;
  const totalCount = testResults.length;
  const allPassed = passedCount === totalCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-[#0f172a] border border-slate-700 rounded-xl max-w-3xl w-full p-6 space-y-5 shadow-2xl max-h-[85vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Automated Accounting Engine Verification Suite
              </h3>
              <p className="text-xs text-slate-400">
                12 Unit tests verifying mathematical invariants, double-entry balance, and cash flow rules.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Strip */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            {allPassed ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <XCircle className="w-4 h-4 text-red-400" />
            )}
            <span className="font-semibold text-white">
              {passedCount} of {totalCount} Tests Passing ({((passedCount / totalCount) * 100).toFixed(0)}%)
            </span>
          </div>

          <button
            onClick={handleRerun}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition-colors"
          >
            <RefreshCw className="w-3 h-3 text-blue-400" />
            <span>Re-run Test Suite</span>
          </button>
        </div>

        {/* Test List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-800/60 text-xs">
          {testResults.map((t, idx) => (
            <div key={idx} className="pt-2 first:pt-0 flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  {t.passed ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  )}
                  <span className="font-semibold text-slate-200">
                    {idx + 1}. {t.name}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 pl-5 leading-relaxed font-mono">
                  {t.message}
                </div>
              </div>

              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                  t.passed
                    ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                    : 'bg-red-950/60 text-red-400 border border-red-800/40'
                }`}
              >
                {t.passed ? 'PASSED' : 'FAILED'}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-md"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

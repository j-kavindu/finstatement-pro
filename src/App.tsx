/**
 * FinStatement Pro - Full-Stack Financial Reporting Web Application
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { User } from 'firebase/auth';
import { Menu } from 'lucide-react';
import {
  Company,
  ReportingPeriod,
  TrialBalanceRow,
  AdjustingJournalEntry,
  SupplementaryCashFlowData,
  EquityMovementData,
  AuditLogEntry,
  ReportVersionSnapshot,
} from './types/accounting';
import {
  SAMPLE_COMPANY,
  SAMPLE_PERIODS,
  SAMPLE_TB_FY2025,
  SAMPLE_ADJUSTMENTS_FY2025,
  SAMPLE_SUPPLEMENTARY_FY2025,
  SAMPLE_EQUITY_FY2025,
  SAMPLE_TB_FY2024,
} from './services/syntheticData';
import {
  validateTrialBalance,
  validateJournal,
  calculateAdjustedTrialBalance,
  generateProfitAndLoss,
  generateBalanceSheet,
  generateChangesInEquity,
  generateIndirectCashFlow,
  calculateFinancialRatios,
} from './services/accountingEngine';
import {
  exportFullFinancialWorkbookXLSX,
  exportExecutivePDF,
} from './services/exportService';
import {
  loadWorkspace, saveWorkspace, firebaseConfigured,
  subscribeToAuth,
  logoutUser,
} from './services/firebase';

import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { OverviewDashboard } from './components/dashboard/OverviewDashboard';
import { TrialBalanceView } from './components/trialBalance/TrialBalanceView';
import { AdjustmentsView } from './components/adjustments/AdjustmentsView';
import { StatementsContainer } from './components/statements/StatementsContainer';
import { RatiosView } from './components/ratios/RatiosView';
import { AuditLogView } from './components/audit/AuditLogView';
import { TestRunnerModal } from './components/testRunner/TestRunnerModal';
import { AuthModal } from './components/auth/AuthModal';
import { CompanyModal, PeriodModal } from './components/companies/CompanyModal';

// Demo workspace is local to this browser; never store real client financial data here.


export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isTestRunnerOpen, setIsTestRunnerOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Active Workspace Navigation
  const [currentTab, setCurrentTab] = useState<string>('overview');

  // Entities & Periods State
  const [companies, setCompanies] = useState<Company[]>([SAMPLE_COMPANY]);
  const [selectedCompany, setSelectedCompany] = useState<Company>(SAMPLE_COMPANY);

  const [periods, setPeriods] = useState<ReportingPeriod[]>(SAMPLE_PERIODS);
  const [selectedPeriod, setSelectedPeriod] = useState<ReportingPeriod>(SAMPLE_PERIODS[0]);

  // Financial Data State for Current Period
  const [tbRows, setTbRows] = useState<TrialBalanceRow[]>(SAMPLE_TB_FY2025);
  const [adjustments, setAdjustments] = useState<AdjustingJournalEntry[]>(SAMPLE_ADJUSTMENTS_FY2025);
  const [supplementary, setSupplementary] = useState<SupplementaryCashFlowData>(SAMPLE_SUPPLEMENTARY_FY2025);
  const [equityMovement, setEquityMovement] = useState<EquityMovementData>(SAMPLE_EQUITY_FY2025);

  // Comparative Prior Period Data (For indirect cash flow and comparative reports)
  const [comparativeTbRows, setComparativeTbRows] = useState<TrialBalanceRow[]>(SAMPLE_TB_FY2024);

  // Audit Logs and Snapshots
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([
    {
      id: 'log-init',
      companyId: SAMPLE_COMPANY.id,
      periodId: SAMPLE_PERIODS[0].id,
      timestamp: '2025-12-31T12:00:00Z',
      actorEmail: 'system.ledger@finstatement.internal',
      action: 'System Initialized',
      details: 'Loaded demo dataset for Apex Horizon Technologies Inc. FY2025 with double-entry balance check.',
    },
  ]);

  const [versionSnapshots, setVersionSnapshots] = useState<ReportVersionSnapshot[]>([]);

  // Modals for Companies & Periods
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);

  const [syncMessage, setSyncMessage] = useState('Demo: in-memory synthetic data. Sign in to load a cloud workspace.');
  const [cloudReady, setCloudReady] = useState(false);
  const revision = useRef(0);
  const [ledgers, setLedgers] = useState<Record<string, any>>({});
  const ledgerKey = `${selectedCompany.id}:${selectedPeriod.id}`;
  const activeKey = useRef(ledgerKey);
  const currentLedger = { tbRows, adjustments, supplementary, equityMovement, comparativeTbRows, auditLogs, versionSnapshots };
  const latestLedger = useRef(currentLedger);
  latestLedger.current = currentLedger;
  useEffect(() => {
    if (activeKey.current === ledgerKey) return;
    const oldKey = activeKey.current;
    setLedgers(previous => ({ ...previous, [oldKey]: latestLedger.current }));
    const saved = ledgers[ledgerKey];
    setTbRows(saved?.tbRows ?? (selectedCompany.id === SAMPLE_COMPANY.id && selectedPeriod.id === SAMPLE_PERIODS[1]?.id ? SAMPLE_TB_FY2024 : []));
    setAdjustments(saved?.adjustments ?? []);
    setSupplementary(saved?.supplementary);
    setEquityMovement(saved?.equityMovement);
    setComparativeTbRows(saved?.comparativeTbRows ?? []);
    setAuditLogs(saved?.auditLogs ?? []);
    setVersionSnapshots(saved?.versionSnapshots ?? []);
    activeKey.current = ledgerKey;
  }, [ledgerKey]);

  // Auth Observer
  useEffect(() => {

    const unsubscribe = subscribeToAuth((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setCloudReady(false);
    if (!currentUser) {
      revision.current = 0;
      setCompanies([SAMPLE_COMPANY]); setSelectedCompany(SAMPLE_COMPANY);
      setPeriods(SAMPLE_PERIODS); setSelectedPeriod(SAMPLE_PERIODS[0]);
      setLedgers({}); activeKey.current = `${SAMPLE_COMPANY.id}:${SAMPLE_PERIODS[0].id}`;
      setTbRows(SAMPLE_TB_FY2025); setAdjustments(SAMPLE_ADJUSTMENTS_FY2025);
      setSupplementary(SAMPLE_SUPPLEMENTARY_FY2025); setEquityMovement(SAMPLE_EQUITY_FY2025);
      setComparativeTbRows(SAMPLE_TB_FY2024); setAuditLogs([]); setVersionSnapshots([]);
      setSyncMessage('Demo: in-memory synthetic data. Sign in for cloud persistence.');
      return;
    }
    setSyncMessage('Loading private cloud workspace…');
    loadWorkspace(currentUser.uid).then(document => {
      if (cancelled) return;
      revision.current = document?.revision ?? 0;
      const data = document?.payload;
      if (data) {
        if (!Array.isArray(data.companies) || !Array.isArray(data.periods) || !data.selectedCompany || !data.selectedPeriod) throw new Error('Invalid workspace structure');
        calculateAdjustedTrialBalance(data.tbRows ?? [], data.adjustments ?? []);
        setCompanies(data.companies); setSelectedCompany(data.selectedCompany);
        setPeriods(data.periods); setSelectedPeriod(data.selectedPeriod);
        activeKey.current = `${data.selectedCompany.id}:${data.selectedPeriod.id}`;
        setLedgers(data.ledgers ?? {});
        setTbRows(data.tbRows ?? []); setAdjustments(data.adjustments ?? []);
        setSupplementary(data.supplementary); setEquityMovement(data.equityMovement);
        setComparativeTbRows(data.comparativeTbRows ?? []);
        setAuditLogs(data.auditLogs ?? []); setVersionSnapshots(data.versionSnapshots ?? []);
      }
      setCloudReady(true); setSyncMessage('Cloud workspace loaded. Use Save to persist changes.');
    }).catch(error => { if (!cancelled) setSyncMessage(`Cloud load failed: ${error.message}. Editing is blocked until reload.`); });
    return () => { cancelled = true; };
  }, [currentUser?.uid]);

  const handleCloudSave = async () => {
    if (!currentUser || !cloudReady) return;
    setCloudReady(false); setSyncMessage('Saving…');
    try {
      revision.current = await saveWorkspace(currentUser.uid, {
        companies: companies.map(c => ({ ...c, ownerId: currentUser.uid })), selectedCompany: { ...selectedCompany, ownerId: currentUser.uid },
        periods, selectedPeriod, ...currentLedger, ledgers: { ...ledgers, [ledgerKey]: currentLedger }
      }, revision.current);
      setSyncMessage('Saved to your private cloud workspace.'); setCloudReady(true);
    } catch (error) { setSyncMessage(`Save failed: ${error instanceof Error ? error.message : String(error)}. Changes remain in memory; reload may discard them.`); setCloudReady(true); }
  };

  // Log an audit event
  const addAuditLog = useCallback(
    (action: string, details: string) => {
      const newEntry: AuditLogEntry = {
        id: `log-${crypto.randomUUID()}`,
        companyId: selectedCompany.id,
        periodId: selectedPeriod.id,
        timestamp: new Date().toISOString(),
        actorEmail: currentUser?.email || 'authenticated.portfolio.user',
        action,
        details,
      };
      setAuditLogs((prev) => [newEntry, ...prev]);
    },
    [selectedCompany.id, selectedPeriod.id, currentUser]
  );

  // 1. Calculate Adjusted Trial Balance
  const tbCalculations = useMemo(() => {
    return calculateAdjustedTrialBalance(tbRows, adjustments);
  }, [tbRows, adjustments]);

  // 2. Generate Statement of Profit or Loss
  const pnl = useMemo(() => {
    return generateProfitAndLoss(tbCalculations.adjustedRows);
  }, [tbCalculations.adjustedRows]);

  // 3. Generate Statement of Financial Position
  const bs = useMemo(() => {
    return generateBalanceSheet(tbCalculations.adjustedRows, pnl.netProfit, equityMovement);
  }, [tbCalculations.adjustedRows, pnl.netProfit, equityMovement]);

  // 4. Generate Statement of Changes in Equity
  const eq = useMemo(() => {
    return generateChangesInEquity(equityMovement, pnl.netProfit, bs.equityItems);
  }, [equityMovement, pnl.netProfit, bs.equityItems]);

  // 5. Generate Comparative Prior Balance Sheet for Indirect Cash Flow
  const comparativeBs = useMemo(() => {
    if (!selectedPeriod.comparativePeriodId) return undefined;
    const stored = ledgers[`${selectedCompany.id}:${selectedPeriod.comparativePeriodId}`];
    const sourceRows = stored?.tbRows ?? comparativeTbRows;
    if (!sourceRows.length) return undefined;
    const compCalculations = calculateAdjustedTrialBalance(sourceRows, stored?.adjustments ?? []);
    const compPnl = generateProfitAndLoss(compCalculations.adjustedRows);
    return generateBalanceSheet(compCalculations.adjustedRows, compPnl.netProfit);
  }, [selectedPeriod.comparativePeriodId, comparativeTbRows, ledgers, selectedCompany.id]);

  // 6. Generate Indirect Cash Flow Statement
  const cf = useMemo(() => {
    return generateIndirectCashFlow(bs, comparativeBs, pnl, supplementary);
  }, [bs, comparativeBs, pnl, supplementary]);

  // 7. Calculate Financial Ratios
  const ratios = useMemo(() => {
    return calculateFinancialRatios(bs, pnl);
  }, [bs, pnl]);

  // Handle Export Workbook (XLSX)
  const handleExportWorkbook = () => {
    try { exportFullFinancialWorkbookXLSX(
      selectedCompany,
      selectedPeriod,
      tbCalculations.adjustedRows,
      pnl,
      bs,
      eq,
      cf,
      ratios
    );
    addAuditAction('Exported Financial Workbook', `Generated multi-tab Excel workbook for ${selectedPeriod.name}`);
    } catch (error) { setSyncMessage(`Export failed: ${error instanceof Error ? error.message : String(error)}`); }
  };

  // Handle Export Executive PDF
  const handleExportPDF = () => {
    try { exportExecutivePDF(selectedCompany, selectedPeriod, pnl, bs, eq, cf, ratios);
    addAuditAction('Exported Executive PDF', `Generated formatted PDF financial statement packet for ${selectedPeriod.name}`);
    } catch (error) { setSyncMessage(`Export failed: ${error instanceof Error ? error.message : String(error)}`); }
  };

  // Handle Reset to Demo Sample Dataset
  const handleResetSampleData = () => {
    if (confirm('Reload the synthetic demo company dataset (Apex Horizon Technologies Inc.)? This will reset local changes.')) {
      setLedgers({}); setVersionSnapshots([]);
      activeKey.current = `${SAMPLE_COMPANY.id}:${SAMPLE_PERIODS[0].id}`;
      setCompanies([SAMPLE_COMPANY]);
      setSelectedCompany(SAMPLE_COMPANY);
      setPeriods(SAMPLE_PERIODS);
      setSelectedPeriod(SAMPLE_PERIODS[0]);
      setTbRows(SAMPLE_TB_FY2025);
      setAdjustments(SAMPLE_ADJUSTMENTS_FY2025);
      setSupplementary(SAMPLE_SUPPLEMENTARY_FY2025);
      setEquityMovement(SAMPLE_EQUITY_FY2025);
      setComparativeTbRows(SAMPLE_TB_FY2024);
      setAuditLogs([
        {
          id: `log-${crypto.randomUUID()}`,
          companyId: SAMPLE_COMPANY.id,
          periodId: SAMPLE_PERIODS[0].id,
          timestamp: new Date().toISOString(),
          actorEmail: currentUser?.email || 'system.ledger',
          action: 'Sample Data Reloaded',
          details: 'Reloaded complete synthetic dataset with two comparative periods and balanced adjustments.',
        },
      ]);
    }
  };

  // Save Version Snapshot
  const handleSaveSnapshot = (name: string) => {
    const nextVer = versionSnapshots.length + 1;
    const newSnap: ReportVersionSnapshot = {
      id: `snap-${crypto.randomUUID()}`,
      periodId: selectedPeriod.id,
      version: nextVer,
      name,
      createdAt: new Date().toISOString(),
      createdBy: currentUser?.email || 'Accountant',
      netProfit: pnl.netProfit,
      totalAssets: bs.totalAssets,
      totalLiabilities: bs.totalLiabilities,
      totalEquity: bs.totalEquity,
      isReconciled: bs.isReconciled,
    };
    setVersionSnapshots([newSnap, ...versionSnapshots]);
    addAuditAction('Version Snapshot Created', `Saved milestone v${nextVer}: ${name}`);
  };

  const addAuditAction = (action: string, details: string) => {
    addAuditLog(action, details);
  };

  return (
    <div className="min-h-screen bg-[#090f1d] text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Bar adhering to Top Bar Contract */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={() => { logoutUser().catch(error => setSyncMessage(`Sign-out failed: ${error.message}`)); }}
        onExportWorkbook={handleExportWorkbook}
        isReconciled={bs.isReconciled}
        onOpenTests={() => setIsTestRunnerOpen(true)}
      />

      {/* Main Workspace Frame with Responsive Sidebar */}
      <div className="flex-1 flex w-full">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          companies={companies}
          selectedCompany={selectedCompany}
          onSelectCompany={(c) => {
            setSelectedCompany(c);
            setSelectedPeriod(periods.find(p => p.companyId === c.id) ?? { id: `period-${c.id}`, companyId: c.id, name: "Draft period", startDate: "2026-01-01", endDate: "2026-12-31", status: "draft" });
            addAuditAction('Switched Company', `Active company set to ${c.name}`);
          }}
          onNewCompany={() => setIsCompanyModalOpen(true)}
          periods={periods.filter(p => p.companyId === selectedCompany.id)}
          selectedPeriod={selectedPeriod}
          onSelectPeriod={(p) => {
            setSelectedPeriod(p);
            addAuditAction('Switched Period', `Active period set to ${p.name}`);
          }}
          onNewPeriod={() => setIsPeriodModalOpen(true)}
          onResetSampleData={handleResetSampleData}
          isMobileOpen={isMobileNavOpen}
          onCloseMobile={() => setIsMobileNavOpen(false)}
        />

        {/* Content Viewport */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {/* Mobile view toggle */}
          <div className="lg:hidden flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
            <button
              onClick={() => setIsMobileNavOpen(true)}
              className="flex items-center gap-2 text-xs font-semibold text-slate-300 bg-slate-800 px-3 py-1.5 rounded-md"
            >
              <Menu className="w-4 h-4 text-blue-400" />
              <span>Workspace Menu</span>
            </button>
            <div className="text-xs text-slate-400 truncate max-w-[200px]">
              {selectedCompany.name}
            </div>
          </div>

          <div role="status" className="mb-4 p-3 rounded bg-slate-800 text-sm flex flex-wrap gap-3 items-center">
            <span>{syncMessage}</span>
            {currentUser && <button disabled={!cloudReady} onClick={handleCloudSave} className="bg-blue-600 px-3 py-2 rounded disabled:opacity-40">Save cloud workspace</button>}
            <button onClick={() => window.print()} className="px-3 py-2 border rounded">Print draft</button>
            <span>Draft educational reports · no IFRS/SLFRS certification</span>
          </div>
          <fieldset disabled={!!currentUser && !cloudReady} className="min-w-0">
          {/* Active Tab Routing */}
          {currentTab === 'overview' && (
            <OverviewDashboard
              company={selectedCompany}
              period={selectedPeriod}
              pnl={pnl}
              bs={bs}
              cf={cf}
              isAdjustedBalanced={tbCalculations.isAdjustedBalanced}
              adjustedDifference={tbCalculations.adjustedDifference}
              adjustmentsCount={adjustments.filter((a) => a.status === 'posted').length}
              onNavigateTab={setCurrentTab}
              onOpenImport={() => setCurrentTab('trial-balance')}
              onExportPDF={handleExportPDF}
            />
          )}

          {currentTab === 'trial-balance' && (
            <TrialBalanceView
              company={selectedCompany}
              period={selectedPeriod}
              rows={tbCalculations.adjustedRows}
              onUpdateRows={(newRows) => {
                if (selectedPeriod.status === "closed") { alert("Closed periods cannot be edited."); return; }
                const errors = [...validateTrialBalance(newRows), ...adjustments.filter(a => a.status === "posted").flatMap(a => validateJournal(a, newRows))];
                if (errors.length) { alert(`Cannot change accounts referenced by posted journals: ${errors.join("; ")}`); return; }
                setTbRows(newRows);
                addAuditAction('Trial Balance Modified', `Updated account balances or lines (${newRows.length} accounts)`);
              }}
              totalUnadjustedDebit={tbCalculations.totalUnadjustedDebit}
              totalUnadjustedCredit={tbCalculations.totalUnadjustedCredit}
              totalAdjustedDebit={tbCalculations.totalAdjustedDebit}
              totalAdjustedCredit={tbCalculations.totalAdjustedCredit}
              isAdjustedBalanced={tbCalculations.isAdjustedBalanced}
              adjustedDifference={tbCalculations.adjustedDifference}
              onAuditAction={addAuditAction}
            />
          )}

          {currentTab === 'adjustments' && (
            <AdjustmentsView
              company={selectedCompany}
              period={selectedPeriod}
              accounts={tbCalculations.adjustedRows}
              adjustments={adjustments}
              onUpdateAdjustments={(newAdjustments) => {
                if (selectedPeriod.status === "closed") { alert("Closed periods cannot be edited."); return; }
                setAdjustments(newAdjustments);
                addAuditAction('Adjusting Journals Changed', `Active adjustments count: ${newAdjustments.length}`);
              }}
              onAuditAction={addAuditAction}
            />
          )}

          {currentTab === 'statements' && (
            <StatementsContainer
              key={ledgerKey}
              company={selectedCompany}
              period={selectedPeriod}
              comparativePeriod={
                periods.find((p) => p.id === selectedPeriod.comparativePeriodId)
              }
              pnl={pnl}
              bs={bs}
              eq={eq}
              cf={cf}
              supplementary={supplementary}
              onUpdateSupplementary={(supp) => {
                setSupplementary(supp);
                addAuditAction('Supplementary Cash Flow Updated', `Updated non-cash disclosures`);
              }}
              equityMovement={equityMovement}
              onUpdateEquityMovement={(eqData) => {
                setEquityMovement(eqData);
                addAuditAction('Equity Movements Updated', `Updated opening capital and dividends`);
              }}
              onExportPDF={handleExportPDF}
              onExportXLSX={handleExportWorkbook}
              onAuditAction={addAuditAction}
            />
          )}

          {currentTab === 'ratios' && (
            <RatiosView
              company={selectedCompany}
              period={selectedPeriod}
              ratios={ratios}
            />
          )}

          {currentTab === 'audit-log' && (
            <AuditLogView
              company={selectedCompany}
              period={selectedPeriod}
              auditLogs={auditLogs}
              versionSnapshots={versionSnapshots}
              onSaveSnapshot={handleSaveSnapshot}
            />
          )}
          </fieldset>
        </main>
      </div>

      {/* Modals */}
      <TestRunnerModal
        isOpen={isTestRunnerOpen}
        onClose={() => setIsTestRunnerOpen(false)}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthenticated={() => addAuditAction('User Authenticated', 'Firebase session established')}
      />

      <CompanyModal
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
        ownerId={currentUser?.uid || 'local-user'}
        onSaveCompany={(newComp) => {
          setCompanies([...companies, newComp]);
          setSelectedCompany(newComp);
          const firstPeriod: ReportingPeriod = { id: `period-${newComp.id}`, companyId: newComp.id, name: "Draft period", startDate: "2026-01-01", endDate: "2026-12-31", status: "draft" };
          setPeriods(prev => [...prev, firstPeriod]); setSelectedPeriod(firstPeriod);
          addAuditAction('Company Created', `Registered new entity: ${newComp.name}`);
        }}
      />

      <PeriodModal
        isOpen={isPeriodModalOpen}
        onClose={() => setIsPeriodModalOpen(false)}
        companyId={selectedCompany.id}
        existingPeriods={periods}
        onSavePeriod={(newPeriod) => {
          setPeriods([...periods, newPeriod]);
          setSelectedPeriod(newPeriod);
          addAuditAction('Period Created', `Added accounting period: ${newPeriod.name}`);
        }}
      />
    </div>
  );
}

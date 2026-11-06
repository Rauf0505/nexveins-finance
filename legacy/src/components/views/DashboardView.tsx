import React from 'react';
import {
  Wallet,
  TrendingUp,
  Receipt,
  ShoppingCart,
  CheckCircle2,
  PlayCircle,
  FolderKanban,
  FileSpreadsheet
} from 'lucide-react';
import { DashboardKPIs, JournalEntry, Project, Organization } from '../../types';

interface DashboardViewProps {
  kpis: DashboardKPIs | null;
  recentJournals: JournalEntry[];
  projects: Project[];
  activeOrg: Organization | null;
  onNavigateToView: (view: string) => void;
  onOpenScenarioModal: () => void;
  onOpenModal: (modalType: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  kpis,
  recentJournals,
  projects,
  activeOrg,
  onNavigateToView,
  onOpenScenarioModal,
  onOpenModal
}) => {
  const currency = activeOrg?.base_currency || 'PKR';

  return (
    <div className="space-y-6">
      {/* Release Acceptance Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 rounded-xl p-5 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-slate-700 shadow-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold px-2 py-0.5 rounded-sm border border-emerald-500/30">
              AUDITED FINANCIAL ENGINE
            </span>
            <span className="text-slate-400 text-xs">Section 23 Verification Ready</span>
          </div>
          <h2 className="text-base font-bold tracking-tight">
            Enterprise Financial Operations · Nex Veins Finance Core
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl mt-0.5">
            Real double-entry bookkeeping, multi-tenant isolation, software house project cost baselines, and extensible client finance modules.
          </p>
        </div>

        <button
          onClick={onOpenScenarioModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors shrink-0 shadow-sm cursor-pointer"
        >
          <PlayCircle className="w-4 h-4" />
          <span>Run 18-Step Acceptance Test</span>
        </button>
      </div>

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cash & Bank */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-medium">Total Cash & Bank</span>
            <Wallet className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-slate-900">
            {currency} {Number(kpis?.total_cash_and_bank || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
            <span className="text-emerald-600 font-medium font-mono">Real-time ledger balance</span>
          </div>
        </div>

        {/* Accounts Receivable */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-medium">Accounts Receivable (AR)</span>
            <Receipt className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-slate-900">
            {currency} {Number(kpis?.accounts_receivable || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>{kpis?.open_invoices_count || 0} open invoices</span>
            <button
              onClick={() => onNavigateToView('sales')}
              className="text-blue-600 hover:underline font-medium"
            >
              View Invoices
            </button>
          </div>
        </div>

        {/* Accounts Payable */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-medium">Accounts Payable (AP)</span>
            <ShoppingCart className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-slate-900">
            {currency} {Number(kpis?.accounts_payable || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>{kpis?.open_bills_count || 0} approved bills</span>
            <button
              onClick={() => onNavigateToView('purchases')}
              className="text-amber-600 hover:underline font-medium"
            >
              View Bills
            </button>
          </div>
        </div>

        {/* Net Operating Income & Gross Profit */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-medium">Net Operating Income</span>
            <TrendingUp className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-slate-900">
            {currency} {Number(kpis?.net_operating_income || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Margin: <strong className="font-mono text-emerald-600">{kpis?.net_profit_margin_percent || '0.0'}%</strong></span>
            <button
              onClick={() => onNavigateToView('reports')}
              className="text-purple-600 hover:underline font-medium"
            >
              Full P&L
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Projects & Recent Journals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Software House Project Financials (2 Columns) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Software House Projects Finance</h3>
              <p className="text-xs text-slate-500">Contract value, budget cost baselines, actual costs & margins</p>
            </div>
            <button
              onClick={() => onNavigateToView('projects')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            >
              View All Projects &rarr;
            </button>
          </div>

          <div className="space-y-3">
            {projects.slice(0, 3).map((p) => {
              const contract = Number(p.contract_value) || 0;
              const invoiced = Number(p.invoiced_amount) || 0;
              const actualCost = Number(p.actual_cost) || 0;
              const margin = p.margin_percent || '0.0';

              return (
                <div key={p.id} className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div>
                      <span className="font-bold text-slate-900">{p.name}</span>
                      <span className="ml-2 font-mono text-[11px] text-slate-400">({p.code})</span>
                    </div>
                    <span className="font-mono font-bold text-emerald-700">{margin}% Gross Margin</span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-[11px] font-mono text-slate-600 mt-2">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Contract:</span>
                      <strong className="text-slate-800">{currency} {contract.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Invoiced:</span>
                      <strong className="text-slate-800">{currency} {invoiced.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Actual Cost:</span>
                      <strong className="text-slate-800">{currency} {actualCost.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Gross Profit:</span>
                      <strong className="text-emerald-600 font-bold">{currency} {Number(p.gross_profit || 0).toLocaleString()}</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Operations & Engine Controls (1 Column) */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-2">Operational Actions</h3>
            <div className="space-y-2 text-xs">
              <button
                onClick={() => onOpenModal('invoice')}
                className="w-full text-left p-2.5 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-slate-800">Issue Project Invoice</span>
                </div>
                <span className="text-[11px] text-slate-400">&rarr;</span>
              </button>

              <button
                onClick={() => onOpenModal('payment')}
                className="w-full text-left p-2.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold text-slate-800">Record Client Receipt</span>
                </div>
                <span className="text-[11px] text-slate-400">&rarr;</span>
              </button>

              <button
                onClick={() => onOpenModal('bill')}
                className="w-full text-left p-2.5 rounded-lg border border-slate-200 hover:border-amber-300 hover:bg-amber-50/50 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-amber-600" />
                  <span className="font-semibold text-slate-800">Record Vendor Bill</span>
                </div>
                <span className="text-[11px] text-slate-400">&rarr;</span>
              </button>

              <button
                onClick={() => onOpenModal('journal')}
                className="w-full text-left p-2.5 rounded-lg border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-600" />
                  <span className="font-semibold text-slate-800">Manual Balanced Journal</span>
                </div>
                <span className="text-[11px] text-slate-400">&rarr;</span>
              </button>
            </div>
          </div>

          {/* Core Reports Shortcut */}
          <div className="bg-slate-900 rounded-xl p-5 text-white shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Reconciled Statements</h4>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              Generate Trial Balance, Balance Sheet, P&L, and Cash Flow with zero floating-point discrepancies.
            </p>
            <button
              onClick={() => onNavigateToView('reports')}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 rounded-md text-xs font-bold transition-colors"
            >
              Open Financial Reports &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Recent Posted Journals */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Latest Posted Journals</h3>
            <p className="text-xs text-slate-500">Traceable audit log of balanced general ledger entries</p>
          </div>
          <button
            onClick={() => onNavigateToView('accounting')}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
          >
            Journal Register &rarr;
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider border-y border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Entry #</th>
                <th className="py-2.5 px-3">Posting Date</th>
                <th className="py-2.5 px-3">Source Type</th>
                <th className="py-2.5 px-3">Memo</th>
                <th className="py-2.5 px-3 text-right">Debit ({currency})</th>
                <th className="py-2.5 px-3 text-right">Credit ({currency})</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentJournals.slice(0, 5).map((j) => (
                <tr key={j.id} className="hover:bg-slate-50/80">
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{j.entry_number}</td>
                  <td className="py-2.5 px-3 text-slate-600 font-mono">{j.posting_date}</td>
                  <td className="py-2.5 px-3">
                    <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-700">
                      {j.source_type}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-700 max-w-xs truncate">{j.memo}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                    {Number(j.total_debit).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                    {Number(j.total_credit).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        j.status === 'posted'
                          ? 'bg-emerald-100 text-emerald-800'
                          : j.status === 'reversed'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {j.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

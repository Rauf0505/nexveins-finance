import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Printer,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Calendar
} from 'lucide-react';
import {
  TrialBalanceReport,
  ProfitLossReport,
  BalanceSheetReport,
  CashFlowReport,
  Organization
} from '../../types';
import { api } from '../../api';

interface ReportsViewProps {
  activeOrg: Organization | null;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ activeOrg }) => {
  const [reportType, setReportType] = useState<
    'trial_balance' | 'profit_loss' | 'balance_sheet' | 'cash_flow' | 'ar_aging' | 'ap_aging'
  >('trial_balance');

  const [trialBalance, setTrialBalance] = useState<TrialBalanceReport | null>(null);
  const [profitLoss, setProfitLoss] = useState<ProfitLossReport | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetReport | null>(null);
  const [cashFlow, setCashFlow] = useState<CashFlowReport | null>(null);
  const [arAging, setArAging] = useState<any | null>(null);
  const [apAging, setApAging] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const currency = activeOrg?.base_currency || 'PKR';

  const loadReports = async () => {
    setIsLoading(true);
    try {
      if (reportType === 'trial_balance') {
        const res = await api.getTrialBalance();
        setTrialBalance(res);
      } else if (reportType === 'profit_loss') {
        const res = await api.getProfitLoss();
        setProfitLoss(res);
      } else if (reportType === 'balance_sheet') {
        const res = await api.getBalanceSheet();
        setBalanceSheet(res);
      } else if (reportType === 'cash_flow') {
        const res = await api.getCashFlow();
        setCashFlow(res);
      } else if (reportType === 'ar_aging') {
        const res = await api.getARAging();
        setArAging(res);
      } else if (reportType === 'ap_aging') {
        const res = await api.getAPAging();
        setApAging(res);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [reportType, activeOrg?.id]);

  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';

    if (reportType === 'trial_balance' && trialBalance) {
      csvContent += 'Account Code,Account Name,Type,Classification,Debit,Credit,Net Debit,Net Credit\n';
      trialBalance.items.forEach((it) => {
        csvContent += `"${it.code}","${it.name}","${it.type}","${it.sub_type}","${it.total_debit}","${it.total_credit}","${it.net_debit}","${it.net_credit}"\n`;
      });
      csvContent += `Totals,,,,${trialBalance.total_debit},${trialBalance.total_credit},${trialBalance.total_net_debit},${trialBalance.total_net_credit}\n`;
    } else if (reportType === 'profit_loss' && profitLoss) {
      csvContent += 'Section,Account Code,Account Name,Amount\n';
      profitLoss.revenue.items.forEach((r) => {
        csvContent += `"Revenue","${r.code}","${r.name}","${r.amount}"\n`;
      });
      profitLoss.cost_of_goods_sold.items.forEach((c) => {
        csvContent += `"Cost of Goods Sold","${c.code}","${c.name}","${c.amount}"\n`;
      });
      profitLoss.operating_expenses.items.forEach((o) => {
        csvContent += `"Operating Expense","${o.code}","${o.name}","${o.amount}"\n`;
      });
      csvContent += `"Net Operating Income",,,"${profitLoss.net_operating_income}"\n`;
    } else {
      csvContent += 'Report export available for Trial Balance and P&L.\n';
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${reportType}_${activeOrg?.slug || 'report'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* Report Selector Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setReportType('trial_balance')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              reportType === 'trial_balance'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Trial Balance
          </button>
          <button
            onClick={() => setReportType('profit_loss')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              reportType === 'profit_loss'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Profit & Loss
          </button>
          <button
            onClick={() => setReportType('balance_sheet')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              reportType === 'balance_sheet'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Balance Sheet
          </button>
          <button
            onClick={() => setReportType('cash_flow')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              reportType === 'cash_flow'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Cash Flow Statement
          </button>
          <button
            onClick={() => setReportType('ar_aging')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              reportType === 'ar_aging'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            AR Aging
          </button>
          <button
            onClick={() => setReportType('ap_aging')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              reportType === 'ap_aging'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            AP Aging
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200 text-slate-400 font-mono text-xs">
          Computing authoritative ledger statement...
        </div>
      ) : (
        <>
          {/* TRIAL BALANCE */}
          {reportType === 'trial_balance' && trialBalance && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Trial Balance</h3>
                  <p className="text-xs text-slate-500">As of {trialBalance.as_of_date} · Authoritative double-entry trial balance</p>
                </div>
                {trialBalance.is_balanced ? (
                  <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold bg-emerald-100/70 border border-emerald-300 px-3 py-1 rounded-md font-mono">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>BALANCED (Difference: 0.00)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-red-600 text-xs font-bold bg-red-100/70 border border-red-300 px-3 py-1 rounded-md font-mono">
                    <AlertTriangle className="w-4 h-4" />
                    <span>UNBALANCED DISCREPANCY</span>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-[11px] uppercase tracking-wider text-slate-500 bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4">Account Code</th>
                      <th className="py-2.5 px-4">Account Name</th>
                      <th className="py-2.5 px-4">Type</th>
                      <th className="py-2.5 px-4 text-right">Debit ({currency})</th>
                      <th className="py-2.5 px-4 text-right">Credit ({currency})</th>
                      <th className="py-2.5 px-4 text-right">Net Debit ({currency})</th>
                      <th className="py-2.5 px-4 text-right">Net Credit ({currency})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {trialBalance.items.map((it) => (
                      <tr key={it.account_id} className="hover:bg-slate-50/70">
                        <td className="py-2 px-4 font-bold text-slate-900">{it.code}</td>
                        <td className="py-2 px-4 font-sans text-slate-800">{it.name}</td>
                        <td className="py-2 px-4 font-sans uppercase text-[10px] text-slate-500">{it.type}</td>
                        <td className="py-2 px-4 text-right text-slate-600">
                          {Number(it.total_debit) > 0 ? Number(it.total_debit).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                        </td>
                        <td className="py-2 px-4 text-right text-slate-600">
                          {Number(it.total_credit) > 0 ? Number(it.total_credit).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                        </td>
                        <td className="py-2 px-4 text-right font-bold text-slate-900">
                          {Number(it.net_debit) > 0 ? Number(it.net_debit).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                        </td>
                        <td className="py-2 px-4 text-right font-bold text-slate-900">
                          {Number(it.net_credit) > 0 ? Number(it.net_credit).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-900 text-white font-mono font-bold">
                    <tr>
                      <td colSpan={3} className="py-3 px-4 text-right font-sans">Reconciled Trial Balance Totals:</td>
                      <td className="py-3 px-4 text-right">{Number(trialBalance.total_debit).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 px-4 text-right">{Number(trialBalance.total_credit).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 px-4 text-right text-emerald-400">{Number(trialBalance.total_net_debit).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 px-4 text-right text-emerald-400">{Number(trialBalance.total_net_credit).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* PROFIT AND LOSS STATEMENT */}
          {reportType === 'profit_loss' && profitLoss && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6 shadow-xs max-w-4xl mx-auto text-xs">
              <div className="border-b border-slate-200 pb-4 text-center">
                <h3 className="font-bold text-base text-slate-900">STATEMENT OF PROFIT AND LOSS</h3>
                <p className="text-slate-500 text-xs mt-0.5">{activeOrg?.name || 'Nex Veins Technologies'}</p>
                <p className="text-slate-400 text-[11px] font-mono mt-0.5">Period: {profitLoss.start_date} to {profitLoss.end_date}</p>
              </div>

              {/* Operating Revenue */}
              <div className="space-y-2">
                <div className="font-bold uppercase text-[11px] tracking-wider text-slate-500 border-b border-slate-200 pb-1 flex justify-between">
                  <span>Revenue & Turnover</span>
                  <span>Amount ({currency})</span>
                </div>
                {profitLoss.revenue.items.map((r) => (
                  <div key={r.account_id} className="flex justify-between py-1 text-slate-800">
                    <span className="pl-4">{r.code} - {r.name}</span>
                    <span className="font-mono">{Number(r.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold border-t border-slate-200 pt-1 text-slate-900 font-mono">
                  <span className="font-sans">Total Revenue:</span>
                  <span>{currency} {Number(profitLoss.revenue.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Cost of Goods Sold */}
              <div className="space-y-2">
                <div className="font-bold uppercase text-[11px] tracking-wider text-slate-500 border-b border-slate-200 pb-1 flex justify-between">
                  <span>Direct Cost of Software Engineering (COGS)</span>
                  <span>Amount ({currency})</span>
                </div>
                {profitLoss.cost_of_goods_sold.items.length === 0 ? (
                  <div className="text-slate-400 pl-4 py-1 italic">No direct subcontractor/labor costs recognized in period.</div>
                ) : (
                  profitLoss.cost_of_goods_sold.items.map((c) => (
                    <div key={c.account_id} className="flex justify-between py-1 text-slate-800">
                      <span className="pl-4">{c.code} - {c.name}</span>
                      <span className="font-mono">{Number(c.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))
                )}
                <div className="flex justify-between font-bold border-t border-slate-200 pt-1 text-slate-900 font-mono">
                  <span className="font-sans">Total COGS:</span>
                  <span>{currency} {Number(profitLoss.cost_of_goods_sold.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Gross Profit */}
              <div className="p-3 bg-slate-50 rounded-lg flex justify-between font-bold text-sm text-slate-900 font-mono border border-slate-200">
                <span className="font-sans">GROSS PROFIT ({profitLoss.gross_margin_percent}% Margin):</span>
                <span className="text-emerald-700">{currency} {Number(profitLoss.gross_profit).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>

              {/* Operating Expenses */}
              <div className="space-y-2">
                <div className="font-bold uppercase text-[11px] tracking-wider text-slate-500 border-b border-slate-200 pb-1 flex justify-between">
                  <span>Operating, Administrative & General Expenses</span>
                  <span>Amount ({currency})</span>
                </div>
                {profitLoss.operating_expenses.items.map((o) => (
                  <div key={o.account_id} className="flex justify-between py-1 text-slate-800">
                    <span className="pl-4">{o.code} - {o.name}</span>
                    <span className="font-mono">{Number(o.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold border-t border-slate-200 pt-1 text-slate-900 font-mono">
                  <span className="font-sans">Total Operating Expenses:</span>
                  <span>{currency} {Number(profitLoss.operating_expenses.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Net Operating Income */}
              <div className="p-4 bg-slate-900 text-white rounded-lg flex justify-between font-bold text-sm font-mono">
                <span className="font-sans">NET OPERATING INCOME / SURPLUS:</span>
                <span className="text-emerald-400">{currency} {Number(profitLoss.net_operating_income).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          )}

          {/* BALANCE SHEET */}
          {reportType === 'balance_sheet' && balanceSheet && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6 shadow-xs max-w-4xl mx-auto text-xs">
              <div className="border-b border-slate-200 pb-4 text-center">
                <h3 className="font-bold text-base text-slate-900">BALANCE SHEET</h3>
                <p className="text-slate-500 text-xs mt-0.5">{activeOrg?.name || 'Nex Veins Technologies'}</p>
                <p className="text-slate-400 text-[11px] font-mono mt-0.5">As of {balanceSheet.as_of_date}</p>
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Assets = Liabilities + Equity (Variance: {currency} {balanceSheet.variance})</span>
                </div>
              </div>

              {/* ASSETS */}
              <div className="space-y-3">
                <div className="font-bold uppercase text-[11px] tracking-wider text-slate-900 border-b border-slate-300 pb-1 flex justify-between">
                  <span>1. ASSETS</span>
                  <span>Amount ({currency})</span>
                </div>

                <div className="pl-2">
                  <div className="font-semibold text-slate-600 mb-1">Current Assets:</div>
                  {balanceSheet.assets.current_assets.map((a) => (
                    <div key={a.account_id} className="flex justify-between py-1 text-slate-800 pl-4 font-mono">
                      <span className="font-sans">{a.code} - {a.name}</span>
                      <span>{Number(a.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>

                {balanceSheet.assets.fixed_assets.length > 0 && (
                  <div className="pl-2 pt-2">
                    <div className="font-semibold text-slate-600 mb-1">Fixed / Non-Current Assets:</div>
                    {balanceSheet.assets.fixed_assets.map((a) => (
                      <div key={a.account_id} className="flex justify-between py-1 text-slate-800 pl-4 font-mono">
                        <span className="font-sans">{a.code} - {a.name}</span>
                        <span>{Number(a.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-between font-bold border-t border-slate-300 pt-2 text-slate-900 font-mono text-sm bg-slate-50 p-2 rounded-md">
                  <span className="font-sans">TOTAL ASSETS:</span>
                  <span className="text-emerald-700">{currency} {Number(balanceSheet.assets.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* LIABILITIES */}
              <div className="space-y-3">
                <div className="font-bold uppercase text-[11px] tracking-wider text-slate-900 border-b border-slate-300 pb-1 flex justify-between">
                  <span>2. LIABILITIES</span>
                  <span>Amount ({currency})</span>
                </div>

                <div className="pl-2">
                  <div className="font-semibold text-slate-600 mb-1">Current Liabilities:</div>
                  {balanceSheet.liabilities.current_liabilities.map((l) => (
                    <div key={l.account_id} className="flex justify-between py-1 text-slate-800 pl-4 font-mono">
                      <span className="font-sans">{l.code} - {l.name}</span>
                      <span>{Number(l.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between font-bold border-t border-slate-200 pt-1 text-slate-900 font-mono pl-2">
                  <span className="font-sans">Total Liabilities:</span>
                  <span>{currency} {Number(balanceSheet.liabilities.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* EQUITY */}
              <div className="space-y-3">
                <div className="font-bold uppercase text-[11px] tracking-wider text-slate-900 border-b border-slate-300 pb-1 flex justify-between">
                  <span>3. PARTNERS EQUITY</span>
                  <span>Amount ({currency})</span>
                </div>

                <div className="pl-2">
                  {balanceSheet.equity.items.map((e) => (
                    <div key={e.account_id} className="flex justify-between py-1 text-slate-800 pl-4 font-mono">
                      <span className="font-sans">{e.code} - {e.name}</span>
                      <span>{Number(e.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between font-bold border-t border-slate-200 pt-1 text-slate-900 font-mono pl-2">
                  <span className="font-sans">Total Equity:</span>
                  <span>{currency} {Number(balanceSheet.equity.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* TOTAL LIABILITIES & EQUITY */}
              <div className="p-4 bg-slate-900 text-white rounded-lg flex justify-between font-bold text-sm font-mono">
                <span className="font-sans">TOTAL LIABILITIES & EQUITY:</span>
                <span className="text-emerald-400">{currency} {Number(balanceSheet.total_liabilities_and_equity).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          )}

          {/* CASH FLOW STATEMENT */}
          {reportType === 'cash_flow' && cashFlow && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5 shadow-xs max-w-4xl mx-auto text-xs">
              <div className="border-b border-slate-200 pb-4 text-center">
                <h3 className="font-bold text-base text-slate-900">STATEMENT OF CASH FLOWS</h3>
                <p className="text-slate-500 text-xs mt-0.5">{activeOrg?.name || 'Nex Veins Technologies'}</p>
                <p className="text-slate-400 text-[11px] font-mono mt-0.5">Direct Cash & Bank Method</p>
              </div>

              <div className="space-y-3">
                <div className="font-bold text-slate-900 border-b border-slate-200 pb-1 flex justify-between">
                  <span>1. Operating Cash Flows</span>
                  <span>Amount ({currency})</span>
                </div>
                <div className="flex justify-between pl-4 text-slate-700 font-mono">
                  <span className="font-sans">Inflows from clients & customers:</span>
                  <span className="text-emerald-700">+{Number(cashFlow.operating.inflows).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between pl-4 text-slate-700 font-mono">
                  <span className="font-sans">Outflows for vendor bills, payroll & utilities:</span>
                  <span className="text-red-700">-{Number(cashFlow.operating.outflows).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-slate-100 pt-1 pl-4 font-mono text-slate-900">
                  <span className="font-sans">Net Cash from Operating Activities:</span>
                  <span>{currency} {Number(cashFlow.operating.net).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="font-bold text-slate-900 border-b border-slate-200 pb-1 flex justify-between">
                  <span>2. Financing Cash Flows</span>
                  <span>Amount ({currency})</span>
                </div>
                <div className="flex justify-between pl-4 text-slate-700 font-mono">
                  <span className="font-sans">Partner capital contributions / founder funding:</span>
                  <span className="text-emerald-700">+{Number(cashFlow.financing.inflows).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between pl-4 text-slate-700 font-mono">
                  <span className="font-sans">Partner drawings & distributions:</span>
                  <span className="text-red-700">-{Number(cashFlow.financing.outflows).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-slate-100 pt-1 pl-4 font-mono text-slate-900">
                  <span className="font-sans">Net Cash from Financing Activities:</span>
                  <span>{currency} {Number(cashFlow.financing.net).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="p-4 bg-slate-900 text-white rounded-lg flex justify-between font-bold text-sm font-mono">
                <span className="font-sans">NET CHANGE IN CASH & EQUIVALENTS:</span>
                <span className="text-emerald-400">{currency} {Number(cashFlow.net_cash_change).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          )}

          {/* AR AGING */}
          {reportType === 'ar_aging' && arAging && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Accounts Receivable (AR) Aging Summary</h3>
                  <p className="text-xs text-slate-500">Aging buckets of outstanding client invoices</p>
                </div>
                <div className="text-right font-mono">
                  <span className="text-[10px] text-slate-400 block uppercase">Total Uncollected</span>
                  <strong className="text-base font-bold text-slate-900">{currency} {Number(arAging.total_outstanding).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3 text-center font-mono text-xs">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 block">Current (Not Due)</span>
                  <strong className="text-emerald-900 text-sm">{currency} {Number(arAging.buckets.current).toLocaleString()}</strong>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <span className="text-[10px] uppercase font-bold text-blue-800 block">1 - 30 Days</span>
                  <strong className="text-blue-900 text-sm">{currency} {Number(arAging.buckets.days_1_30).toLocaleString()}</strong>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <span className="text-[10px] uppercase font-bold text-amber-800 block">31 - 60 Days</span>
                  <strong className="text-amber-900 text-sm">{currency} {Number(arAging.buckets.days_31_60).toLocaleString()}</strong>
                </div>
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                  <span className="text-[10px] uppercase font-bold text-rose-800 block">61+ Days Overdue</span>
                  <strong className="text-rose-900 text-sm">{currency} {Number(arAging.buckets.days_61_plus).toLocaleString()}</strong>
                </div>
              </div>
            </div>
          )}

          {/* AP AGING */}
          {reportType === 'ap_aging' && apAging && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Accounts Payable (AP) Aging Summary</h3>
                  <p className="text-xs text-slate-500">Aging buckets of approved vendor bills</p>
                </div>
                <div className="text-right font-mono">
                  <span className="text-[10px] text-slate-400 block uppercase">Total Trade Payables</span>
                  <strong className="text-base font-bold text-slate-900">{currency} {Number(apAging.total_payables).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3 text-center font-mono text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-[10px] uppercase font-bold text-slate-700 block">Current</span>
                  <strong className="text-slate-900 text-sm">{currency} {Number(apAging.buckets.current).toLocaleString()}</strong>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <span className="text-[10px] uppercase font-bold text-blue-800 block">1 - 30 Days</span>
                  <strong className="text-blue-900 text-sm">{currency} {Number(apAging.buckets.days_1_30).toLocaleString()}</strong>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <span className="text-[10px] uppercase font-bold text-amber-800 block">31 - 60 Days</span>
                  <strong className="text-amber-900 text-sm">{currency} {Number(apAging.buckets.days_31_60).toLocaleString()}</strong>
                </div>
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                  <span className="text-[10px] uppercase font-bold text-rose-800 block">61+ Days Overdue</span>
                  <strong className="text-rose-900 text-sm">{currency} {Number(apAging.buckets.days_61_plus).toLocaleString()}</strong>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

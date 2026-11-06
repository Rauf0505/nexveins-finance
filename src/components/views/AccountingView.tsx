import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  RotateCcw,
  Search,
  Filter,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { ChartAccount, JournalEntry, Organization } from '../../types';
import { api } from '../../api';

interface AccountingViewProps {
  accounts: ChartAccount[];
  journals: JournalEntry[];
  activeOrg: Organization | null;
  onOpenJournalModal: () => void;
  onRefreshData: () => void;
}

export const AccountingView: React.FC<AccountingViewProps> = ({
  accounts,
  journals,
  activeOrg,
  onOpenJournalModal,
  onRefreshData
}) => {
  const [subTab, setSubTab] = useState<'coa' | 'journals' | 'gl'>('coa');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedJournalId, setExpandedJournalId] = useState<string | null>(null);
  const [selectedGLAccount, setSelectedGLAccount] = useState<string>(accounts[0]?.id || '');
  const [glData, setGLData] = useState<any[]>([]);
  const [isLoadingGL, setIsLoadingGL] = useState(false);
  const [reverseReason, setReverseReason] = useState('');
  const [reversingJournalId, setReversingJournalId] = useState<string | null>(null);

  const currency = activeOrg?.base_currency || 'PKR';

  const loadGeneralLedger = async (accId: string) => {
    setSelectedGLAccount(accId);
    setIsLoadingGL(true);
    try {
      const res = await api.getGeneralLedger(accId);
      setGLData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingGL(false);
    }
  };

  const handleReverseJournal = async (journalId: string) => {
    if (!reverseReason) {
      alert('Please specify a reason for reversing this journal entry.');
      return;
    }
    try {
      await api.reverseJournal(journalId, reverseReason);
      setReversingJournalId(null);
      setReverseReason('');
      onRefreshData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredAccounts = accounts.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.code.includes(searchQuery) ||
      a.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredJournals = journals.filter(
    (j) =>
      j.entry_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.memo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (j.reference && j.reference.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-5">
      {/* Top Header & Sub-Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 border-b md:border-b-0 border-slate-100 pb-2 md:pb-0">
          <button
            onClick={() => setSubTab('coa')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              subTab === 'coa'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Chart of Accounts ({accounts.length})
          </button>
          <button
            onClick={() => setSubTab('journals')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              subTab === 'journals'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Journal Register ({journals.length})
          </button>
          <button
            onClick={() => {
              setSubTab('gl');
              if (accounts[0]) loadGeneralLedger(accounts[0].id);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              subTab === 'gl'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            General Ledger Drill-Down
          </button>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="relative flex-1 md:w-60">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search code, name, memo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <button
            onClick={onOpenJournalModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Journal Entry</span>
          </button>
        </div>
      </div>

      {/* Sub-Tab 1: Chart of Accounts */}
      {subTab === 'coa' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Account Code</th>
                  <th className="py-3 px-4">Account Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Classification</th>
                  <th className="py-3 px-4 text-center">Subledger Control</th>
                  <th className="py-3 px-4 text-right">Net Ledger Balance ({currency})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAccounts.map((acc) => {
                  const bal = acc.balance_raw || 0;
                  // For asset and expense: positive is normal debit. For liability/equity/revenue: negative raw is positive credit.
                  const displayBal =
                    acc.type === 'asset' || acc.type === 'expense' ? bal : -bal;

                  return (
                    <tr key={acc.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{acc.code}</td>
                      <td className="py-2.5 px-4 font-medium text-slate-800">
                        <div>{acc.name}</div>
                        {acc.description && (
                          <div className="text-[11px] text-slate-400">{acc.description}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`font-mono text-[10px] uppercase px-2 py-0.5 rounded-sm font-semibold ${
                            acc.type === 'asset'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : acc.type === 'liability'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : acc.type === 'equity'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : acc.type === 'revenue'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {acc.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 capitalize">
                        {acc.sub_type.replace(/_/g, ' ')}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {acc.is_system_control === 1 ? (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-sm">
                            System Control
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Direct Post</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                        {displayBal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Journal Register */}
      {subTab === 'journals' && (
        <div className="space-y-3">
          {filteredJournals.map((j) => {
            const isExpanded = expandedJournalId === j.id;

            return (
              <div
                key={j.id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs text-xs"
              >
                <div
                  onClick={() => setExpandedJournalId(isExpanded ? null : j.id)}
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/60 select-none transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">{j.entry_number}</span>
                        <span className="font-mono text-[10px] uppercase bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-sm">
                          {j.source_type}
                        </span>
                        {j.reference && (
                          <span className="text-slate-400 text-[11px]">Ref: {j.reference}</span>
                        )}
                      </div>
                      <div className="text-slate-600 font-medium mt-0.5">{j.memo}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-slate-400 text-[10px]">Total Amount</div>
                      <div className="font-mono font-bold text-slate-900">
                        {currency} {Number(j.total_debit).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-slate-400 text-[10px]">Posting Date</div>
                      <div className="font-mono text-slate-600">{j.posting_date}</div>
                    </div>

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

                    {j.status === 'posted' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setReversingJournalId(j.id);
                        }}
                        className="p-1 text-slate-400 hover:text-purple-600 rounded-md transition-colors"
                        title="Reverse Journal Entry"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Reversal dialog inline */}
                {reversingJournalId === j.id && (
                  <div className="p-3 bg-purple-50/70 border-t border-purple-200 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 flex-1">
                      <ShieldAlert className="w-4 h-4 text-purple-700 shrink-0" />
                      <input
                        type="text"
                        placeholder="State reason for reversal (required for audit)..."
                        value={reverseReason}
                        onChange={(e) => setReverseReason(e.target.value)}
                        className="flex-1 border border-purple-300 rounded-md p-1.5 bg-white text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setReversingJournalId(null)}
                        className="px-2.5 py-1 text-slate-600 hover:text-slate-900"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleReverseJournal(j.id)}
                        className="px-3 py-1 bg-purple-700 hover:bg-purple-600 text-white font-bold rounded-md"
                      >
                        Confirm Reversal
                      </button>
                    </div>
                  </div>
                )}

                {/* Expanded Lines */}
                {isExpanded && j.lines && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-4">
                    <table className="w-full text-xs text-left">
                      <thead className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-200">
                        <tr>
                          <th className="pb-1.5">Account Code</th>
                          <th className="pb-1.5">Account Name</th>
                          <th className="pb-1.5">Line Description</th>
                          <th className="pb-1.5 text-right">Debit ({currency})</th>
                          <th className="pb-1.5 text-right">Credit ({currency})</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {j.lines.map((l) => (
                          <tr key={l.id}>
                            <td className="py-1.5 font-bold text-slate-800">{l.account_code}</td>
                            <td className="py-1.5 font-sans text-slate-700">{l.account_name}</td>
                            <td className="py-1.5 font-sans text-slate-500">{l.description || '-'}</td>
                            <td className="py-1.5 text-right text-slate-900 font-medium">
                              {Number(l.debit) > 0 ? Number(l.debit).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                            </td>
                            <td className="py-1.5 text-right text-slate-900 font-medium">
                              {Number(l.credit) > 0 ? Number(l.credit).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t border-slate-300 font-mono font-bold text-slate-900">
                        <tr>
                          <td colSpan={3} className="pt-2 text-right">Total:</td>
                          <td className="pt-2 text-right">{Number(j.total_debit).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                          <td className="pt-2 text-right">{Number(j.total_credit).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Sub-Tab 3: General Ledger Drill-Down */}
      {subTab === 'gl' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-slate-700">Select General Ledger Account:</label>
            <select
              value={selectedGLAccount}
              onChange={(e) => loadGeneralLedger(e.target.value)}
              className="border border-slate-300 rounded-md p-1.5 text-xs bg-white flex-1 max-w-md font-mono"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} - {a.name} ({a.type.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {isLoadingGL ? (
            <div className="text-center py-12 text-slate-400 text-xs font-mono">Loading General Ledger transactions...</div>
          ) : glData.length === 0 || !glData[0]?.transactions?.length ? (
            <div className="text-center py-12 text-slate-400 text-xs">No transactions recorded for this account in the selected period.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider border-y border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Journal #</th>
                    <th className="py-2.5 px-3">Memo / Description</th>
                    <th className="py-2.5 px-3 text-right">Debit ({currency})</th>
                    <th className="py-2.5 px-3 text-right">Credit ({currency})</th>
                    <th className="py-2.5 px-3 text-right">Running Balance ({currency})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {glData[0].transactions.map((tx: any) => (
                    <tr key={tx.line_id} className="hover:bg-slate-50/80">
                      <td className="py-2 px-3 text-slate-600">{tx.posting_date}</td>
                      <td className="py-2 px-3 font-bold text-slate-900">{tx.entry_number}</td>
                      <td className="py-2 px-3 font-sans text-slate-700">{tx.line_description || tx.memo}</td>
                      <td className="py-2 px-3 text-right text-slate-900">
                        {Number(tx.debit) > 0 ? Number(tx.debit).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-900">
                        {Number(tx.credit) > 0 ? Number(tx.credit).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-700">
                        {Number(tx.running_balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 font-mono font-bold text-slate-900 border-t border-slate-200">
                  <tr>
                    <td colSpan={3} className="py-2 px-3 text-right">Account Net Totals:</td>
                    <td className="py-2 px-3 text-right">{Number(glData[0].total_debit).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="py-2 px-3 text-right">{Number(glData[0].total_credit).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="py-2 px-3 text-right text-emerald-700">{Number(glData[0].net_balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

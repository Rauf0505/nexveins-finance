import React, { useState } from 'react';
import { Coins, Plus, CheckCircle2, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { PartnerEquityTransaction, BankAccount, Organization } from '../../types';
import { api } from '../../api';

interface EquityViewProps {
  transactions: PartnerEquityTransaction[];
  bankAccounts: BankAccount[];
  activeOrg: Organization | null;
  onRefreshData: () => void;
}

export const EquityView: React.FC<EquityViewProps> = ({
  transactions,
  bankAccounts,
  activeOrg,
  onRefreshData
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [partnerName, setPartnerName] = useState('Chaudary Rauf (Partner)');
  const [transactionType, setTransactionType] = useState('capital_contribution');
  const [amount, setAmount] = useState('1000000.00');
  const [bankId, setBankId] = useState(bankAccounts[0]?.id || '');
  const [notes, setNotes] = useState('Additional growth capital contribution');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currency = activeOrg?.base_currency || 'PKR';

  const handleRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.createEquityTransaction({
        partner_name: partnerName,
        transaction_type: transactionType,
        amount,
        date: new Date().toISOString().split('T')[0],
        bank_account_id: bankId,
        notes
      });
      setIsRecording(false);
      onRefreshData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Partner Capital & Equity Architecture</h2>
          <p className="text-xs text-slate-500">Capital contributions, founder equity, partner drawings & profit distributions</p>
        </div>

        <button
          onClick={() => setIsRecording(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Record Capital / Drawing</span>
        </button>
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500">Partner Equity Transactions</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Partner Name</th>
                <th className="py-2.5 px-4">Transaction Type</th>
                <th className="py-2.5 px-4">Settlement Bank</th>
                <th className="py-2.5 px-4">Notes</th>
                <th className="py-2.5 px-4 text-right">Amount ({currency})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((t) => {
                const isContribution = t.transaction_type === 'capital_contribution' || t.transaction_type === 'loan_to_company';

                return (
                  <tr key={t.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-4 font-mono text-slate-600">{t.date}</td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">{t.partner_name}</td>
                    <td className="py-2.5 px-4">
                      <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase ${
                        isContribution ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}>
                        {t.transaction_type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">{t.bank_name || 'Operating Checking'}</td>
                    <td className="py-2.5 px-4 text-slate-500 truncate max-w-xs">{t.notes || '-'}</td>
                    <td className={`py-2.5 px-4 text-right font-mono font-bold ${isContribution ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {isContribution ? '+' : '-'}{Number(t.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Modal */}
      {isRecording && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 text-xs">
            <h3 className="font-bold text-sm text-slate-900">Record Partner Equity Movement</h3>

            <form onSubmit={handleRecord} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Partner Name *</label>
                <input
                  type="text"
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                  className="w-full border border-slate-300 rounded-md p-2"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Transaction Type</label>
                <select
                  value={transactionType}
                  onChange={(e) => setTransactionType(e.target.value)}
                  className="w-full border border-slate-300 rounded-md p-2 bg-white"
                >
                  <option value="capital_contribution">Capital Contribution (Injection)</option>
                  <option value="drawing">Partner Drawing (Withdrawal)</option>
                  <option value="loan_to_company">Partner Loan to Company</option>
                  <option value="profit_distribution">Profit Distribution</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Amount (PKR) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full border border-slate-300 rounded-md p-2 font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Bank Account *</label>
                <select
                  value={bankId}
                  onChange={(e) => setBankId(e.target.value)}
                  className="w-full border border-slate-300 rounded-md p-2 bg-white"
                  required
                >
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.account_name} ({currency} {Number(b.current_balance).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Notes / Board Resolution</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border border-slate-300 rounded-md p-2"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsRecording(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Posting...' : 'Post Equity Movement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

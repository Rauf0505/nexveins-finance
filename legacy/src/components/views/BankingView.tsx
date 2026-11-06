import React from 'react';
import { Landmark, ArrowRightLeft, Plus, CheckCircle2, DollarSign } from 'lucide-react';
import { BankAccount, Organization } from '../../types';

interface BankingViewProps {
  bankAccounts: BankAccount[];
  activeOrg: Organization | null;
  onOpenTransferModal: () => void;
}

export const BankingView: React.FC<BankingViewProps> = ({
  bankAccounts,
  activeOrg,
  onOpenTransferModal
}) => {
  const currency = activeOrg?.base_currency || 'PKR';

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Cash & Treasury Management</h2>
          <p className="text-xs text-slate-500">Corporate bank accounts, foreign currency reserves, and office petty cash</p>
        </div>

        <button
          onClick={onOpenTransferModal}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shrink-0"
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          <span>Internal Bank Transfer</span>
        </button>
      </div>

      {/* Account Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {bankAccounts.map((b) => (
          <div key={b.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-mono text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-sm">
                  {b.is_petty_cash ? 'Petty Cash Float' : 'Commercial Checking'}
                </span>
                <Landmark className="w-4 h-4 text-slate-400" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">{b.account_name}</h3>
              <p className="text-slate-500 text-xs mt-0.5">{b.bank_name}</p>
              <p className="text-[11px] font-mono text-slate-400 mt-1">IBAN/A/C: {b.account_number}</p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-end justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Reconciled Balance</span>
                <div className="text-xl font-bold font-mono text-slate-900 tabular-nums">
                  {b.currency} {Number(b.current_balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Reconciled</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Reconciliation Principles & Controls Card */}
      <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 text-xs space-y-2">
        <h3 className="font-bold text-sm text-emerald-400 flex items-center gap-2">
          <Landmark className="w-4 h-4" />
          <span>Accounting Principle: Cash & Bank Invariant Enforcement</span>
        </h3>
        <p className="text-slate-300 text-[11px] leading-relaxed">
          In Nex Veins Finance, bank account balances are never arbitrary manual numbers. Every increase or decrease is backed by a balanced journal entry: client receipts credit Accounts Receivable, vendor payments debit Accounts Payable, payroll disbursements debit Salaries, and transfers move funds between accounts with strictly zero impact on profit and loss.
        </p>
      </div>
    </div>
  );
};

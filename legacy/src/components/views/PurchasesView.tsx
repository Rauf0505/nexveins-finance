import React, { useState } from 'react';
import {
  ShoppingCart,
  Plus,
  Search,
  CheckCircle2,
  CreditCard,
  Building,
  AlertCircle
} from 'lucide-react';
import { Bill, Vendor, BankAccount, Organization } from '../../types';
import { api } from '../../api';

interface PurchasesViewProps {
  bills: Bill[];
  vendors: Vendor[];
  bankAccounts: BankAccount[];
  activeOrg: Organization | null;
  onOpenBillModal: () => void;
  onRefreshData: () => void;
}

export const PurchasesView: React.FC<PurchasesViewProps> = ({
  bills,
  vendors,
  bankAccounts,
  activeOrg,
  onOpenBillModal,
  onRefreshData
}) => {
  const [subTab, setSubTab] = useState<'bills' | 'vendors'>('bills');
  const [searchQuery, setSearchQuery] = useState('');
  const [payingBill, setPayingBill] = useState<Bill | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payBankId, setPayBankId] = useState(bankAccounts[0]?.id || '');
  const [isProcessing, setIsProcessing] = useState(false);

  const currency = activeOrg?.base_currency || 'PKR';

  const handleApproveBill = async (billId: string) => {
    try {
      await api.approveBill(billId);
      onRefreshData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleOpenPayModal = (bill: Bill) => {
    setPayingBill(bill);
    setPayAmount(bill.balance_due);
    setPayBankId(bankAccounts[0]?.id || '');
  };

  const handleExecutePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingBill || !payBankId || !payAmount) return;

    setIsProcessing(true);
    try {
      await api.payBill(payingBill.id, {
        bank_account_id: payBankId,
        amount: payAmount
      });
      setPayingBill(null);
      onRefreshData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredBills = bills.filter(
    (b) =>
      b.bill_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.vendor_name && b.vendor_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (b.company_name && b.company_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredVendors = vendors.filter(
    (v) =>
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.company_name && v.company_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      v.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Top Action Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubTab('bills')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              subTab === 'bills' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Vendor Bills & Payables ({bills.length})
          </button>
          <button
            onClick={() => setSubTab('vendors')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              subTab === 'vendors' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Suppliers & Vendors ({vendors.length})
          </button>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="relative flex-1 md:w-60">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search bill #, vendor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <button
            onClick={onOpenBillModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-amber-600 text-white hover:bg-amber-500 rounded-lg transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Vendor Bill</span>
          </button>
        </div>
      </div>

      {/* Sub-Tab 1: Bills */}
      {subTab === 'bills' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Bill #</th>
                  <th className="py-3 px-4">Vendor / Supplier</th>
                  <th className="py-3 px-4">Expense Account</th>
                  <th className="py-3 px-4">Bill Date</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Total ({currency})</th>
                  <th className="py-3 px-4 text-right">Balance Due ({currency})</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBills.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{b.bill_number}</td>
                    <td className="py-2.5 px-4 font-medium text-slate-800">
                      <div>{b.company_name || b.vendor_name}</div>
                      {b.description && (
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">{b.description}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 font-mono text-[11px]">
                      {b.expense_account_name || '5030 Cloud Infrastructure'}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-600">{b.bill_date}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-600">{b.due_date}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                      {Number(b.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-amber-700">
                      {Number(b.balance_due).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          b.status === 'paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : b.status === 'approved'
                            ? 'bg-blue-100 text-blue-800'
                            : b.status === 'pending_approval'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {b.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {b.status === 'pending_approval' && (
                          <button
                            onClick={() => handleApproveBill(b.id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-md text-[11px] flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Approve</span>
                          </button>
                        )}
                        {(b.status === 'approved' || b.status === 'partially_paid') && (
                          <button
                            onClick={() => handleOpenPayModal(b)}
                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-md text-[11px] flex items-center gap-1"
                          >
                            <CreditCard className="w-3 h-3" />
                            <span>Pay Bill</span>
                          </button>
                        )}
                        {b.status === 'paid' && (
                          <span className="text-[11px] text-slate-400 font-mono">Settled</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Vendors */}
      {subTab === 'vendors' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Vendor Name</th>
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Tax NTN / EIN</th>
                  <th className="py-3 px-4">Payment Terms</th>
                  <th className="py-3 px-4 text-right">Accounts Payable ({currency})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVendors.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-4 font-bold text-slate-900">{v.name}</td>
                    <td className="py-2.5 px-4 font-medium text-slate-800">{v.company_name || '-'}</td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded-sm bg-slate-100 text-slate-700 font-semibold text-[10px]">
                        {v.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-500">{v.tax_number || 'N/A'}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-600">Net {v.payment_terms_days} Days</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-amber-700">
                      {Number(v.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pay Bill Modal */}
      {payingBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Disburse Payment for Bill</h3>
                <p className="text-slate-500 text-[11px] font-mono">{payingBill.bill_number} · {payingBill.company_name || payingBill.vendor_name}</p>
              </div>
              <button onClick={() => setPayingBill(null)} className="text-slate-400 hover:text-slate-700">
                &times;
              </button>
            </div>

            <form onSubmit={handleExecutePayment} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Payment Amount (PKR) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full border border-slate-300 rounded-md p-2 font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Disburse From Bank Account *</label>
                <select
                  value={payBankId}
                  onChange={(e) => setPayBankId(e.target.value)}
                  className="w-full border border-slate-300 rounded-md p-2 bg-white"
                  required
                >
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.account_name} (Balance: PKR {Number(b.current_balance).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg text-[11px] text-blue-900 font-mono">
                <div>Double-Entry Posting: Debit 2100 Accounts Payable, Credit Bank Account.</div>
                <div>Settles liability in subledger and reflects disbursement in general ledger.</div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setPayingBill(null)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2 font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors disabled:opacity-50"
                >
                  {isProcessing ? 'Processing...' : 'Disburse & Settle AP'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

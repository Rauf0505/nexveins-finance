import React, { useState } from 'react';
import { X, ShoppingCart, AlertCircle } from 'lucide-react';
import { Vendor, Project, ChartAccount } from '../../types';
import { api } from '../../api';

interface NewBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  vendors: Vendor[];
  projects: Project[];
  accounts: ChartAccount[];
}

export const NewBillModal: React.FC<NewBillModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  vendors,
  projects,
  accounts
}) => {
  if (!isOpen) return null;

  const expenseAccounts = accounts.filter((a) => a.type === 'expense');

  const [vendorId, setVendorId] = useState(vendors[0]?.id || '');
  const [projectId, setProjectId] = useState(projects[0]?.id || '');
  const [billNumber, setBillNumber] = useState(`BILL-${Date.now().toString().slice(-6)}`);
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString().split('T')[0]
  );
  const [totalAmount, setTotalAmount] = useState('180000.00');
  const [expenseAccountId, setExpenseAccountId] = useState(expenseAccounts[0]?.id || '');
  const [description, setDescription] = useState('Monthly cloud hosting & development tooling subscription');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorId || !expenseAccountId || !totalAmount) {
      setError('Please fill in all required fields.');
      return;
    }
    setError(null);
    setIsSubmitting(true);

    try {
      await api.createBill({
        vendor_id: vendorId,
        project_id: projectId || undefined,
        bill_number: billNumber,
        bill_date: billDate,
        due_date: dueDate,
        total_amount: totalAmount,
        expense_account_id: expenseAccountId,
        description
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <ShoppingCart className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm font-bold tracking-tight">Record Supplier / Vendor Bill</h2>
              <p className="text-[11px] text-slate-400">Enters bill into approval workflow for Accounts Payable</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Vendor *</label>
              <select
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                className="w-full border border-slate-300 rounded-md p-2 bg-white"
                required
              >
                <option value="">Select Vendor...</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.company_name || v.name} ({v.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Bill Reference # *</label>
              <input
                type="text"
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
                className="w-full border border-slate-300 rounded-md p-2"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Expense Account (GL) *</label>
              <select
                value={expenseAccountId}
                onChange={(e) => setExpenseAccountId(e.target.value)}
                className="w-full border border-slate-300 rounded-md p-2 bg-white"
                required
              >
                {expenseAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} - {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Software House Project</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full border border-slate-300 rounded-md p-2 bg-white"
              >
                <option value="">Company Overhead / G&A</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} - {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Bill Date</label>
              <input
                type="date"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
                className="w-full border border-slate-300 rounded-md p-2"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full border border-slate-300 rounded-md p-2"
                required
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Total Bill Amount (PKR) *</label>
            <input
              type="number"
              step="0.01"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              className="w-full border border-slate-300 rounded-md p-2 font-mono font-bold text-slate-900"
              required
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Description / Memo</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-slate-300 rounded-md p-2 text-xs"
              rows={2}
            />
          </div>

          <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg text-[11px] text-amber-900 font-mono">
            <div>Internal Control Workflow: Bill is recorded as <strong>Pending Approval</strong>.</div>
            <div>Upon manager approval, it posts: Debit Expense, Credit 2100 Accounts Payable.</div>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Record Bill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

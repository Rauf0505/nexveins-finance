import React, { useState } from 'react';
import { X, ArrowRightLeft, AlertCircle } from 'lucide-react';
import { BankAccount } from '../../types';
import { api } from '../../api';

interface NewTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  bankAccounts: BankAccount[];
}

export const NewTransferModal: React.FC<NewTransferModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  bankAccounts
}) => {
  if (!isOpen) return null;

  const [fromBankId, setFromBankId] = useState(bankAccounts[0]?.id || '');
  const [toBankId, setToBankId] = useState(bankAccounts[1]?.id || bankAccounts[0]?.id || '');
  const [amount, setAmount] = useState('100000.00');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState(`TRF-${Date.now().toString().slice(-6)}`);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromBankId || !toBankId || !amount) {
      setError('Please fill in all fields.');
      return;
    }
    if (fromBankId === toBankId) {
      setError('Source and Destination accounts must be different.');
      return;
    }
    setError(null);
    setIsSubmitting(true);

    try {
      await api.transferFunds({
        from_bank_id: fromBankId,
        to_bank_id: toBankId,
        amount,
        transfer_date: transferDate,
        reference
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
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <ArrowRightLeft className="w-5 h-5 text-teal-400" />
            <div>
              <h2 className="text-sm font-bold tracking-tight">Internal Cash / Bank Transfer</h2>
              <p className="text-[11px] text-slate-400">Moves liquidity without affecting income or expense</p>
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
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Transfer From (Source) *</label>
            <select
              value={fromBankId}
              onChange={(e) => setFromBankId(e.target.value)}
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

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Transfer To (Destination) *</label>
            <select
              value={toBankId}
              onChange={(e) => setToBankId(e.target.value)}
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

          <div className="grid grid-cols-2 gap-3">
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
              <label className="font-semibold text-slate-700 block mb-1">Date</label>
              <input
                type="date"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
                className="w-full border border-slate-300 rounded-md p-2"
                required
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Reference / Cheque #</label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full border border-slate-300 rounded-md p-2"
            />
          </div>

          <div className="p-2.5 bg-teal-50/70 border border-teal-200 rounded-lg text-[11px] text-teal-900 font-mono">
            <div>Accounting Rule: Internal transfers debit destination and credit source bank.</div>
            <div>Zero impact on P&L (neither income nor expense is recognized).</div>
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
              {isSubmitting ? 'Transferring...' : 'Execute Transfer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

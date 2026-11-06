import React, { useState } from 'react';
import { X, Receipt, AlertCircle } from 'lucide-react';
import { Client, Invoice, BankAccount } from '../../types';
import { api } from '../../api';

interface NewPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clients: Client[];
  invoices: Invoice[];
  bankAccounts: BankAccount[];
}

export const NewPaymentModal: React.FC<NewPaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  clients,
  invoices,
  bankAccounts
}) => {
  if (!isOpen) return null;

  const [clientId, setClientId] = useState(clients[0]?.id || '');
  const [invoiceId, setInvoiceId] = useState('');
  const [bankAccountId, setBankAccountId] = useState(bankAccounts[0]?.id || '');
  const [amount, setAmount] = useState('500000.00');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [reference, setReference] = useState(`WIRE-${Date.now().toString().slice(-6)}`);
  const [notes, setNotes] = useState('Wire received in operating bank account.');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter invoices for the selected client that have balance due
  const clientInvoices = invoices.filter(
    (inv) => inv.client_id === clientId && Number(inv.balance_due) > 0
  );

  const handleClientChange = (id: string) => {
    setClientId(id);
    const firstInv = invoices.find((inv) => inv.client_id === id && Number(inv.balance_due) > 0);
    if (firstInv) {
      setInvoiceId(firstInv.id);
      setAmount(firstInv.balance_due);
    } else {
      setInvoiceId('');
    }
  };

  const handleInvoiceChange = (id: string) => {
    setInvoiceId(id);
    const selected = invoices.find((i) => i.id === id);
    if (selected) {
      setAmount(selected.balance_due);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !bankAccountId || !amount) {
      setError('Please fill in all required fields.');
      return;
    }
    setError(null);
    setIsSubmitting(true);

    try {
      await api.recordPayment({
        client_id: clientId,
        invoice_id: invoiceId || undefined,
        amount,
        bank_account_id: bankAccountId,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        reference,
        notes
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
            <Receipt className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-sm font-bold tracking-tight">Record Client Payment (Receipt)</h2>
              <p className="text-[11px] text-slate-400">Debits cash/bank and credits Accounts Receivable</p>
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
            <label className="font-semibold text-slate-700 block mb-1">Client *</label>
            <select
              value={clientId}
              onChange={(e) => handleClientChange(e.target.value)}
              className="w-full border border-slate-300 rounded-md p-2 bg-white"
              required
            >
              <option value="">Select Client...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name || c.name} (Balance: PKR {Number(c.balance).toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Allocate to Invoice (Optional)</label>
            <select
              value={invoiceId}
              onChange={(e) => handleInvoiceChange(e.target.value)}
              className="w-full border border-slate-300 rounded-md p-2 bg-white"
            >
              <option value="">Unallocated Customer Advance</option>
              {clientInvoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoice_number} (Total: PKR {Number(inv.total_amount).toLocaleString()} · Due: PKR {Number(inv.balance_due).toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Payment Amount (PKR) *</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full border border-slate-300 rounded-md p-2 font-mono font-bold text-slate-900"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Deposit To Bank Account *</label>
              <select
                value={bankAccountId}
                onChange={(e) => setBankAccountId(e.target.value)}
                className="w-full border border-slate-300 rounded-md p-2 bg-white"
                required
              >
                {bankAccounts.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.account_name} ({b.currency})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Payment Date</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full border border-slate-300 rounded-md p-2"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full border border-slate-300 rounded-md p-2 bg-white"
              >
                <option value="bank_transfer">Direct Bank / Wire Transfer</option>
                <option value="cheque">Bank Cheque / Pay Order</option>
                <option value="cash">Cash / Counter Receipt</option>
                <option value="online">Online Payment Gateway</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Transaction Reference</label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full border border-slate-300 rounded-md p-2"
            />
          </div>

          {/* Double Entry Preview */}
          <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg text-[11px] text-blue-900 font-mono">
            <div className="font-bold mb-0.5">Automated Double-Entry Posting:</div>
            <div>Debit: Cash/Bank Account &rarr; PKR {Number(amount || 0).toFixed(2)}</div>
            <div>Credit: 1100 Accounts Receivable &rarr; PKR {Number(amount || 0).toFixed(2)}</div>
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
              {isSubmitting ? 'Recording...' : 'Record Receipt & Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

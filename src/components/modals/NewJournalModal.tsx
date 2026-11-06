import React, { useState } from 'react';
import { X, Plus, Trash2, BookOpen, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ChartAccount } from '../../types';
import { api } from '../../api';

interface NewJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accounts: ChartAccount[];
}

export const NewJournalModal: React.FC<NewJournalModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  accounts
}) => {
  if (!isOpen) return null;

  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [postingDate, setPostingDate] = useState(new Date().toISOString().split('T')[0]);
  const [memo, setMemo] = useState('Accrual / Adjusting journal entry');
  const [reference, setReference] = useState(`ADJ-${Date.now().toString().slice(-4)}`);

  const [lines, setLines] = useState([
    {
      account_id: accounts[0]?.id || '',
      account_code: accounts[0]?.code || '',
      account_name: accounts[0]?.name || '',
      description: 'Debit adjustment',
      debit: '50000.00',
      credit: '0.00'
    },
    {
      account_id: accounts[1]?.id || '',
      account_code: accounts[1]?.code || '',
      account_name: accounts[1]?.name || '',
      description: 'Credit adjustment',
      debit: '0.00',
      credit: '50000.00'
    }
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addLine = () => {
    setLines([
      ...lines,
      {
        account_id: accounts[0]?.id || '',
        account_code: accounts[0]?.code || '',
        account_name: accounts[0]?.name || '',
        description: '',
        debit: '0.00',
        credit: '0.00'
      }
    ]);
  };

  const removeLine = (idx: number) => {
    if (lines.length > 2) {
      setLines(lines.filter((_, i) => i !== idx));
    }
  };

  const updateLine = (idx: number, field: string, val: any) => {
    const updated = [...lines];
    if (field === 'account_id') {
      const acc = accounts.find((a) => a.id === val);
      updated[idx] = {
        ...updated[idx],
        account_id: val,
        account_code: acc?.code || '',
        account_name: acc?.name || ''
      };
    } else {
      updated[idx] = { ...updated[idx], [field]: val };
    }
    setLines(updated);
  };

  const totalDebits = lines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0);
  const totalCredits = lines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0);
  const difference = Math.abs(totalDebits - totalCredits);
  const isBalanced = difference < 0.005 && totalDebits > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced) {
      setError(`Journal entry is unbalanced! Total Debits (${totalDebits.toFixed(2)}) must equal Total Credits (${totalCredits.toFixed(2)}). Discrepancy: ${difference.toFixed(2)}`);
      return;
    }
    setError(null);
    setIsSubmitting(true);

    try {
      await api.createJournal({
        entry_date: entryDate,
        posting_date: postingDate,
        memo,
        reference,
        lines
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
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-purple-400" />
            <div>
              <h2 className="text-sm font-bold tracking-tight">Post Manual Journal Entry</h2>
              <p className="text-[11px] text-slate-400">Strict Double-Entry Bookkeeping · Total Debits = Total Credits</p>
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

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Entry Date</label>
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full border border-slate-300 rounded-md p-2"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Posting Date</label>
              <input
                type="date"
                value={postingDate}
                onChange={(e) => setPostingDate(e.target.value)}
                className="w-full border border-slate-300 rounded-md p-2"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Reference / Voucher #</label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full border border-slate-300 rounded-md p-2"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Memo / Description *</label>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="w-full border border-slate-300 rounded-md p-2 text-xs"
              required
            />
          </div>

          {/* Journal Lines */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-800">Double-Entry Lines (Minimum 2)</span>
              <button
                type="button"
                onClick={addLine}
                className="flex items-center gap-1 text-[11px] text-purple-600 font-semibold hover:text-purple-700"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Line</span>
              </button>
            </div>

            <div className="space-y-2 border border-slate-200 rounded-lg p-3 bg-slate-50/50">
              {lines.map((ln, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={ln.account_id}
                    onChange={(e) => updateLine(idx, 'account_id', e.target.value)}
                    className="flex-1 border border-slate-300 rounded-md p-1.5 bg-white text-xs truncate"
                    required
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name} ({acc.type.toUpperCase()})
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    placeholder="Line memo"
                    value={ln.description}
                    onChange={(e) => updateLine(idx, 'description', e.target.value)}
                    className="w-44 border border-slate-300 rounded-md p-1.5 bg-white text-xs"
                  />

                  <div className="w-28 relative">
                    <span className="absolute left-2 top-1.5 text-[10px] text-slate-400 font-mono">DR</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={ln.debit}
                      onChange={(e) => {
                        updateLine(idx, 'debit', e.target.value);
                        if (parseFloat(e.target.value) > 0) updateLine(idx, 'credit', '0.00');
                      }}
                      className="w-full pl-7 pr-2 py-1.5 border border-slate-300 rounded-md bg-white text-xs text-right font-mono"
                    />
                  </div>

                  <div className="w-28 relative">
                    <span className="absolute left-2 top-1.5 text-[10px] text-slate-400 font-mono">CR</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={ln.credit}
                      onChange={(e) => {
                        updateLine(idx, 'credit', e.target.value);
                        if (parseFloat(e.target.value) > 0) updateLine(idx, 'debit', '0.00');
                      }}
                      className="w-full pl-7 pr-2 py-1.5 border border-slate-300 rounded-md bg-white text-xs text-right font-mono"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => removeLine(idx)}
                    disabled={lines.length <= 2}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-md disabled:opacity-30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Live Balance Checker */}
          <div className="p-3 bg-slate-100 rounded-lg border border-slate-200 font-mono text-xs">
            <div className="flex items-center justify-between text-slate-700">
              <div>
                <span>Total Debits: </span>
                <strong className="text-slate-900 font-bold">PKR {totalDebits.toFixed(2)}</strong>
              </div>
              <div>
                <span>Total Credits: </span>
                <strong className="text-slate-900 font-bold">PKR {totalCredits.toFixed(2)}</strong>
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between">
              <span className="text-slate-500 text-[11px]">Balance Status:</span>
              {isBalanced ? (
                <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>BALANCED (Difference: 0.00)</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-red-600 font-bold">
                  <AlertCircle className="w-4 h-4" />
                  <span>UNBALANCED (Difference: PKR {difference.toFixed(2)})</span>
                </div>
              )}
            </div>
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
              disabled={isSubmitting || !isBalanced}
              className="px-5 py-2 font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Posting...' : 'Post Balanced Journal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

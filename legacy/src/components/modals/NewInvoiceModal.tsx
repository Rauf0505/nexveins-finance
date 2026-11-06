import React, { useState } from 'react';
import { X, Plus, Trash2, Receipt, AlertCircle } from 'lucide-react';
import { Client, Project } from '../../types';
import { api } from '../../api';

interface NewInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clients: Client[];
  projects: Project[];
}

export const NewInvoiceModal: React.FC<NewInvoiceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  clients,
  projects
}) => {
  if (!isOpen) return null;

  const [clientId, setClientId] = useState(clients[0]?.id || '');
  const [projectId, setProjectId] = useState(projects[0]?.id || '');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0]
  );
  const [taxRatePercent, setTaxRatePercent] = useState('5.00'); // Standard PRA IT Services Tax
  const [notes, setNotes] = useState('Payment due within 30 days via direct wire remittance.');
  const [items, setItems] = useState([
    { description: 'Enterprise Custom Software Development (Sprint 1)', quantity: 1, unit_price: 1500000 }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unit_price: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: string, val: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: val };
    setItems(updated);
  };

  const subtotal = items.reduce((acc, it) => acc + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0);
  const taxAmount = subtotal * ((Number(taxRatePercent) || 0) / 100);
  const totalAmount = subtotal + taxAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      setError('Please select a client.');
      return;
    }
    setError(null);
    setIsSubmitting(true);

    try {
      await api.createInvoice({
        client_id: clientId,
        project_id: projectId || undefined,
        issue_date: issueDate,
        due_date: dueDate,
        tax_rate_percent: taxRatePercent,
        notes,
        items
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
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <Receipt className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-sm font-bold tracking-tight">Issue New Project Invoice</h2>
              <p className="text-[11px] text-slate-400">Generates authoritative double-entry journal & updates receivables</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Client *</label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full border border-slate-300 rounded-md p-2 bg-white text-slate-800"
                required
              >
                <option value="">Select Client...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name || c.name} ({c.currency})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Software House Project</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full border border-slate-300 rounded-md p-2 bg-white text-slate-800"
              >
                <option value="">No Project (Direct Service)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} - {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Issue Date</label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
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

          {/* Line Items */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-800">Invoice Items</span>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold hover:text-emerald-700"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-2 border border-slate-200 rounded-lg p-3 bg-slate-50/50">
              {items.map((it, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Item description / milestone"
                    value={it.description}
                    onChange={(e) => updateItem(idx, 'description', e.target.value)}
                    className="flex-1 border border-slate-300 rounded-md p-1.5 bg-white text-xs"
                    required
                  />
                  <input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={it.quantity}
                    onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                    className="w-16 border border-slate-300 rounded-md p-1.5 bg-white text-xs text-center"
                    required
                  />
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="Price"
                    value={it.unit_price}
                    onChange={(e) => updateItem(idx, 'unit_price', e.target.value)}
                    className="w-28 border border-slate-300 rounded-md p-1.5 bg-white text-xs text-right font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-md"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Tax & Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Tax Rate (e.g. 5% PRA Punjab / 13% SRB / 0% Export)
              </label>
              <select
                value={taxRatePercent}
                onChange={(e) => setTaxRatePercent(e.target.value)}
                className="w-full border border-slate-300 rounded-md p-2 bg-white"
              >
                <option value="0.00">0.0% - Export / Zero Rated</option>
                <option value="5.00">5.0% - Punjab PRA IT Services Tax</option>
                <option value="13.00">13.0% - Sindh SRB Services Tax</option>
                <option value="18.00">18.0% - Standard Sales Tax (Goods)</option>
              </select>
            </div>

            <div className="bg-slate-100 p-3 rounded-lg space-y-1.5 text-right font-mono">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>PKR {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Tax ({taxRatePercent}%):</span>
                <span>PKR {taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-slate-900 font-bold border-t border-slate-300 pt-1 text-sm">
                <span>Total Amount:</span>
                <span className="text-emerald-700">PKR {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Terms / Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-slate-300 rounded-md p-2 text-xs"
              rows={2}
            />
          </div>

          {/* Double-Entry Accounting Preview */}
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg text-[11px] text-emerald-900 font-mono">
            <div className="font-bold mb-1">Automated Double-Entry Posting Preview:</div>
            <div>Debit: 1100 Accounts Receivable &rarr; PKR {totalAmount.toFixed(2)}</div>
            <div>Credit: 4010 Custom Software Development Revenue &rarr; PKR {subtotal.toFixed(2)}</div>
            {taxAmount > 0 && <div>Credit: 2310 PRA/SRB Sales Tax Payable &rarr; PKR {taxAmount.toFixed(2)}</div>}
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
              className="px-5 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-md transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Posting to Ledger...' : 'Issue Invoice & Post to Ledger'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

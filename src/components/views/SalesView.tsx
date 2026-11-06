import React, { useState } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Printer,
  X,
  CreditCard
} from 'lucide-react';
import { Invoice, Client, Organization } from '../../types';

interface SalesViewProps {
  invoices: Invoice[];
  clients: Client[];
  activeOrg: Organization | null;
  onOpenInvoiceModal: () => void;
  onOpenPaymentModal: () => void;
}

export const SalesView: React.FC<SalesViewProps> = ({
  invoices,
  clients,
  activeOrg,
  onOpenInvoiceModal,
  onOpenPaymentModal
}) => {
  const [subTab, setSubTab] = useState<'invoices' | 'clients'>('invoices');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);

  const currency = activeOrg?.base_currency || 'PKR';

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.client_name && inv.client_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (inv.company_name && inv.company_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.company_name && c.company_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-5">
      {/* Top Action Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubTab('invoices')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              subTab === 'invoices' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Invoices & Receivables ({invoices.length})
          </button>
          <button
            onClick={() => setSubTab('clients')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              subTab === 'clients' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Clients Directory ({clients.length})
          </button>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="relative flex-1 md:w-60">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search invoice #, client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenPaymentModal}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors shrink-0"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Record Receipt</span>
            </button>
            <button
              onClick={onOpenInvoiceModal}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 rounded-lg transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Issue Invoice</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Tab 1: Invoices */}
      {subTab === 'invoices' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Client / Company</th>
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">Issue Date</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Total ({currency})</th>
                  <th className="py-3 px-4 text-right">Paid ({currency})</th>
                  <th className="py-3 px-4 text-right">Balance Due ({currency})</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{inv.invoice_number}</td>
                    <td className="py-2.5 px-4 font-medium text-slate-800">
                      <div>{inv.company_name || inv.client_name}</div>
                      {inv.company_name && (
                        <div className="text-[11px] text-slate-400">Attn: {inv.client_name}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">
                      {inv.project_name ? (
                        <div>
                          <span>{inv.project_name}</span>
                          <span className="block font-mono text-[10px] text-slate-400">{inv.project_code}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-600">{inv.issue_date}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-600">{inv.due_date}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                      {Number(inv.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                      {Number(inv.paid_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700">
                      {Number(inv.balance_due).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          inv.status === 'paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : inv.status === 'partially_paid'
                            ? 'bg-blue-100 text-blue-800'
                            : inv.status === 'sent'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {inv.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <button
                        onClick={() => setPreviewInvoice(inv)}
                        className="text-slate-500 hover:text-slate-900 p-1"
                        title="Print / View Invoice"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Clients Directory */}
      {subTab === 'clients' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Client Name</th>
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Tax NTN / VAT</th>
                  <th className="py-3 px-4">Payment Terms</th>
                  <th className="py-3 px-4 text-right">Outstanding Receivable ({currency})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClients.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-4 font-bold text-slate-900">{c.name}</td>
                    <td className="py-2.5 px-4 font-medium text-slate-800">{c.company_name || '-'}</td>
                    <td className="py-2.5 px-4 text-slate-600">
                      <div>{c.email || '-'}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{c.phone || ''}</div>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-500">{c.tax_number || 'Unregistered'}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-600">Net {c.payment_terms_days} Days</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                      {Number(c.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Printable Invoice Preview Drawer/Modal */}
      {previewInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="px-6 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
              <span className="text-xs font-bold">Tax Invoice Document · {previewInvoice.invoice_number}</span>
              <button
                onClick={() => setPreviewInvoice(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-8 overflow-y-auto space-y-6 text-xs text-slate-800 font-sans">
              {/* Invoice Header */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-6">
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-900">NEX VEINS TECHNOLOGIES</h1>
                  <p className="text-slate-500 text-[11px] mt-0.5">Nex Veins Technologies (Pvt) Ltd</p>
                  <p className="text-slate-500 text-[11px]">NTN: PK-NTN-8947219-4 · PRA Reg: PRA-98421-IT</p>
                  <p className="text-slate-500 text-[11px]">DHA Phase 5, Commercial Zone, Lahore, Pakistan</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold font-mono text-emerald-700">{previewInvoice.invoice_number}</div>
                  <div className="text-slate-500 text-[11px] mt-1">Issue Date: <span className="font-mono">{previewInvoice.issue_date}</span></div>
                  <div className="text-slate-500 text-[11px]">Due Date: <span className="font-mono">{previewInvoice.due_date}</span></div>
                  <div className="mt-2 inline-block px-2.5 py-0.5 bg-slate-100 font-bold font-mono text-[10px] uppercase rounded-sm">
                    Status: {previewInvoice.status}
                  </div>
                </div>
              </div>

              {/* Bill To */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Billed To</div>
                <div className="font-bold text-sm text-slate-900">{previewInvoice.company_name || previewInvoice.client_name}</div>
                {previewInvoice.company_name && <div className="text-slate-600">Attn: {previewInvoice.client_name}</div>}
                {previewInvoice.project_name && (
                  <div className="mt-1 text-slate-500 text-[11px]">
                    Project: <strong>{previewInvoice.project_name}</strong> ({previewInvoice.project_code})
                  </div>
                )}
              </div>

              {/* Items Table */}
              <table className="w-full text-xs text-left">
                <thead className="border-b border-slate-300 text-slate-500 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="py-2">Description</th>
                    <th className="py-2 text-center w-16">Qty</th>
                    <th className="py-2 text-right w-28">Unit Price ({currency})</th>
                    <th className="py-2 text-right w-32">Total ({currency})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {previewInvoice.items?.map((it) => (
                    <tr key={it.id}>
                      <td className="py-2.5 font-sans font-medium text-slate-900">{it.description}</td>
                      <td className="py-2.5 text-center text-slate-600">{it.quantity}</td>
                      <td className="py-2.5 text-right text-slate-700">
                        {Number(it.unit_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 text-right font-bold text-slate-900">
                        {Number(it.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals Breakdown */}
              <div className="border-t border-slate-200 pt-4 flex justify-end">
                <div className="w-64 space-y-1.5 font-mono text-right">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span>{Number(previewInvoice.subtotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Tax ({previewInvoice.tax_rate}%):</span>
                    <span>{Number(previewInvoice.tax_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-slate-900 border-t border-slate-300 pt-1.5">
                    <span>Total Amount:</span>
                    <span className="text-emerald-700">{currency} {Number(previewInvoice.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Amount Paid:</span>
                    <span>{Number(previewInvoice.paid_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between font-bold text-xs text-red-700 border-t border-dashed border-slate-300 pt-1">
                    <span>Balance Due:</span>
                    <span>{currency} {Number(previewInvoice.balance_due).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {previewInvoice.notes && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-[11px] text-slate-600">
                  <strong className="block text-slate-700 mb-0.5">Payment Terms & Instructions:</strong>
                  {previewInvoice.notes}
                </div>
              )}
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs">
              <span className="text-slate-400 font-mono">Linked Journal: {previewInvoice.journal_entry_id || 'System Posted'}</span>
              <button
                onClick={() => window.print()}
                className="px-4 py-1.5 bg-slate-900 text-white rounded-md font-bold hover:bg-slate-800"
              >
                Print Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

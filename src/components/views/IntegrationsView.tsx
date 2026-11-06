import React, { useState, useEffect } from 'react';
import { Cpu, Play, CheckCircle2, Copy, ShieldCheck, Terminal, AlertCircle } from 'lucide-react';
import { IntegrationEvent, Organization } from '../../types';
import { api } from '../../api';

interface IntegrationsViewProps {
  activeOrg: Organization | null;
  onRefreshData: () => void;
}

export const IntegrationsView: React.FC<IntegrationsViewProps> = ({
  activeOrg,
  onRefreshData
}) => {
  const [events, setEvents] = useState<IntegrationEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Simulator state
  const [sourceApp, setSourceApp] = useState('nex-pos-terminal-04');
  const [orderId, setOrderId] = useState(`ORD-${Date.now().toString().slice(-5)}`);
  const [subtotal, setSubtotal] = useState('45000.00');
  const [taxAmount, setTaxAmount] = useState('2250.00');
  const [tenderType, setTenderType] = useState('cash');
  const [idempotencyKey, setIdempotencyKey] = useState(`pos-event-${Date.now()}`);
  const [simResult, setSimResult] = useState<any | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const currency = activeOrg?.base_currency || 'PKR';

  const loadEvents = async () => {
    setIsLoading(true);
    try {
      const res = await api.getIntegrationEvents();
      setEvents(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [activeOrg?.id]);

  const handleSimulateSale = async () => {
    setIsSimulating(true);
    setSimResult(null);
    try {
      const res = await api.simulatePosSale({
        idempotency_key: idempotencyKey,
        source_app: sourceApp,
        external_order_id: orderId,
        subtotal,
        tax_amount: taxAmount,
        tender_type: tenderType
      });
      setSimResult(res);
      loadEvents();
      onRefreshData();
    } catch (err: any) {
      setSimResult({ status: 'error', error: err.message });
    } finally {
      setIsSimulating(false);
    }
  };

  const handleRetestDuplicateKey = async () => {
    // Keep the SAME idempotency key to test duplicate interception
    setIsSimulating(true);
    try {
      const res = await api.simulatePosSale({
        idempotency_key: idempotencyKey,
        source_app: sourceApp,
        external_order_id: orderId,
        subtotal,
        tax_amount: taxAmount,
        tender_type: tenderType
      });
      setSimResult(res);
      loadEvents();
    } catch (err: any) {
      setSimResult({ status: 'error', error: err.message });
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Mode B — Client Finance Module & Integration API</h2>
          <p className="text-xs text-slate-500">Reusable financial engine for POS, ERP, and software-house client applications</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] bg-slate-100 text-slate-700 px-2 py-1 rounded-md border border-slate-200">
            Base Endpoint: <strong className="text-emerald-700">/api/v1/client-finance/*</strong>
          </span>
        </div>
      </div>

      {/* Integration Simulator & Architectural Specifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Simulator Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Terminal className="w-4 h-4 text-emerald-600" />
              <span>External POS Sale Event Simulator</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">POST /pos-sale</span>
          </div>

          <div className="space-y-3 font-mono">
            <div>
              <label className="font-sans font-semibold text-slate-700 block mb-1">Idempotency-Key Header *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={idempotencyKey}
                  onChange={(e) => setIdempotencyKey(e.target.value)}
                  className="flex-1 border border-slate-300 rounded-md p-1.5 text-xs bg-slate-50"
                  required
                />
                <button
                  type="button"
                  onClick={() => setIdempotencyKey(`pos-event-${Date.now()}`)}
                  className="px-2 py-1 font-sans text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md text-[11px]"
                >
                  Regenerate
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-sans font-semibold text-slate-700 block mb-1">Source Application</label>
                <input
                  type="text"
                  value={sourceApp}
                  onChange={(e) => setSourceApp(e.target.value)}
                  className="w-full border border-slate-300 rounded-md p-1.5 text-xs"
                />
              </div>
              <div>
                <label className="font-sans font-semibold text-slate-700 block mb-1">External Order #</label>
                <input
                  type="text"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="w-full border border-slate-300 rounded-md p-1.5 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="font-sans font-semibold text-slate-700 block mb-1">Subtotal ({currency})</label>
                <input
                  type="number"
                  value={subtotal}
                  onChange={(e) => setSubtotal(e.target.value)}
                  className="w-full border border-slate-300 rounded-md p-1.5 text-xs font-bold"
                />
              </div>
              <div>
                <label className="font-sans font-semibold text-slate-700 block mb-1">Tax Amount ({currency})</label>
                <input
                  type="number"
                  value={taxAmount}
                  onChange={(e) => setTaxAmount(e.target.value)}
                  className="w-full border border-slate-300 rounded-md p-1.5 text-xs"
                />
              </div>
              <div>
                <label className="font-sans font-semibold text-slate-700 block mb-1">Tender Type</label>
                <select
                  value={tenderType}
                  onChange={(e) => setTenderType(e.target.value)}
                  className="w-full border border-slate-300 rounded-md p-1.5 text-xs font-sans bg-white"
                >
                  <option value="cash">Cash Tender</option>
                  <option value="card">Card POS</option>
                  <option value="raast">Raast Instant</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={handleSimulateSale}
              disabled={isSimulating}
              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-md text-xs flex items-center justify-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Simulate POS Ingestion</span>
            </button>

            <button
              onClick={handleRetestDuplicateKey}
              disabled={isSimulating}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-md text-xs"
              title="Sends the identical idempotency key to verify duplicate-posting rejection"
            >
              Test Idempotency Rejection
            </button>
          </div>

          {/* Response Inspector */}
          {simResult && (
            <div className={`p-3 rounded-lg border font-mono text-[11px] ${
              simResult.status === 'duplicate_ignored'
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : simResult.status === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-red-50 border-red-300 text-red-900'
            }`}>
              <div className="font-bold flex items-center gap-1.5 mb-1 font-sans">
                {simResult.status === 'duplicate_ignored' ? (
                  <>
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    <span>Idempotency Intercepted: Duplicate Ingestion Prevented!</span>
                  </>
                ) : simResult.status === 'success' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Ledger Ingested & Balanced Journal Posted!</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span>Error</span>
                  </>
                )}
              </div>
              <pre className="overflow-x-auto text-[10px]">
                {JSON.stringify(simResult, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Integration Architecture Documentation */}
        <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 space-y-3 text-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-bold mb-1">
              <Cpu className="w-4 h-4" />
              <span>Mode B Integration Principles</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              When software-house clients integrate POS, custom ERPs, or billing platforms:
            </p>

            <ul className="space-y-2 text-[11px] text-slate-300 mt-3 list-disc pl-4">
              <li>
                <strong>No direct ledger writes:</strong> Client applications never write directly into accounting tables. All operations flow through validated, versioned domain services.
              </li>
              <li>
                <strong>Idempotency by design:</strong> Every external financial request carries an `Idempotency-Key`. Re-sent network packets are intercepted safely without duplicate journal entries.
              </li>
              <li>
                <strong>Configurable account mappings:</strong> POS sales automatically map to configured Sales Revenue (4010), Sales Tax (2310), and Cash/Bank accounts without hardcoding.
              </li>
              <li>
                <strong>Multi-Tenant Data Partitioning:</strong> External client applications operate within their own isolated tenant sandbox using organization-scoped credentials.
              </li>
            </ul>
          </div>

          <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 text-[11px] font-mono text-emerald-400">
            Status: API Gateway Ready · Idempotency Store Active · Webhooks Outbox Armed
          </div>
        </div>
      </div>

      {/* Integration Events Stream */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500">
            Ingested Integration Events ({events.length})
          </h3>
          <button
            onClick={loadEvents}
            className="text-xs text-slate-600 hover:text-slate-900 font-medium"
          >
            Refresh Stream
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">Source App</th>
                <th className="py-2.5 px-4">Event Type</th>
                <th className="py-2.5 px-4">Idempotency Key</th>
                <th className="py-2.5 px-4">Resulting Journal ID</th>
                <th className="py-2.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {events.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400 font-sans">
                    No integration events ingested yet. Use the simulator above to post an external transaction.
                  </td>
                </tr>
              ) : (
                events.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-4 text-slate-600">{evt.created_at}</td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">{evt.source_app}</td>
                    <td className="py-2.5 px-4 text-slate-700">{evt.event_type}</td>
                    <td className="py-2.5 px-4 text-slate-500 truncate max-w-xs">{evt.idempotency_key}</td>
                    <td className="py-2.5 px-4 text-emerald-700 font-bold">{evt.processed_journal_id || '-'}</td>
                    <td className="py-2.5 px-4 text-center">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {evt.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  FolderKanban,
  Plus,
  Search,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Clock,
  X
} from 'lucide-react';
import { Project, Client, Organization } from '../../types';
import { api } from '../../api';

interface ProjectsViewProps {
  projects: Project[];
  clients: Client[];
  activeOrg: Organization | null;
  onRefreshData: () => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  clients,
  activeOrg,
  onRefreshData
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  // Form states
  const [code, setCode] = useState(`NV-PRJ-${new Date().getFullYear()}-03`);
  const [name, setName] = useState('');
  const [clientId, setClientId] = useState(clients[0]?.id || '');
  const [billingModel, setBillingModel] = useState<'fixed_price' | 'hourly' | 'milestone' | 'retainer'>('milestone');
  const [contractValue, setContractValue] = useState('3000000.00');
  const [budgetBaseline, setBudgetBaseline] = useState('1800000.00');
  const [plannedLabor, setPlannedLabor] = useState('1400000.00');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currency = activeOrg?.base_currency || 'PKR';

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name) return;

    setIsSubmitting(true);
    try {
      await api.createProject({
        code,
        name,
        client_id: clientId || undefined,
        billing_model: billingModel,
        contract_value: contractValue,
        budget_cost_baseline: budgetBaseline,
        planned_labor_cost: plannedLabor,
        start_date: new Date().toISOString().split('T')[0]
      });
      setIsCreatingProject(false);
      setName('');
      onRefreshData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.client_name && p.client_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Software House Project Financials</h2>
          <p className="text-xs text-slate-500">Track client contract value, budget cost baselines, actual costs & gross margins</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search project code or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none"
            />
          </div>

          <button
            onClick={() => setIsCreatingProject(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Software Project</span>
          </button>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredProjects.map((p) => {
          const contract = Number(p.contract_value) || 0;
          const invoiced = Number(p.invoiced_amount) || 0;
          const collected = Number(p.collected_amount) || 0;
          const actualCost = Number(p.actual_cost) || 0;
          const baseline = Number(p.budget_cost_baseline) || 0;
          const grossProfit = Number(p.gross_profit) || 0;
          const margin = p.margin_percent || '0.0';
          const receivables = Number(p.outstanding_receivables) || 0;

          return (
            <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-sm">
                      {p.code}
                    </span>
                    <span className="font-mono text-[10px] text-slate-500 uppercase bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-sm">
                      {p.billing_model.replace('_', ' ')}
                    </span>
                  </div>
                  <span className="font-mono text-emerald-600 font-bold text-sm">{margin}% Margin</span>
                </div>

                <h3 className="font-bold text-sm text-slate-900">{p.name}</h3>
                <p className="text-slate-500 text-xs mt-0.5">Client: <strong>{p.company_name || p.client_name || 'Direct'}</strong></p>

                {/* Key Numbers Grid */}
                <div className="grid grid-cols-3 gap-2 mt-4 p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Contract Value</span>
                    <strong className="text-slate-900">{currency} {contract.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Invoiced</span>
                    <strong className="text-slate-900">{currency} {invoiced.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Collected</span>
                    <strong className="text-emerald-700">{currency} {collected.toLocaleString()}</strong>
                  </div>
                </div>

                {/* Cost & Profitability Bar */}
                <div className="grid grid-cols-3 gap-2 mt-2 p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Cost Baseline</span>
                    <strong className="text-slate-700">{currency} {baseline.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Actual Cost</span>
                    <strong className="text-amber-700">{currency} {actualCost.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Gross Profit</span>
                    <strong className="text-emerald-600 font-bold">{currency} {grossProfit.toLocaleString()}</strong>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>Uncollected AR: <strong className="text-slate-800">{currency} {receivables.toLocaleString()}</strong></span>
                <span className="capitalize text-emerald-600 font-semibold">{p.status}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Project Modal */}
      {isCreatingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-bold text-sm text-slate-900">Create New Software House Project</h3>
              <button onClick={() => setIsCreatingProject(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Project Code *</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full border border-slate-300 rounded-md p-2 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Billing Model</label>
                  <select
                    value={billingModel}
                    onChange={(e) => setBillingModel(e.target.value as any)}
                    className="w-full border border-slate-300 rounded-md p-2 bg-white"
                  >
                    <option value="milestone">Milestone Based</option>
                    <option value="fixed_price">Fixed Price</option>
                    <option value="hourly">Hourly T&M</option>
                    <option value="retainer">Monthly Retainer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Project Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Core Banking Remittance Gateway"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-slate-300 rounded-md p-2"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Client</label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full border border-slate-300 rounded-md p-2 bg-white"
                >
                  <option value="">No Client (Internal)</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name || c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Contract Value</label>
                  <input
                    type="number"
                    step="1000"
                    value={contractValue}
                    onChange={(e) => setContractValue(e.target.value)}
                    className="w-full border border-slate-300 rounded-md p-2 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Cost Baseline</label>
                  <input
                    type="number"
                    step="1000"
                    value={budgetBaseline}
                    onChange={(e) => setBudgetBaseline(e.target.value)}
                    className="w-full border border-slate-300 rounded-md p-2 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Planned Labor</label>
                  <input
                    type="number"
                    step="1000"
                    value={plannedLabor}
                    onChange={(e) => setPlannedLabor(e.target.value)}
                    className="w-full border border-slate-300 rounded-md p-2 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreatingProject(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

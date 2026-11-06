import React, { useState } from 'react';
import { Building2, Plus, ShieldCheck, CheckCircle2, Lock, UserCheck } from 'lucide-react';
import { Organization } from '../../types';
import { api } from '../../api';

interface SettingsViewProps {
  organizations: Organization[];
  activeOrg: Organization | null;
  onSwitchOrg: (orgId: string) => void;
  userRole: string;
  onSwitchRole: (role: string) => void;
  onRefreshData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  organizations,
  activeOrg,
  onSwitchOrg,
  userRole,
  onSwitchRole,
  onRefreshData
}) => {
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgCurrency, setNewOrgCurrency] = useState('PKR');
  const [newOrgCountry, setNewOrgCountry] = useState('Pakistan');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName) return;

    setIsSubmitting(true);
    try {
      const created = await api.createOrganization({
        name: newOrgName,
        base_currency: newOrgCurrency,
        country: newOrgCountry
      });
      setIsCreatingOrg(false);
      setNewOrgName('');
      onRefreshData();
      onSwitchOrg(created.id);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const roleDefinitions = [
    { id: 'admin', name: 'Platform / Org Admin', desc: 'Unrestricted access to all accounting configurations, ledger posting, organization settings, and approval rules.' },
    { id: 'finance_manager', name: 'Finance Manager', desc: 'Can approve vendor bills, disburse payroll, post manual journals, and view all financial statements.' },
    { id: 'accountant', name: 'Senior Accountant', desc: 'Can create and post invoices, bills, payments, and view general ledger & trial balance.' },
    { id: 'ar_officer', name: 'AR Officer', desc: 'Restricted to client management, invoicing, and recording collections/receipts.' },
    { id: 'ap_officer', name: 'AP Officer', desc: 'Restricted to vendor bills, supplier payments, and expense classification.' },
    { id: 'auditor', name: 'Statutory Auditor', desc: 'Strictly Read-Only access to general ledger, trial balance, and immutable audit trail.' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Multi-Tenant Management & Roles</h2>
          <p className="text-xs text-slate-500">Configure tenant isolation, organization books, and role-based access control</p>
        </div>

        <button
          onClick={() => setIsCreatingOrg(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Provision New Tenant Organization</span>
        </button>
      </div>

      {/* Organizations List */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <h3 className="font-bold text-sm text-slate-900">Configured Tenant Organizations</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {organizations.map((org) => {
            const isActive = org.id === activeOrg?.id;

            return (
              <div
                key={org.id}
                className={`p-4 rounded-xl border transition-all ${
                  isActive
                    ? 'border-emerald-500 bg-emerald-50/40 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${
                      isActive ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {org.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{org.name}</h4>
                      <p className="text-slate-500 text-[11px] font-mono">Tenant ID: {org.id}</p>
                    </div>
                  </div>

                  {isActive ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full font-mono">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>ACTIVE</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => onSwitchOrg(org.id)}
                      className="px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                    >
                      Switch Tenant
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 font-mono text-[11px] text-slate-600">
                  <div>Base Currency: <strong className="text-slate-900">{org.base_currency}</strong></div>
                  <div>Country: <strong className="text-slate-900">{org.country}</strong></div>
                  <div>Tax NTN: <strong className="text-slate-900">{org.tax_id || 'Configured'}</strong></div>
                  <div>Fiscal Start: <strong className="text-slate-900">Month {org.fiscal_year_start_month} (July)</strong></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Role-Based Access Control Simulation */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div>
          <h3 className="font-bold text-sm text-slate-900">Role-Based Access Control (RBAC)</h3>
          <p className="text-xs text-slate-500">Switch current active role to test server-side authorization boundaries</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          {roleDefinitions.map((r) => {
            const isCurrent = userRole === r.id;

            return (
              <div
                key={r.id}
                onClick={() => onSwitchRole(r.id)}
                className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                  isCurrent
                    ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold">{r.name}</span>
                  {isCurrent && (
                    <span className="text-[10px] bg-emerald-500 text-slate-950 font-bold px-1.5 py-0.2 rounded-sm font-mono">
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className={`text-[11px] mt-1 leading-relaxed ${isCurrent ? 'text-slate-300' : 'text-slate-500'}`}>
                  {r.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Org Modal */}
      {isCreatingOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 text-xs">
            <h3 className="font-bold text-sm text-slate-900">Provision New Tenant Organization</h3>

            <form onSubmit={handleCreateTenant} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Company / Organization Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Apex POS Client Inc."
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  className="w-full border border-slate-300 rounded-md p-2"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Base Currency</label>
                  <select
                    value={newOrgCurrency}
                    onChange={(e) => setNewOrgCurrency(e.target.value)}
                    className="w-full border border-slate-300 rounded-md p-2 bg-white font-mono"
                  >
                    <option value="PKR">PKR - Pakistani Rupee</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="AED">AED - UAE Dirham</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Country</label>
                  <input
                    type="text"
                    value={newOrgCountry}
                    onChange={(e) => setNewOrgCountry(e.target.value)}
                    className="w-full border border-slate-300 rounded-md p-2"
                  />
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-md text-[11px] text-slate-600 font-mono">
                Isolated sandbox provisioned: New Chart of Accounts, Bank checking account, and fiscal period automatically bootstrapped.
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreatingOrg(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Provisioning...' : 'Provision Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

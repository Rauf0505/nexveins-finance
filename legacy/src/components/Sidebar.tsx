import React from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Receipt,
  ShoppingCart,
  Landmark,
  FolderKanban,
  FileSpreadsheet,
  Users,
  Coins,
  ShieldCheck,
  Cpu,
  Settings,
  Building2,
  Box
} from 'lucide-react';
import { Organization } from '../types';

interface SidebarProps {
  currentView: string;
  onSelectView: (view: string) => void;
  activeOrg: Organization | null;
  organizations: Organization[];
  onSwitchOrg: (orgId: string) => void;
  userRole: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  activeOrg,
  organizations,
  onSwitchOrg,
  userRole
}) => {
  const navSections = [
    {
      title: 'CORE PLATFORM',
      items: [
        { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
        { id: 'accounting', label: 'Accounting Core', icon: BookOpen },
        { id: 'reports', label: 'Financial Statements', icon: FileSpreadsheet }
      ]
    },
    {
      title: 'OPERATIONS',
      items: [
        { id: 'sales', label: 'Sales & Invoices', icon: Receipt },
        { id: 'purchases', label: 'Purchases & Bills', icon: ShoppingCart },
        { id: 'banking', label: 'Cash & Banking', icon: Landmark },
        { id: 'projects', label: 'Software House Projects', icon: FolderKanban }
      ]
    },
    {
      title: 'ADVANCED FINANCE',
      items: [
        { id: 'payroll', label: 'Payroll Accounting', icon: Users },
        { id: 'equity', label: 'Partner Equity', icon: Coins },
        { id: 'assets', label: 'Fixed Assets', icon: Box },
        { id: 'integrations', label: 'Client Finance API (Mode B)', icon: Cpu }
      ]
    },
    {
      title: 'CONTROLS & COMPLIANCE',
      items: [
        { id: 'audit', label: 'Audit Trail', icon: ShieldCheck },
        { id: 'settings', label: 'Organization & Tenancy', icon: Settings }
      ]
    }
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 h-screen border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-lg">
            NV
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-white font-bold text-sm tracking-tight truncate">NEX VEINS</h1>
            <p className="text-slate-400 text-xs font-mono">FINANCE ERP · V1.0</p>
          </div>
        </div>

        {/* Multi-Tenant Organization Switcher */}
        <div className="mt-4 pt-3 border-t border-slate-800/80">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1.5 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            Active Organization
          </label>
          <select
            value={activeOrg?.id || ''}
            onChange={(e) => onSwitchOrg(e.target.value)}
            className="w-full bg-slate-800/90 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 truncate"
          >
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name} ({org.base_currency})
              </option>
            ))}
          </select>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400 px-0.5">
            <span>Currency: <strong className="text-slate-200 font-mono">{activeOrg?.base_currency || 'PKR'}</strong></span>
            <span>Role: <strong className="text-emerald-400 capitalize">{userRole.replace('_', ' ')}</strong></span>
          </div>
        </div>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-6">
        {navSections.map((sec) => (
          <div key={sec.title}>
            <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              {sec.title}
            </div>
            <ul className="space-y-0.5">
              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => onSelectView(item.id)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium transition-colors text-left ${
                        isActive
                          ? 'bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/30'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom Tenant Isolation Note */}
      <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400 bg-slate-950/40">
        <div className="flex items-center gap-1.5 text-slate-300">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="font-semibold truncate">Multi-Tenant Isolation Enforced</span>
        </div>
        <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
          All financial data is strictly partitioned by Organization ID: {activeOrg?.id}
        </p>
      </div>
    </aside>
  );
};

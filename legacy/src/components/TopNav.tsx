import React, { useState } from 'react';
import {
  Plus,
  PlayCircle,
  Shield,
  Receipt,
  ShoppingCart,
  BookOpen,
  ArrowRightLeft
} from 'lucide-react';
import { Organization } from '../types';

interface TopNavProps {
  currentView: string;
  activeOrg: Organization | null;
  userRole: string;
  onSwitchRole: (role: string) => void;
  onOpenModal: (modalType: string) => void;
  onOpenScenarioModal: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentView,
  activeOrg,
  userRole,
  onSwitchRole,
  onOpenModal,
  onOpenScenarioModal
}) => {
  const [showQuickMenu, setShowQuickMenu] = useState(false);

  const viewTitles: Record<string, string> = {
    dashboard: 'Financial Overview & KPIs',
    accounting: 'General Ledger & Chart of Accounts',
    reports: 'Financial Statements & Reports',
    sales: 'Sales, Invoicing & Receivables',
    purchases: 'Purchases, Vendor Bills & Payables',
    banking: 'Cash & Bank Accounts',
    projects: 'Software House Project Finance',
    payroll: 'Payroll Accounting & Compensation',
    equity: 'Partner Capital & Equity',
    assets: 'Fixed Asset Register & Depreciation',
    integrations: 'Client Finance API & POS/ERP Integration (Mode B)',
    audit: 'Immutable Audit Trail',
    settings: 'Multi-Tenant Management & Roles'
  };

  const roles = [
    { id: 'admin', label: 'Platform / Org Admin' },
    { id: 'finance_manager', label: 'Finance Manager' },
    { id: 'accountant', label: 'Senior Accountant' },
    { id: 'ar_officer', label: 'AR Officer' },
    { id: 'ap_officer', label: 'AP Officer' },
    { id: 'auditor', label: 'Statutory Auditor (Read Only)' }
  ];

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-6 shrink-0 z-20">
      {/* Zone 1: Breadcrumb Trail */}
      <div className="flex items-center gap-2.5 text-xs text-slate-500 min-w-0">
        <span className="font-semibold text-slate-900 truncate">
          {activeOrg?.name || 'Nex Veins Technologies'}
        </span>
        <span className="text-slate-400">/</span>
        <span className="text-slate-700 font-medium truncate">
          {viewTitles[currentView] || 'Overview'}
        </span>
      </div>

      {/* Zone 2: Acceptance Scenario Quick Trigger & Role Switcher */}
      <div className="flex items-center gap-4">
        {/* First Release Acceptance Scenario Runner */}
        <button
          onClick={onOpenScenarioModal}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors whitespace-nowrap shadow-xs"
        >
          <PlayCircle className="w-3.5 h-3.5 text-emerald-600" />
          <span>Release Acceptance Test (18 Steps)</span>
        </button>

        {/* Security & Role Simulator for RBAC testing */}
        <div className="hidden lg:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1">
          <Shield className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[11px] text-slate-500 font-medium">Role:</span>
          <select
            value={userRole}
            onChange={(e) => onSwitchRole(e.target.value)}
            className="bg-transparent text-xs text-slate-800 font-medium focus:outline-none cursor-pointer"
          >
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Zone 3: Primary Action (Quick Transaction Menu) */}
      <div className="relative">
        <button
          onClick={() => setShowQuickMenu(!showQuickMenu)}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Transaction</span>
        </button>

        {showQuickMenu && (
          <div
            className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-lg shadow-lg py-1.5 z-50 text-xs"
            onMouseLeave={() => setShowQuickMenu(false)}
          >
            <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Create Transaction
            </div>
            <button
              onClick={() => {
                onOpenModal('invoice');
                setShowQuickMenu(false);
              }}
              className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2.5"
            >
              <Receipt className="w-4 h-4 text-emerald-600" />
              <span>Issue Project Invoice (AR)</span>
            </button>
            <button
              onClick={() => {
                onOpenModal('payment');
                setShowQuickMenu(false);
              }}
              className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2.5"
            >
              <Receipt className="w-4 h-4 text-blue-600" />
              <span>Record Client Receipt</span>
            </button>
            <button
              onClick={() => {
                onOpenModal('bill');
                setShowQuickMenu(false);
              }}
              className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2.5"
            >
              <ShoppingCart className="w-4 h-4 text-amber-600" />
              <span>Record Vendor Bill (AP)</span>
            </button>
            <button
              onClick={() => {
                onOpenModal('journal');
                setShowQuickMenu(false);
              }}
              className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2.5"
            >
              <BookOpen className="w-4 h-4 text-purple-600" />
              <span>Manual Journal Entry</span>
            </button>
            <button
              onClick={() => {
                onOpenModal('transfer');
                setShowQuickMenu(false);
              }}
              className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2.5"
            >
              <ArrowRightLeft className="w-4 h-4 text-teal-600" />
              <span>Internal Bank Transfer</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

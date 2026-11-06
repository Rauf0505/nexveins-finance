import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopNav } from './components/TopNav';
import { AcceptanceScenarioModal } from './components/AcceptanceScenarioModal';
import { NewInvoiceModal } from './components/modals/NewInvoiceModal';
import { NewPaymentModal } from './components/modals/NewPaymentModal';
import { NewBillModal } from './components/modals/NewBillModal';
import { NewJournalModal } from './components/modals/NewJournalModal';
import { NewTransferModal } from './components/modals/NewTransferModal';

// Views
import { DashboardView } from './components/views/DashboardView';
import { AccountingView } from './components/views/AccountingView';
import { SalesView } from './components/views/SalesView';
import { PurchasesView } from './components/views/PurchasesView';
import { BankingView } from './components/views/BankingView';
import { ProjectsView } from './components/views/ProjectsView';
import { ReportsView } from './components/views/ReportsView';
import { PayrollView } from './components/views/PayrollView';
import { EquityView } from './components/views/EquityView';
import { AssetsView } from './components/views/AssetsView';
import { IntegrationsView } from './components/views/IntegrationsView';
import { AuditView } from './components/views/AuditView';
import { SettingsView } from './components/views/SettingsView';

import {
  Organization,
  User,
  ChartAccount,
  JournalEntry,
  Invoice,
  Client,
  Bill,
  Vendor,
  BankAccount,
  Project,
  PayrollRun,
  PartnerEquityTransaction,
  FixedAsset,
  DashboardKPIs
} from './types';
import { api } from './api';

export function App() {
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [activeOrg, setActiveOrg] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [userRole, setUserRole] = useState<string>('admin');

  // Master Data
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [accounts, setAccounts] = useState<ChartAccount[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [equityTransactions, setEquityTransactions] = useState<PartnerEquityTransaction[]>([]);
  const [assets, setAssets] = useState<FixedAsset[]>([]);

  // Modals
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [isScenarioModalOpen, setIsScenarioModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async (orgId?: string) => {
    setIsLoading(true);
    try {
      // 1. Load Auth & Organizations
      const auth = await api.getAuth();
      setOrganizations(auth.organizations);
      const currentOrg = orgId
        ? auth.organizations.find((o) => o.id === orgId) || auth.active_organization
        : auth.active_organization;
      setActiveOrg(currentOrg);
      setUserRole(api.getActiveRole());

      // 2. Load Core Data
      const [
        kpiRes,
        accRes,
        jrnRes,
        invRes,
        cliRes,
        billRes,
        venRes,
        bankRes,
        projRes,
        payRes,
        eqRes,
        astRes
      ] = await Promise.all([
        api.getDashboardKPIs(),
        api.getAccounts(),
        api.getJournals(),
        api.getInvoices(),
        api.getClients(),
        api.getBills(),
        api.getVendors(),
        api.getBankAccounts(),
        api.getProjects(),
        api.getPayroll(),
        api.getEquity(),
        api.getAssets()
      ]);

      setKpis(kpiRes);
      setAccounts(accRes);
      setJournals(jrnRes);
      setInvoices(invRes);
      setClients(cliRes);
      setBills(billRes);
      setVendors(venRes);
      setBankAccounts(bankRes);
      setProjects(projRes);
      setPayrollRuns(payRes);
      setEquityTransactions(eqRes);
      setAssets(astRes);
    } catch (err) {
      console.error('Failed to load application data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSwitchOrg = async (orgId: string) => {
    await api.switchContext(orgId);
    await loadData(orgId);
  };

  const handleSwitchRole = async (role: string) => {
    setUserRole(role);
    await api.switchContext(api.getActiveOrgId(), undefined, role);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 font-sans antialiased">
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        onSelectView={setCurrentView}
        activeOrg={activeOrg}
        organizations={organizations}
        onSwitchOrg={handleSwitchOrg}
        userRole={userRole}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Bar Contract */}
        <TopNav
          currentView={currentView}
          activeOrg={activeOrg}
          userRole={userRole}
          onSwitchRole={handleSwitchRole}
          onOpenModal={(modal) => setActiveModal(modal)}
          onOpenScenarioModal={() => setIsScenarioModalOpen(true)}
        />

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto p-6">
          {isLoading && !kpis ? (
            <div className="flex items-center justify-center h-64 text-slate-400 font-mono text-xs">
              Loading Nex Veins Finance Core...
            </div>
          ) : (
            <>
              {currentView === 'dashboard' && (
                <DashboardView
                  kpis={kpis}
                  recentJournals={journals}
                  projects={projects}
                  activeOrg={activeOrg}
                  onNavigateToView={setCurrentView}
                  onOpenScenarioModal={() => setIsScenarioModalOpen(true)}
                  onOpenModal={(m) => setActiveModal(m)}
                />
              )}

              {currentView === 'accounting' && (
                <AccountingView
                  accounts={accounts}
                  journals={journals}
                  activeOrg={activeOrg}
                  onOpenJournalModal={() => setActiveModal('journal')}
                  onRefreshData={() => loadData(activeOrg?.id)}
                />
              )}

              {currentView === 'reports' && (
                <ReportsView activeOrg={activeOrg} />
              )}

              {currentView === 'sales' && (
                <SalesView
                  invoices={invoices}
                  clients={clients}
                  activeOrg={activeOrg}
                  onOpenInvoiceModal={() => setActiveModal('invoice')}
                  onOpenPaymentModal={() => setActiveModal('payment')}
                />
              )}

              {currentView === 'purchases' && (
                <PurchasesView
                  bills={bills}
                  vendors={vendors}
                  bankAccounts={bankAccounts}
                  activeOrg={activeOrg}
                  onOpenBillModal={() => setActiveModal('bill')}
                  onRefreshData={() => loadData(activeOrg?.id)}
                />
              )}

              {currentView === 'banking' && (
                <BankingView
                  bankAccounts={bankAccounts}
                  activeOrg={activeOrg}
                  onOpenTransferModal={() => setActiveModal('transfer')}
                />
              )}

              {currentView === 'projects' && (
                <ProjectsView
                  projects={projects}
                  clients={clients}
                  activeOrg={activeOrg}
                  onRefreshData={() => loadData(activeOrg?.id)}
                />
              )}

              {currentView === 'payroll' && (
                <PayrollView
                  payrollRuns={payrollRuns}
                  bankAccounts={bankAccounts}
                  activeOrg={activeOrg}
                  onRefreshData={() => loadData(activeOrg?.id)}
                />
              )}

              {currentView === 'equity' && (
                <EquityView
                  transactions={equityTransactions}
                  bankAccounts={bankAccounts}
                  activeOrg={activeOrg}
                  onRefreshData={() => loadData(activeOrg?.id)}
                />
              )}

              {currentView === 'assets' && (
                <AssetsView
                  assets={assets}
                  activeOrg={activeOrg}
                  onRefreshData={() => loadData(activeOrg?.id)}
                />
              )}

              {currentView === 'integrations' && (
                <IntegrationsView
                  activeOrg={activeOrg}
                  onRefreshData={() => loadData(activeOrg?.id)}
                />
              )}

              {currentView === 'audit' && (
                <AuditView activeOrg={activeOrg} />
              )}

              {currentView === 'settings' && (
                <SettingsView
                  organizations={organizations}
                  activeOrg={activeOrg}
                  onSwitchOrg={handleSwitchOrg}
                  userRole={userRole}
                  onSwitchRole={handleSwitchRole}
                  onRefreshData={() => loadData(activeOrg?.id)}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Transaction Modals */}
      <NewInvoiceModal
        isOpen={activeModal === 'invoice'}
        onClose={() => setActiveModal(null)}
        onSuccess={() => loadData(activeOrg?.id)}
        clients={clients}
        projects={projects}
      />

      <NewPaymentModal
        isOpen={activeModal === 'payment'}
        onClose={() => setActiveModal(null)}
        onSuccess={() => loadData(activeOrg?.id)}
        clients={clients}
        invoices={invoices}
        bankAccounts={bankAccounts}
      />

      <NewBillModal
        isOpen={activeModal === 'bill'}
        onClose={() => setActiveModal(null)}
        onSuccess={() => loadData(activeOrg?.id)}
        vendors={vendors}
        projects={projects}
        accounts={accounts}
      />

      <NewJournalModal
        isOpen={activeModal === 'journal'}
        onClose={() => setActiveModal(null)}
        onSuccess={() => loadData(activeOrg?.id)}
        accounts={accounts}
      />

      <NewTransferModal
        isOpen={activeModal === 'transfer'}
        onClose={() => setActiveModal(null)}
        onSuccess={() => loadData(activeOrg?.id)}
        bankAccounts={bankAccounts}
      />

      {/* First Release 18-Step Acceptance Scenario Modal */}
      <AcceptanceScenarioModal
        isOpen={isScenarioModalOpen}
        onClose={() => setIsScenarioModalOpen(false)}
        onRefreshData={() => loadData(activeOrg?.id)}
        onNavigateToView={setCurrentView}
      />
    </div>
  );
}

export default App;

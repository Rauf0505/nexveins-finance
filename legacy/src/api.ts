import {
  Organization,
  User,
  ChartAccount,
  JournalEntry,
  Client,
  Invoice,
  Vendor,
  Bill,
  BankAccount,
  Project,
  PayrollRun,
  PartnerEquityTransaction,
  FixedAsset,
  DashboardKPIs,
  TrialBalanceReport,
  ProfitLossReport,
  BalanceSheetReport,
  CashFlowReport,
  AuditEvent,
  IntegrationEvent
} from './types';

class ApiClient {
  private activeOrgId: string = 'org-nexveins-01';
  private activeUserId: string = 'usr-admin-01';
  private activeRole: string = 'admin';

  setContext(orgId: string, userId?: string, role?: string) {
    this.activeOrgId = orgId;
    if (userId) this.activeUserId = userId;
    if (role) this.activeRole = role;
  }

  getActiveOrgId() {
    return this.activeOrgId;
  }

  getActiveRole() {
    return this.activeRole;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = {
      'Content-Type': 'application/json',
      'x-organization-id': this.activeOrgId,
      'x-user-id': this.activeUserId,
      'x-user-role': this.activeRole,
      ...(options.headers || {})
    };

    const res = await fetch(path, { ...options, headers });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Server error');
    }
    return data as T;
  }

  // Auth & Organizations
  async getAuth() {
    return this.request<{ user: User; active_organization: Organization; role: string; organizations: Organization[] }>('/api/auth/me');
  }

  async switchContext(orgId: string, userId?: string, role?: string) {
    this.setContext(orgId, userId, role);
    return this.request<{ success: boolean }>('/api/auth/switch-context', {
      method: 'POST',
      body: JSON.stringify({ orgId, userId, role })
    });
  }

  async getOrganizations(): Promise<Organization[]> {
    return this.request<Organization[]>('/api/organizations');
  }

  async createOrganization(payload: { name: string; legal_name?: string; base_currency?: string; country?: string; tax_id?: string }): Promise<Organization> {
    return this.request<Organization>('/api/organizations', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  // Chart of Accounts
  async getAccounts(): Promise<ChartAccount[]> {
    return this.request<ChartAccount[]>('/api/accounts');
  }

  async createAccount(payload: { code: string; name: string; type: string; sub_type: string; is_system_control?: boolean; description?: string }) {
    return this.request('/api/accounts', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  // Journals
  async getJournals(): Promise<JournalEntry[]> {
    return this.request<JournalEntry[]>('/api/journals');
  }

  async createJournal(payload: {
    entry_date: string;
    posting_date: string;
    memo: string;
    reference?: string;
    lines: Array<{ account_id: string; account_code: string; account_name: string; debit: number | string; credit: number | string; description?: string }>;
  }) {
    return this.request<{ id: string; message: string }>('/api/journals', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async reverseJournal(journalId: string, reason: string) {
    return this.request<{ id: string; message: string }>(`/api/journals/${journalId}/reverse`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  }

  // Sales & Invoices
  async getClients(): Promise<Client[]> {
    return this.request<Client[]>('/api/clients');
  }

  async createClient(payload: Partial<Client>) {
    return this.request<Client>('/api/clients', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async getInvoices(): Promise<Invoice[]> {
    return this.request<Invoice[]>('/api/invoices');
  }

  async createInvoice(payload: {
    client_id: string;
    project_id?: string;
    issue_date: string;
    due_date?: string;
    tax_rate_percent?: number | string;
    notes?: string;
    items: Array<{ description: string; quantity: number | string; unit_price: number | string }>;
  }) {
    return this.request<{ id: string; invoice_number: string; total_amount: string }>('/api/invoices', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async recordPayment(payload: {
    client_id: string;
    invoice_id?: string;
    amount: string | number;
    bank_account_id: string;
    payment_date: string;
    payment_method?: string;
    reference?: string;
    notes?: string;
  }) {
    return this.request<{ id: string; payment_number: string; amount: string }>('/api/payments', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  // Purchases & Bills
  async getVendors(): Promise<Vendor[]> {
    return this.request<Vendor[]>('/api/vendors');
  }

  async createVendor(payload: Partial<Vendor>) {
    return this.request<Vendor>('/api/vendors', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async getBills(): Promise<Bill[]> {
    return this.request<Bill[]>('/api/bills');
  }

  async createBill(payload: {
    vendor_id: string;
    project_id?: string;
    bill_number?: string;
    bill_date: string;
    due_date?: string;
    total_amount: string | number;
    expense_account_id: string;
    description?: string;
  }) {
    return this.request<{ id: string; bill_number: string }>('/api/bills', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async approveBill(billId: string) {
    return this.request<{ success: boolean; message: string }>(`/api/bills/${billId}/approve`, {
      method: 'POST'
    });
  }

  async payBill(billId: string, payload: { amount?: string | number; bank_account_id: string; payment_date?: string; reference?: string }) {
    return this.request<{ success: boolean; message: string }>(`/api/bills/${billId}/pay`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  // Banking
  async getBankAccounts(): Promise<BankAccount[]> {
    return this.request<BankAccount[]>('/api/bank-accounts');
  }

  async transferFunds(payload: { from_bank_id: string; to_bank_id: string; amount: string | number; transfer_date?: string; reference?: string }) {
    return this.request<{ success: boolean; message: string }>('/api/bank-transfers', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  // Projects
  async getProjects(): Promise<Project[]> {
    return this.request<Project[]>('/api/projects');
  }

  async createProject(payload: Partial<Project>) {
    return this.request<{ id: string; code: string; name: string }>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  // Payroll
  async getPayroll(): Promise<PayrollRun[]> {
    return this.request<PayrollRun[]>('/api/payroll');
  }

  async createPayrollRun(payload: { period_month: number; period_year: number; employees: any[] }) {
    return this.request<{ id: string; total_net_pay: string }>('/api/payroll', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async disbursePayroll(runId: string, payload: { bank_account_id: string; payment_date?: string }) {
    return this.request<{ success: boolean; message: string }>(`/api/payroll/${runId}/disburse`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  // Equity
  async getEquity(): Promise<PartnerEquityTransaction[]> {
    return this.request<PartnerEquityTransaction[]>('/api/equity');
  }

  async createEquityTransaction(payload: {
    partner_name: string;
    transaction_type: string;
    amount: string | number;
    date: string;
    bank_account_id: string;
    notes?: string;
  }) {
    return this.request<{ id: string }>('/api/equity', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  // Fixed Assets
  async getAssets(): Promise<FixedAsset[]> {
    return this.request<FixedAsset[]>('/api/assets');
  }

  async runDepreciation(asset_id: string) {
    return this.request<{ success: boolean; monthly_depreciation: string }>('/api/assets/depreciate', {
      method: 'POST',
      body: JSON.stringify({ asset_id })
    });
  }

  // Reports
  async getDashboardKPIs(): Promise<DashboardKPIs> {
    return this.request<DashboardKPIs>('/api/reports/dashboard-kpis');
  }

  async getTrialBalance(as_of_date?: string): Promise<TrialBalanceReport> {
    const q = as_of_date ? `?as_of_date=${as_of_date}` : '';
    return this.request<TrialBalanceReport>(`/api/reports/trial-balance${q}`);
  }

  async getProfitLoss(start_date?: string, end_date?: string): Promise<ProfitLossReport> {
    const params = new URLSearchParams();
    if (start_date) params.append('start_date', start_date);
    if (end_date) params.append('end_date', end_date);
    const q = params.toString() ? `?${params.toString()}` : '';
    return this.request<ProfitLossReport>(`/api/reports/profit-loss${q}`);
  }

  async getBalanceSheet(as_of_date?: string): Promise<BalanceSheetReport> {
    const q = as_of_date ? `?as_of_date=${as_of_date}` : '';
    return this.request<BalanceSheetReport>(`/api/reports/balance-sheet${q}`);
  }

  async getCashFlow(): Promise<CashFlowReport> {
    return this.request<CashFlowReport>('/api/reports/cash-flow');
  }

  async getGeneralLedger(account_id?: string, project_id?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (account_id) params.append('account_id', account_id);
    if (project_id) params.append('project_id', project_id);
    const q = params.toString() ? `?${params.toString()}` : '';
    return this.request<any[]>(`/api/reports/general-ledger${q}`);
  }

  async getARAging(): Promise<any> {
    return this.request<any>('/api/reports/ar-aging');
  }

  async getAPAging(): Promise<any> {
    return this.request<any>('/api/reports/ap-aging');
  }

  async getAuditTrail(): Promise<AuditEvent[]> {
    return this.request<AuditEvent[]>('/api/reports/audit');
  }

  // Mode B Client Integration
  async simulatePosSale(payload: {
    idempotency_key: string;
    source_app: string;
    external_order_id: string;
    subtotal: number | string;
    tax_amount: number | string;
    tender_type: string;
  }) {
    return this.request<any>('/api/v1/client-finance/pos-sale', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async getIntegrationEvents(): Promise<IntegrationEvent[]> {
    return this.request<IntegrationEvent[]>('/api/v1/client-finance/events');
  }
}

export const api = new ApiClient();

export interface Organization {
  id: string;
  name: string;
  slug: string;
  legal_name?: string;
  tax_id?: string;
  base_currency: string;
  country: string;
  fiscal_year_start_month: number;
  enabled_modules: string;
  created_at: string;
  user_role?: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  global_role: string;
}

export interface ChartAccount {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  sub_type: string;
  is_system_control: number;
  is_active: number;
  description?: string;
  balance_raw?: number;
}

export interface JournalLine {
  id: string;
  journal_entry_id: string;
  account_id: string;
  account_code: string;
  account_name: string;
  description?: string;
  debit: string;
  credit: string;
  project_id?: string;
  client_id?: string;
  vendor_id?: string;
}

export interface JournalEntry {
  id: string;
  organization_id: string;
  entry_number: string;
  entry_date: string;
  posting_date: string;
  status: 'draft' | 'posted' | 'reversed' | 'voided';
  source_type: string;
  source_id?: string;
  reference?: string;
  memo: string;
  total_debit: string;
  total_credit: string;
  created_by?: string;
  posted_by?: string;
  reversed_by_journal_id?: string;
  created_at: string;
  lines?: JournalLine[];
}

export interface Client {
  id: string;
  organization_id: string;
  name: string;
  company_name?: string;
  email?: string;
  phone?: string;
  tax_number?: string;
  address?: string;
  currency: string;
  payment_terms_days: number;
  balance: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: string;
  unit_price: string;
  amount: string;
}

export interface Invoice {
  id: string;
  organization_id: string;
  client_id: string;
  client_name?: string;
  company_name?: string;
  project_id?: string;
  project_name?: string;
  project_code?: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  status: 'draft' | 'sent' | 'partially_paid' | 'paid' | 'overdue' | 'voided';
  subtotal: string;
  tax_rate: string;
  tax_amount: string;
  total_amount: string;
  paid_amount: string;
  balance_due: string;
  notes?: string;
  journal_entry_id?: string;
  created_at: string;
  items?: InvoiceItem[];
}

export interface Vendor {
  id: string;
  organization_id: string;
  name: string;
  company_name?: string;
  email?: string;
  phone?: string;
  tax_number?: string;
  category: string;
  payment_terms_days: number;
  balance: string;
}

export interface Bill {
  id: string;
  organization_id: string;
  vendor_id: string;
  vendor_name?: string;
  company_name?: string;
  project_id?: string;
  project_name?: string;
  bill_number: string;
  bill_date: string;
  due_date: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'partially_paid' | 'paid' | 'rejected';
  subtotal: string;
  total_amount: string;
  paid_amount: string;
  balance_due: string;
  expense_account_id: string;
  expense_account_name?: string;
  description?: string;
  approved_by?: string;
  approved_at?: string;
  journal_entry_id?: string;
  created_at: string;
}

export interface BankAccount {
  id: string;
  organization_id: string;
  account_id: string;
  account_name: string;
  bank_name: string;
  account_number: string;
  currency: string;
  current_balance: string;
  is_petty_cash: number;
  account_code?: string;
  ledger_account_name?: string;
}

export interface Project {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  client_id?: string;
  client_name?: string;
  company_name?: string;
  billing_model: 'fixed_price' | 'hourly' | 'milestone' | 'retainer';
  contract_value: string;
  budget_cost_baseline: string;
  planned_labor_cost: string;
  start_date: string;
  end_date?: string;
  status: 'active' | 'completed' | 'on_hold';
  invoiced_amount: string;
  collected_amount: string;
  actual_cost: string;
  committed_cost: string;
  forecast_cost_to_complete: string;
  gross_profit?: string;
  margin_percent?: string;
  outstanding_receivables?: string;
  budget_variance?: string;
}

export interface PayrollItem {
  id: string;
  payroll_run_id: string;
  employee_name: string;
  designation: string;
  base_salary: string;
  allowances: string;
  deductions: string;
  tax_withheld: string;
  net_salary: string;
}

export interface PayrollRun {
  id: string;
  organization_id: string;
  period_month: number;
  period_year: number;
  status: 'draft' | 'approved' | 'paid';
  total_gross_pay: string;
  total_allowances: string;
  total_deductions: string;
  total_tax_withheld: string;
  total_net_pay: string;
  bank_account_id?: string;
  disbursed_at?: string;
  items?: PayrollItem[];
}

export interface PartnerEquityTransaction {
  id: string;
  organization_id: string;
  partner_name: string;
  transaction_type: 'capital_contribution' | 'drawing' | 'loan_to_company' | 'loan_from_company' | 'profit_distribution';
  amount: string;
  date: string;
  bank_account_id: string;
  bank_name?: string;
  notes?: string;
  journal_entry_id?: string;
}

export interface FixedAsset {
  id: string;
  organization_id: string;
  asset_code: string;
  name: string;
  category: string;
  purchase_date: string;
  purchase_cost: string;
  useful_life_years: number;
  salvage_value: string;
  depreciation_method: string;
  accumulated_depreciation: string;
  net_book_value: string;
  status: string;
}

export interface DashboardKPIs {
  total_cash_and_bank: string;
  accounts_receivable: string;
  open_invoices_count: number;
  accounts_payable: string;
  open_bills_count: number;
  total_revenue: string;
  gross_profit: string;
  gross_margin_percent: string;
  net_operating_income: string;
  net_profit_margin_percent: string;
}

export interface TrialBalanceItem {
  account_id: string;
  code: string;
  name: string;
  type: string;
  sub_type: string;
  total_debit: string;
  total_credit: string;
  net_debit: string;
  net_credit: string;
}

export interface TrialBalanceReport {
  as_of_date: string;
  items: TrialBalanceItem[];
  total_debit: string;
  total_credit: string;
  total_net_debit: string;
  total_net_credit: string;
  is_balanced: boolean;
}

export interface ProfitLossReport {
  start_date: string;
  end_date: string;
  revenue: {
    items: Array<{ account_id: string; code: string; name: string; amount: string }>;
    total: string;
  };
  cost_of_goods_sold: {
    items: Array<{ account_id: string; code: string; name: string; amount: string }>;
    total: string;
  };
  gross_profit: string;
  gross_margin_percent: string;
  operating_expenses: {
    items: Array<{ account_id: string; code: string; name: string; amount: string }>;
    total: string;
  };
  net_operating_income: string;
  net_profit_margin_percent: string;
}

export interface BalanceSheetReport {
  as_of_date: string;
  assets: {
    current_assets: Array<{ account_id: string; code: string; name: string; amount: string }>;
    fixed_assets: Array<{ account_id: string; code: string; name: string; amount: string }>;
    total: string;
  };
  liabilities: {
    current_liabilities: Array<{ account_id: string; code: string; name: string; amount: string }>;
    total: string;
  };
  equity: {
    items: Array<{ account_id: string; code: string; name: string; amount: string }>;
    total: string;
  };
  total_liabilities_and_equity: string;
  is_balanced: boolean;
  variance: string;
}

export interface CashFlowReport {
  operating: { inflows: string; outflows: string; net: string };
  investing: { outflows: string; net: string };
  financing: { inflows: string; outflows: string; net: string };
  net_cash_change: string;
}

export interface AuditEvent {
  id: string;
  organization_id: string;
  user_id?: string;
  user_email?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details: string;
  ip_address?: string;
  timestamp: string;
}

export interface IntegrationEvent {
  id: string;
  organization_id: string;
  source_app: string;
  event_type: string;
  idempotency_key: string;
  payload: string;
  status: string;
  processed_journal_id?: string;
  error_message?: string;
  created_at: string;
}
